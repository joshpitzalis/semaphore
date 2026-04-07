import { describe, expect, it } from "vitest";
import type { ServerMessage } from "../lib/protocol";
import { WorkshopRoom } from "./WorkshopRoom";

/** Minimal mock of a WebSocket that records sent messages */
function createMockWebSocket() {
  const messages: Array<ServerMessage> = [];
  return {
    ws: {
      send(data: string) {
        messages.push(JSON.parse(data));
      },
      close() {},
    } as unknown as WebSocket,
    messages,
  };
}

/** Creates a WorkshopRoom with a fake DurableObjectState */
function createRoom() {
  const sockets = new Set<WebSocket>();

  const state = {
    acceptWebSocket(ws: WebSocket) {
      sockets.add(ws);
    },
    getWebSockets() {
      return Array.from(sockets);
    },
  } as unknown as DurableObjectState;

  const room = new WorkshopRoom(state, {} as Env);
  return { room, state };
}

/**
 * Simulate a WebSocket connection to the DO by calling fetch with a
 * mock WebSocketPair and a patched Response that tolerates status 101.
 *
 * Happy-dom strips the hop-by-hop `Upgrade` header from Request, so
 * we build a minimal request-like object with a raw headers map.
 */
async function connectWebSocket(room: WorkshopRoom) {
  const mock = createMockWebSocket();

  const OrigResponse = globalThis.Response;
  (globalThis as any).Response = class extends OrigResponse {
    constructor(body: any, init?: ResponseInit) {
      if (init?.status === 101) {
        super(null, { status: 200 });
      } else {
        super(body, init);
      }
    }
  };

  (globalThis as any).WebSocketPair = function () {
    (this as any)[0] = {} as WebSocket;
    (this as any)[1] = mock.ws;
  };

  // Build a request with a raw headers object so the Upgrade header
  // isn't stripped by happy-dom's fetch-spec-compliant Request.
  const request = {
    url: "https://fake/ws",
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "upgrade") return "websocket";
        return null;
      },
    },
  } as unknown as Request;

  await room.fetch(request);

  globalThis.Response = OrigResponse;

  return mock;
}

describe("WorkshopRoom", () => {
  it("sends current participant state to newly connected WebSocket", async () => {
    const { room } = createRoom();

    // First client connects and joins
    const alice = await connectWebSocket(room);
    room.webSocketMessage(
      alice.ws,
      JSON.stringify({ type: "join", name: "Alice" }),
    );

    // Clear Alice's messages so we only check what the new connection gets
    alice.messages.length = 0;

    // Second client connects (like dashboard reopening)
    const dashboard = await connectWebSocket(room);

    // The dashboard should immediately receive the current state
    const stateMsg = dashboard.messages.find((m) => m.type === "state");
    expect(stateMsg).toBeDefined();
    expect(stateMsg!.type).toBe("state");
    expect((stateMsg as any).participants).toEqual([
      { name: "Alice", status: "working", connected: true },
    ]);
  });
});

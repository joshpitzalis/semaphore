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

/** Helper: connect a WebSocket by calling fetch and triggering the DO's accept logic.
 *  Cloudflare's `new Response(null, { status: 101, webSocket })` isn't valid in
 *  Node, so we monkey-patch WebSocketPair AND Response to tolerate status 101. */
async function connectWebSocket(room: WorkshopRoom) {
	const mock = createMockWebSocket();

	const OrigResponse = globalThis.Response;
	// Allow status 101
	(globalThis as any).Response = class extends OrigResponse {
		constructor(body: any, init?: ResponseInit) {
			if (init?.status === 101) {
				super(null, { status: 200 });
			} else {
				super(body, init);
			}
		}
	};

	(globalThis as any).WebSocketPair = class {
		0: WebSocket;
		1: WebSocket;
		constructor() {
			this[0] = {} as WebSocket;
			this[1] = mock.ws;
		}
	};

	await room.fetch(
		new Request("https://fake/ws", {
			headers: { Upgrade: "websocket" },
		}),
	);

	globalThis.Response = OrigResponse;

	return mock;
}

describe("WorkshopRoom", () => {
	it("sends current participant state to newly connected WebSocket", async () => {
		const { room } = createRoom();

		// First client connects and joins
		const alice = await connectWebSocket(room);
		room.webSocketMessage(alice.ws, JSON.stringify({ type: "join", name: "Alice" }));

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

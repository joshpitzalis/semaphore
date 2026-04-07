import type { ClientMessage, ServerMessage } from "../lib/protocol";
import { type ActionResult, WorkshopState } from "./workshopState";

export class WorkshopRoom {
  private workshop = new WorkshopState();
  private wsToId = new Map<WebSocket, string>();
  private nextId = 0;

  constructor(
    private state: DurableObjectState,
    _env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.state.acceptWebSocket(server);

      server.send(
        JSON.stringify({
          type: "state",
          participants: this.workshop.getParticipants(),
        } satisfies ServerMessage),
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/state") {
      return Response.json({ participants: this.workshop.getParticipants() });
    }

    return new Response("Not found", { status: 404 });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const connId = this.getConnectionId(ws);
    let result: ActionResult;

    switch (msg.type) {
      case "join":
        result = this.workshop.join(connId, msg.name);
        break;
      case "status":
        result = this.workshop.status(msg.name, msg.status);
        break;
      case "leave":
        result = this.workshop.leave(msg.name);
        break;
      case "rename":
        result = this.workshop.rename(connId, msg.oldName, msg.newName);
        break;
      case "close_workshop":
        result = this.workshop.close();
        break;
    }

    this.applyResult(ws, result);
  }

  webSocketClose(ws: WebSocket) {
    const connId = this.wsToId.get(ws);
    if (connId) {
      const result = this.workshop.disconnect(connId);
      this.wsToId.delete(ws);
      this.applyResult(ws, result);
    }
  }

  webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }

  private applyResult(ws: WebSocket, result: ActionResult) {
    if (result.unicast) {
      ws.send(JSON.stringify(result.unicast));
    }
    if (result.broadcast) {
      for (const msg of result.broadcast) {
        this.broadcast(msg);
      }
    }
    if (result.closed) {
      for (const socket of this.state.getWebSockets()) {
        socket.close(1000, "Workshop closed");
      }
    }
  }

  private getConnectionId(ws: WebSocket): string {
    let id = this.wsToId.get(ws);
    if (!id) {
      id = `conn-${this.nextId++}`;
      this.wsToId.set(ws, id);
    }
    return id;
  }

  private broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      ws.send(data);
    }
  }
}

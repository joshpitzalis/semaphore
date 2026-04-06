import type {
	ClientMessage,
	Participant,
	ServerMessage,
	Status,
} from "../lib/protocol";

export class WorkshopRoom {
	private participants: Map<string, { status: Status; connected: boolean }> =
		new Map();
	private connections: Map<WebSocket, string> = new Map(); // ws -> name

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

			// Send current state so late joiners / reconnecting dashboards
			// don't start with an empty participant list.
			server.send(
				JSON.stringify({
					type: "state",
					participants: this.getParticipantList(),
				} satisfies ServerMessage),
			);

			return new Response(null, { status: 101, webSocket: client });
		}

		if (url.pathname === "/state") {
			return Response.json({ participants: this.getParticipantList() });
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

		switch (msg.type) {
			case "join":
				this.handleJoin(ws, msg.name);
				break;
			case "status":
				this.handleStatus(msg.name, msg.status);
				break;
			case "leave":
				this.handleLeave(msg.name);
				break;
			case "rename":
				this.handleRename(ws, msg.oldName, msg.newName);
				break;
			case "close_workshop":
				this.handleCloseWorkshop();
				break;
		}
	}

	webSocketClose(ws: WebSocket) {
		const name = this.connections.get(ws);
		if (name) {
			const participant = this.participants.get(name);
			if (participant) {
				participant.connected = false;
			}
			this.connections.delete(ws);
			this.broadcast({
				type: "state",
				participants: this.getParticipantList(),
			});
		}
	}

	webSocketError(ws: WebSocket) {
		this.webSocketClose(ws);
	}

	private handleJoin(ws: WebSocket, name: string) {
		if (!name.trim()) {
			this.send(ws, { type: "error", message: "Name cannot be empty" });
			return;
		}

		const existing = this.participants.get(name);

		if (existing) {
			// Reconnection — take over
			if (!existing.connected) {
				existing.connected = true;
				this.connections.set(ws, name);
				this.broadcast({
					type: "state",
					participants: this.getParticipantList(),
				});
				return;
			}
			// Name taken by active connection
			this.send(ws, { type: "error", message: "Name is already taken" });
			return;
		}

		this.participants.set(name, { status: "working", connected: true });
		this.connections.set(ws, name);
		this.broadcast({ type: "state", participants: this.getParticipantList() });
	}

	private handleStatus(name: string, status: Status) {
		const participant = this.participants.get(name);
		if (!participant) return;
		participant.status = status;
		this.broadcast({ type: "state", participants: this.getParticipantList() });
	}

	private handleRename(ws: WebSocket, oldName: string, newName: string) {
		if (!newName.trim()) {
			this.send(ws, { type: "error", message: "Name cannot be empty" });
			return;
		}

		const participant = this.participants.get(oldName);
		if (!participant) return;

		if (this.participants.has(newName)) {
			this.send(ws, { type: "error", message: "Name is already taken" });
			return;
		}

		// Move participant data to new name
		this.participants.delete(oldName);
		this.participants.set(newName, participant);

		// Update connection mapping
		for (const [socket, n] of this.connections) {
			if (n === oldName) {
				this.connections.set(socket, newName);
				break;
			}
		}

		this.broadcast({
			type: "renamed",
			oldName,
			newName,
		});
		this.broadcast({ type: "state", participants: this.getParticipantList() });
	}

	private handleLeave(name: string) {
		this.participants.delete(name);

		// Remove the connection mapping
		for (const [ws, n] of this.connections) {
			if (n === name) {
				this.connections.delete(ws);
				break;
			}
		}

		this.broadcast({ type: "state", participants: this.getParticipantList() });
	}

	private handleCloseWorkshop() {
		this.broadcast({ type: "workshop_closed" });

		// Close all WebSocket connections
		for (const ws of this.state.getWebSockets()) {
			ws.close(1000, "Workshop closed");
		}

		this.participants.clear();
		this.connections.clear();
	}

	private getParticipantList(): Array<Participant> {
		return Array.from(this.participants.entries()).map(
			([name, { status, connected }]) => ({
				name,
				status,
				connected,
			}),
		);
	}

	private broadcast(msg: ServerMessage) {
		const data = JSON.stringify(msg);
		for (const ws of this.state.getWebSockets()) {
			ws.send(data);
		}
	}

	private send(ws: WebSocket, msg: ServerMessage) {
		ws.send(JSON.stringify(msg));
	}
}

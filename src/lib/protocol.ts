export type Status = "ready" | "working" | "stuck";

export type Participant = {
	name: string;
	status: Status;
	connected: boolean;
};

// Client -> Server
export type ClientMessage =
	| { type: "join"; name: string }
	| { type: "status"; name: string; status: Status }
	| { type: "leave"; name: string }
	| { type: "rename"; oldName: string; newName: string }
	| { type: "close_workshop" };

// Server -> Client
export type ServerMessage =
	| { type: "state"; participants: Array<Participant> }
	| { type: "workshop_closed" }
	| { type: "renamed"; oldName: string; newName: string }
	| { type: "error"; message: string };

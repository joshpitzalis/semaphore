import type { Participant, ServerMessage, Status } from "../lib/protocol";

type BroadcastResult = {
  broadcast: ServerMessage[];
  unicast?: undefined;
  closed?: undefined;
};
type UnicastResult = {
  broadcast?: undefined;
  unicast: ServerMessage;
  closed?: undefined;
};
type CloseResult = {
  broadcast: ServerMessage[];
  unicast?: undefined;
  closed: true;
};
export type ActionResult = BroadcastResult | UnicastResult | CloseResult;

export class WorkshopState {
  private participants: Map<string, { status: Status; connected: boolean }> =
    new Map();
  private connections: Map<string, string> = new Map();

  join(connectionId: string, name: string): ActionResult {
    if (!name.trim()) {
      return { unicast: { type: "error", message: "Name cannot be empty" } };
    }

    const existing = this.participants.get(name);
    if (existing) {
      if (!existing.connected) {
        existing.connected = true;
        this.connections.set(connectionId, name);
        return {
          broadcast: [{ type: "state", participants: this.getParticipants() }],
        };
      }
      return { unicast: { type: "error", message: "Name is already taken" } };
    }

    this.participants.set(name, { status: "working", connected: true });
    this.connections.set(connectionId, name);
    return {
      broadcast: [{ type: "state", participants: this.getParticipants() }],
    };
  }

  status(name: string, status: Status): ActionResult {
    const participant = this.participants.get(name);
    if (!participant) {
      return { broadcast: [] };
    }
    participant.status = status;
    return {
      broadcast: [{ type: "state", participants: this.getParticipants() }],
    };
  }

  rename(
    _connectionId: string,
    oldName: string,
    newName: string,
  ): ActionResult {
    if (!newName.trim()) {
      return { unicast: { type: "error", message: "Name cannot be empty" } };
    }
    const participant = this.participants.get(oldName);
    if (!participant) {
      return { broadcast: [] };
    }
    if (this.participants.has(newName)) {
      return { unicast: { type: "error", message: "Name is already taken" } };
    }
    this.participants.delete(oldName);
    this.participants.set(newName, participant);
    for (const [connId, n] of this.connections) {
      if (n === oldName) {
        this.connections.set(connId, newName);
        break;
      }
    }
    return {
      broadcast: [
        { type: "renamed", oldName, newName },
        { type: "state", participants: this.getParticipants() },
      ],
    };
  }

  leave(name: string): ActionResult {
    this.participants.delete(name);
    for (const [connId, n] of this.connections) {
      if (n === name) {
        this.connections.delete(connId);
        break;
      }
    }
    return {
      broadcast: [{ type: "state", participants: this.getParticipants() }],
    };
  }

  close(): CloseResult {
    this.participants.clear();
    this.connections.clear();
    return { broadcast: [{ type: "workshop_closed" }], closed: true };
  }

  disconnect(connectionId: string): ActionResult {
    const name = this.connections.get(connectionId);
    if (!name) {
      return { broadcast: [] };
    }
    const participant = this.participants.get(name);
    if (participant) {
      participant.connected = false;
    }
    this.connections.delete(connectionId);
    return {
      broadcast: [{ type: "state", participants: this.getParticipants() }],
    };
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.entries()).map(
      ([name, { status, connected }]) => ({ name, status, connected }),
    );
  }
}

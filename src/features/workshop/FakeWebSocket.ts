import type { ServerMessage } from "../../lib/protocol";

/**
 * Test double for WebSocket. Captures sent messages and lets tests
 * push server messages to exercise the full hook lifecycle.
 */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];

  private listeners = new Map<string, Array<(event: unknown) => void>>();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(event: string, fn: (event: unknown) => void) {
    const fns = this.listeners.get(event) ?? [];
    fns.push(fn);
    this.listeners.set(event, fns);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.emit("close", {});
  }

  // --- Test helpers ---

  simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this.emit("open", {});
  }

  simulateMessage(msg: ServerMessage) {
    this.emit("message", { data: JSON.stringify(msg) });
  }

  simulateClose() {
    this.readyState = WebSocket.CLOSED;
    this.emit("close", {});
  }

  private emit(event: string, data: unknown) {
    for (const fn of this.listeners.get(event) ?? []) {
      fn(data);
    }
  }
}

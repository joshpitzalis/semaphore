import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWebSocket } from "./FakeWebSocket";
import { useWorkshop } from "./useWorkshop";

function latestSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

describe("useWorkshop", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("connects and receives participant state", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    expect(result.current.participants).toEqual([]);
    expect(result.current.connected).toBe(false);

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    expect(result.current.connected).toBe(true);

    act(() =>
      ws.simulateMessage({
        type: "state",
        participants: [{ name: "Alice", status: "ready", connected: true }],
      }),
    );

    expect(result.current.participants).toEqual([
      { name: "Alice", status: "ready", connected: true },
    ]);
  });

  it("sends join message on connect when joinAs is provided", () => {
    renderHook(() =>
      useWorkshop("test-ws", {
        joinAs: "Alice",
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    expect(ws.sent).toEqual([JSON.stringify({ type: "join", name: "Alice" })]);
  });

  it("updateStatus sends status message with captured identity", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        joinAs: "Alice",
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    ws.sent = []; // clear the join message

    act(() => result.current.updateStatus("ready"));

    expect(ws.sent).toEqual([
      JSON.stringify({ type: "status", name: "Alice", status: "ready" }),
    ]);
  });

  it("leave sends leave message with captured identity", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        joinAs: "Alice",
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    ws.sent = [];

    act(() => result.current.leave());

    expect(ws.sent).toEqual([JSON.stringify({ type: "leave", name: "Alice" })]);
  });

  it("rename sends rename message with captured identity", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        joinAs: "Alice",
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    ws.sent = [];

    act(() => result.current.rename("Bob"));

    expect(ws.sent).toEqual([
      JSON.stringify({ type: "rename", oldName: "Alice", newName: "Bob" }),
    ]);
  });

  it("closeWorkshop sends close message (no identity needed)", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    act(() => result.current.closeWorkshop());

    expect(ws.sent).toEqual([JSON.stringify({ type: "close_workshop" })]);
  });

  it("error populates from server error message", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    expect(result.current.error).toBeNull();

    act(() => ws.simulateMessage({ type: "error", message: "Name taken" }));

    expect(result.current.error).toBe("Name taken");
  });

  it("clearError resets error to null", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    act(() => ws.simulateMessage({ type: "error", message: "Name taken" }));

    expect(result.current.error).toBe("Name taken");

    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });

  it("renamedTo populates from server renamed message", () => {
    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    expect(result.current.renamedTo).toBeNull();

    act(() =>
      ws.simulateMessage({ type: "renamed", oldName: "Alice", newName: "Bob" }),
    );

    expect(result.current.renamedTo).toEqual({
      oldName: "Alice",
      newName: "Bob",
    });
  });

  it("does not send join message when joinAs is omitted", () => {
    renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    expect(ws.sent).toEqual([]);
  });

  it("reconnects after socket close", () => {
    vi.useFakeTimers();

    renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws1 = latestSocket();
    act(() => ws1.simulateOpen());
    const countBefore = FakeWebSocket.instances.length;

    act(() => ws1.simulateClose());
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(FakeWebSocket.instances.length).toBe(countBefore + 1);

    vi.useRealTimers();
  });

  it("does not reconnect when workshop is closed", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());
    act(() => ws.simulateMessage({ type: "workshop_closed" }));

    expect(result.current.workshopClosed).toBe(true);

    const countBefore = FakeWebSocket.instances.length;
    act(() => ws.simulateClose());
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(FakeWebSocket.instances.length).toBe(countBefore);

    vi.useRealTimers();
  });

  it("cleans up on unmount — no reconnection", () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() =>
      useWorkshop("test-ws", {
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws = latestSocket();
    act(() => ws.simulateOpen());

    const countBefore = FakeWebSocket.instances.length;
    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(FakeWebSocket.instances.length).toBe(countBefore);

    vi.useRealTimers();
  });

  it("re-joins on reconnect when joinAs is provided", () => {
    vi.useFakeTimers();

    renderHook(() =>
      useWorkshop("test-ws", {
        joinAs: "Alice",
        createSocket: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      }),
    );

    const ws1 = latestSocket();
    act(() => ws1.simulateOpen());

    expect(ws1.sent).toEqual([JSON.stringify({ type: "join", name: "Alice" })]);

    act(() => ws1.simulateClose());
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const ws2 = latestSocket();
    expect(ws2).not.toBe(ws1);

    act(() => ws2.simulateOpen());

    expect(ws2.sent).toEqual([JSON.stringify({ type: "join", name: "Alice" })]);

    vi.useRealTimers();
  });
});

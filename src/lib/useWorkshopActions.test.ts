// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkshopActions } from "./useWorkshopActions";

const mockSend = vi.fn();
let capturedOptions: {
  onError?: (msg: string) => void;
  onRenamed?: (oldName: string, newName: string) => void;
} = {};

vi.mock("./useWorkshopSocket", () => ({
  useWorkshopSocket: (_slug: string, options?: Record<string, unknown>) => {
    capturedOptions = (options ?? {}) as typeof capturedOptions;
    return {
      participants: [],
      connected: true,
      workshopClosed: false,
      send: mockSend,
    };
  },
}));

describe("useWorkshopActions", () => {
  beforeEach(() => {
    mockSend.mockClear();
    capturedOptions = {};
  });

  it("updateStatus sends a status message", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    act(() => result.current.updateStatus("Alice", "ready"));
    expect(mockSend).toHaveBeenCalledWith({
      type: "status",
      name: "Alice",
      status: "ready",
    });
  });

  it("leave sends a leave message", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    act(() => result.current.leave("Alice"));
    expect(mockSend).toHaveBeenCalledWith({ type: "leave", name: "Alice" });
  });

  it("rename sends a rename message", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    act(() => result.current.rename("Alice", "Bob"));
    expect(mockSend).toHaveBeenCalledWith({
      type: "rename",
      oldName: "Alice",
      newName: "Bob",
    });
  });

  it("closeWorkshop sends a close_workshop message", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    act(() => result.current.closeWorkshop());
    expect(mockSend).toHaveBeenCalledWith({ type: "close_workshop" });
  });

  it("error populates when server sends an error", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    expect(result.current.error).toBeNull();
    act(() => capturedOptions.onError?.("Name is already taken"));
    expect(result.current.error).toBe("Name is already taken");
  });

  it("clearError clears the error", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    act(() => capturedOptions.onError?.("Name is already taken"));
    expect(result.current.error).toBe("Name is already taken");
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("renamedTo populates when server sends a renamed message", () => {
    const { result } = renderHook(() => useWorkshopActions("test-ws"));
    expect(result.current.renamedTo).toBeNull();
    act(() => capturedOptions.onRenamed?.("Alice", "Bob"));
    expect(result.current.renamedTo).toEqual({
      oldName: "Alice",
      newName: "Bob",
    });
  });
});

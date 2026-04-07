import { describe, expect, it } from "vitest";
import { WorkshopState } from "./workshopState";

describe("WorkshopState", () => {
  describe("join", () => {
    it("adds a new participant with working status", () => {
      const state = new WorkshopState();
      const result = state.join("conn-1", "Alice");

      expect(result.broadcast).toBeDefined();
      expect(result.broadcast).toEqual([
        {
          type: "state",
          participants: [{ name: "Alice", status: "working", connected: true }],
        },
      ]);
    });
    it("rejects duplicate active name", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.join("conn-2", "Alice");

      expect(result.unicast).toEqual({
        type: "error",
        message: "Name is already taken",
      });
    });

    it("allows reconnection when disconnected", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      state.disconnect("conn-1");

      const result = state.join("conn-2", "Alice");

      expect(result.broadcast).toBeDefined();
      const participants = state.getParticipants();
      expect(participants).toEqual([
        { name: "Alice", status: "working", connected: true },
      ]);
    });

    it("rejects empty name", () => {
      const state = new WorkshopState();
      const result = state.join("conn-1", "  ");

      expect(result.unicast).toEqual({
        type: "error",
        message: "Name cannot be empty",
      });
      expect(state.getParticipants()).toEqual([]);
    });
  });

  describe("status", () => {
    it("changes participant status", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.status("Alice", "ready");

      expect(result.broadcast).toEqual([
        {
          type: "state",
          participants: [{ name: "Alice", status: "ready", connected: true }],
        },
      ]);
    });
  });

  describe("rename", () => {
    it("moves participant to new name", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.rename("conn-1", "Alice", "Bob");

      expect(result.broadcast).toEqual([
        { type: "renamed", oldName: "Alice", newName: "Bob" },
        {
          type: "state",
          participants: [{ name: "Bob", status: "working", connected: true }],
        },
      ]);
    });

    it("rejects taken name", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      state.join("conn-2", "Bob");
      const result = state.rename("conn-1", "Alice", "Bob");

      expect(result.unicast).toEqual({
        type: "error",
        message: "Name is already taken",
      });
    });

    it("rejects empty name", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.rename("conn-1", "Alice", "  ");

      expect(result.unicast).toEqual({
        type: "error",
        message: "Name cannot be empty",
      });
    });
  });

  describe("leave", () => {
    it("removes participant", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      state.join("conn-2", "Bob");
      const result = state.leave("Alice");

      expect(result.broadcast).toEqual([
        {
          type: "state",
          participants: [{ name: "Bob", status: "working", connected: true }],
        },
      ]);
    });
  });

  describe("close", () => {
    it("clears all state and returns closed flag", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.close();

      expect(result.closed).toBe(true);
      expect(result.broadcast).toEqual([{ type: "workshop_closed" }]);
      expect(state.getParticipants()).toEqual([]);
    });
  });

  describe("disconnect", () => {
    it("marks participant as disconnected but keeps them", () => {
      const state = new WorkshopState();
      state.join("conn-1", "Alice");
      const result = state.disconnect("conn-1");

      expect(result.broadcast).toEqual([
        {
          type: "state",
          participants: [
            { name: "Alice", status: "working", connected: false },
          ],
        },
      ]);
    });
  });
});

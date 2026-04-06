// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ParticipantDot } from "./ParticipantDot";

afterEach(cleanup);

describe("ParticipantDot", () => {
  it("renders as a link to the participant page when href is provided", () => {
    render(
      <ParticipantDot
        participant={{ name: "Alice", status: "ready", connected: true }}
        href="/workshop/Alice"
      />,
    );

    const link = screen.getByRole("link", { name: /alice/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/workshop/Alice");
  });

  it("renders without a link when href is not provided", () => {
    render(
      <ParticipantDot
        participant={{ name: "Bob", status: "working", connected: true }}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Bob")).toBeDefined();
  });
});

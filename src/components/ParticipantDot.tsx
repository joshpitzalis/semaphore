import type { Participant } from "../lib/protocol";

const statusColors = {
  ready: "bg-ready",
  working: "bg-working",
  stuck: "bg-stuck",
};

export function ParticipantDot({
  participant,
  showName = true,
  href,
}: {
  participant: Participant;
  showName?: boolean;
  href?: string;
}) {
  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`
					rounded-full transition-all duration-300
					${statusColors[participant.status]}
					${participant.connected ? "opacity-100" : "opacity-30"}
				`}
        style={{ width: "var(--dot-size)", height: "var(--dot-size)" }}
      />
      {showName && (
        <div className="flex items-center gap-1">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              participant.connected ? "bg-ready" : "bg-ink/20"
            }`}
          />
          <span className="text-xs font-medium text-ink-soft truncate max-w-20">
            {participant.name}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline">
        {content}
      </a>
    );
  }

  return content;
}

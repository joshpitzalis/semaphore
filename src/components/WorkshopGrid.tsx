import type { Participant } from "../lib/protocol";
import { ParticipantDot } from "./ParticipantDot";

export function WorkshopGrid({
	participants,
}: {
	participants: Array<Participant>;
}) {
	const count = participants.length;
	const showNames = count < 40;

	// Scale dot size based on participant count
	const dotSize = count <= 10 ? 64 : count <= 25 ? 48 : count <= 50 ? 36 : 24;

	return (
		<div
			className="flex flex-wrap justify-center gap-6 p-4"
			style={{ "--dot-size": `${dotSize}px` } as React.CSSProperties}
		>
			{participants.map((p) => (
				<ParticipantDot key={p.name} participant={p} showName={showNames} />
			))}
			{count === 0 && (
				<p className="text-ink-soft text-lg">
					No participants yet. Share the link to get started.
				</p>
			)}
		</div>
	);
}

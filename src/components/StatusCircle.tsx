import type { Status } from "../lib/protocol";

const statusColors: Record<Status, { bg: string; ring: string }> = {
	ready: { bg: "bg-ready", ring: "ring-ready/30" },
	working: { bg: "bg-working", ring: "ring-working/30" },
	stuck: { bg: "bg-stuck", ring: "ring-stuck/30" },
};

const statusLabels: Record<Status, string> = {
	ready: "Ready",
	working: "Working",
	stuck: "Stuck",
};

export function StatusCircle({
	status,
	active = false,
	size = "md",
	onClick,
}: {
	status: Status;
	active?: boolean;
	size?: "sm" | "md" | "lg";
	onClick?: () => void;
}) {
	const colors = statusColors[status];
	const sizeClasses = {
		sm: "h-8 w-8",
		md: "h-16 w-16",
		lg: "h-24 w-24 sm:h-32 sm:w-32",
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={`
				${sizeClasses[size]} rounded-full transition-all duration-200
				${active ? `${colors.bg} ring-4 ${colors.ring} scale-110` : "bg-ink/10 hover:bg-ink/20"}
				${onClick ? "cursor-pointer" : "cursor-default"}
			`}
			aria-label={statusLabels[status]}
		>
			<span className="sr-only">{statusLabels[status]}</span>
		</button>
	);
}

export function StatusLabel({ status }: { status: Status }) {
	return (
		<span className="text-sm font-semibold tracking-wide text-ink-soft uppercase">
			{statusLabels[status]}
		</span>
	);
}

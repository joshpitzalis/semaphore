import { useEffect, useState } from "react";

const facts = [
	'"Semaphore" literally means "sign carrier" — from Ancient Greek.',
	"Ancient Greeks relayed messages by lighting fires on mountaintops 30 km apart.",
	"Byzantines could send a message 720 km in about one hour using beacon towers.",
	"The optical telegraph was invented in 1792 by a French clergyman.",
	"Napoleon's semaphore network turned days-long messages into hours.",
	"The Royal Navy first used dots and dashes from a signal lamp in 1867.",
	"Flag semaphore is still used by navies during at-sea resupply operations.",
	"Heliographs — mirrors flashing sunlight in Morse code — were used by armies until the 1960s.",
	"Railway semaphore: horizontal = stop, vertical = clear, inclined = caution.",
	"The Greeks built a hydraulic telegraph powered by water pressure in the 4th century BC.",
	"The Dalén lighthouse lamp could automatically ignite at sunset and extinguish at dawn.",
	"The electric telegraph made visual semaphore obsolete by the 1840s.",
];

export function LoadingFacts({ message = "Loading..." }: { message?: string }) {
	const [index, setIndex] = useState(() =>
		Math.floor(Math.random() * facts.length),
	);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const interval = setInterval(() => {
			setVisible(false);
			setTimeout(() => {
				setIndex((i) => (i + 1) % facts.length);
				setVisible(true);
			}, 300);
		}, 3000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex flex-col items-center justify-center min-h-[200px] gap-6">
			<div className="h-8 w-8 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
			<p className="text-lg font-semibold text-ink">{message}</p>
			<div className="text-center max-w-sm">
				<p className="text-sm font-semibold tracking-wide text-ink-soft uppercase mb-2">
					Did you know?
				</p>
				<p
					className={`text-ink transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
				>
					{facts[index]}
				</p>
			</div>
		</div>
	);
}

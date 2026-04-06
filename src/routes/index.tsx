import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	createNewWorkshop,
	generateRandomWord,
	getWorkshops,
} from "../lib/server-fns";

export const Route = createFileRoute("/")({
	loader: () => getWorkshops(),
	component: Home,
});

function Home() {
	const workshops = Route.useLoaderData();
	const router = useRouter();
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [creating, setCreating] = useState(false);

	async function rollName() {
		const { word } = await generateRandomWord();
		setName(word);
		setError("");
	}

	async function handleCreate() {
		const slug = name.trim().toLowerCase();
		if (!slug) {
			setError("Enter a workshop name");
			return;
		}

		setCreating(true);
		setError("");

		const result = await createNewWorkshop({ data: slug });

		if (!result.ok) {
			setError(result.error);
			setCreating(false);
			return;
		}

		router.navigate({ to: "/$slug", params: { slug } });
	}

	return (
		<main className="min-h-dvh px-4 py-16">
			<div className="mx-auto max-w-lg">
				<h1 className="text-5xl font-bold tracking-tight text-center mb-2">
					Semaphore
				</h1>
				<p className="text-ink-soft text-center mb-12">
					Real-time workshop status board
				</p>

				{/* Create Workshop */}
				<div className="mb-12">
					<h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft mb-4">
						Create a workshop
					</h2>
					<div className="flex gap-2 mb-2">
						<input
							type="text"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setError("");
							}}
							placeholder="Workshop name"
							className="flex-1 rounded-lg border border-ink/10 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
							onKeyDown={(e) => e.key === "Enter" && handleCreate()}
						/>
						<button
							type="button"
							onClick={rollName}
							className="rounded-lg border border-ink/10 bg-white px-4 py-3 text-lg hover:bg-ink/5 transition-colors"
							title="Random name"
						>
							&#x1f3b2;
						</button>
					</div>
					{error && <p className="text-stuck text-sm mb-2">{error}</p>}
					<button
						type="button"
						onClick={handleCreate}
						disabled={creating}
						className="w-full rounded-lg bg-accent py-3 text-white font-semibold text-lg hover:bg-accent-soft transition-colors disabled:opacity-50"
					>
						{creating ? "Creating..." : "Create"}
					</button>
				</div>

				{/* Active Workshops */}
				{workshops.length > 0 && (
					<div>
						<h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft mb-4">
							Active workshops
						</h2>
						<div className="space-y-2">
							{workshops.map(({ slug, record }) => (
								<Link
									key={slug}
									to="/$slug"
									params={{ slug }}
									className="block rounded-lg border border-ink/10 bg-white px-4 py-3 hover:bg-ink/5 transition-colors no-underline"
								>
									<span className="text-lg font-semibold text-ink">
										{record.name}
									</span>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</main>
	);
}

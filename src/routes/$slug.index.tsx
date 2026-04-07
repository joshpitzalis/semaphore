import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { WorkshopGrid } from "../components/WorkshopGrid";
import { deleteWorkshopBySlug, getWorkshopBySlug } from "../lib/server-fns";
import { useWorkshopActions } from "../lib/useWorkshopActions";

export const Route = createFileRoute("/$slug/")({
  loader: ({ params }) => getWorkshopBySlug({ data: params.slug }),
  component: WorkshopDashboard,
});

function WorkshopDashboard() {
  const workshop = Route.useLoaderData();
  const { slug } = Route.useParams();
  const router = useRouter();
  const { participants, workshopClosed, closeWorkshop } =
    useWorkshopActions(slug);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  if (!workshop) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold mb-4">Workshop not found</h1>
        <Link to="/" className="text-accent font-semibold">
          Back to home
        </Link>
      </main>
    );
  }

  if (workshopClosed) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold mb-4">This workshop has ended.</h1>
        <Link to="/" className="text-accent font-semibold">
          Back to home
        </Link>
      </main>
    );
  }

  function handleJoin() {
    const name = joinName.trim();
    if (!name) {
      setJoinError("Enter your name");
      return;
    }

    router.navigate({
      to: "/$slug/$name",
      params: { slug, name },
    });
  }

  async function handleClose() {
    closeWorkshop();
    await deleteWorkshopBySlug({ data: slug });
    router.navigate({ to: "/" });
  }

  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <Link
              to="/"
              className="text-ink-soft text-sm font-medium no-underline hover:text-ink"
            >
              &larr; Home
            </Link>
            <h1 className="text-4xl font-bold tracking-tight mt-1">
              {workshop.name}
            </h1>
          </div>
          <span className="text-sm text-ink-soft">
            {participants.length}{" "}
            {participants.length === 1 ? "participant" : "participants"}
          </span>
        </div>

        {/* Grid */}
        <div className="mb-12">
          <WorkshopGrid participants={participants} slug={slug} />
        </div>

        {/* Join */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft mb-3">
            Join this workshop
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinName}
              onChange={(e) => {
                setJoinName(e.target.value);
                setJoinError("");
              }}
              placeholder="Your name"
              className="flex-1 rounded-lg border border-ink/10 bg-white px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              type="button"
              onClick={handleJoin}
              className="rounded-lg bg-accent px-6 py-3 text-white font-semibold hover:bg-accent-soft transition-colors"
            >
              Join
            </button>
          </div>
          {joinError && <p className="text-stuck text-sm mt-1">{joinError}</p>}
        </div>

        {/* Close Workshop */}
        <div className="border-t border-ink/10 pt-6">
          {!confirmClose ? (
            <button
              type="button"
              onClick={() => setConfirmClose(true)}
              className="text-sm text-ink-soft hover:text-stuck transition-colors"
            >
              Close workshop
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-ink-soft">
                Are you sure? This will end the workshop for everyone.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-stuck px-4 py-2 text-white text-sm font-semibold hover:bg-stuck/80 transition-colors"
              >
                Yes, close
              </button>
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="text-sm text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

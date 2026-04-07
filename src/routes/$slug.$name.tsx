import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusCircle, StatusLabel } from "../components/StatusCircle";
import type { Status } from "../lib/protocol";
import { useWorkshopActions } from "../lib/useWorkshopActions";

export const Route = createFileRoute("/$slug/$name")({
  component: ParticipantPage,
});

function ParticipantPage() {
  const { slug, name } = Route.useParams();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const {
    participants,
    workshopClosed,
    updateStatus,
    leave,
    rename,
    error,
    clearError,
    renamedTo,
  } = useWorkshopActions(slug, { joinAs: name });

  useEffect(() => {
    if (renamedTo && renamedTo.oldName === name) {
      router.navigate({
        to: "/$slug/$name",
        params: { slug, name: renamedTo.newName },
        replace: true,
      });
    }
  }, [renamedTo, name, slug, router]);

  const me = participants.find((p) => p.name === name);
  const currentStatus: Status = me?.status ?? "working";

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

  function handleStatus(status: Status) {
    updateStatus(name, status);
  }

  function handleLeave() {
    leave(name);
    router.navigate({ to: "/$slug", params: { slug } });
  }

  function handleRename() {
    const newName = editName.trim();
    if (!newName || newName === name) {
      setEditing(false);
      setEditName(name);
      return;
    }
    clearError();
    rename(name, newName);
    setEditing(false);
  }

  const statuses: Array<Status> = ["ready", "working", "stuck"];

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-12">
        <Link
          to="/$slug"
          params={{ slug }}
          className="text-ink-soft text-sm font-medium no-underline hover:text-ink block mb-4"
        >
          &larr; {slug}
        </Link>
        {editing ? (
          <div>
            <input
              type="text"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                clearError();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditName(name);
                }
              }}
              onBlur={handleRename}
              className="text-3xl font-bold tracking-tight text-center bg-transparent border-b-2 border-accent outline-none w-48"
              ref={(el) => el?.focus()}
            />
            {error && <p className="text-stuck text-sm mt-1">{error}</p>}
          </div>
        ) : (
          <button
            type="button"
            className="text-3xl font-bold tracking-tight cursor-pointer hover:text-accent transition-colors bg-transparent border-none p-0"
            onClick={() => {
              setEditName(name);
              setEditing(true);
            }}
            title="Click to edit name"
          >
            {name}
          </button>
        )}
      </div>

      {/* Status Circles */}
      <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 mb-16">
        {statuses.map((status) => (
          <div key={status} className="flex flex-col items-center gap-3">
            <StatusCircle
              status={status}
              active={currentStatus === status}
              size="lg"
              onClick={() => handleStatus(status)}
            />
            <StatusLabel status={status} />
          </div>
        ))}
      </div>

      {/* Leave */}
      <button
        type="button"
        onClick={handleLeave}
        className="text-sm text-ink-soft hover:text-stuck transition-colors"
      >
        Leave workshop
      </button>
    </main>
  );
}

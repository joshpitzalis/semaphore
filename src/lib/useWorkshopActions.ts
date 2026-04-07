import { useCallback, useState } from "react";
import type { Status } from "./protocol";
import { useWorkshopSocket } from "./useWorkshopSocket";

export function useWorkshopActions(
  slug: string,
  options?: { joinAs?: string },
) {
  const [error, setError] = useState<string | null>(null);
  const [renamedTo, setRenamedTo] = useState<{
    oldName: string;
    newName: string;
  } | null>(null);

  const { participants, connected, workshopClosed, send } = useWorkshopSocket(
    slug,
    {
      joinAs: options?.joinAs,
      onError: (message) => setError(message),
      onRenamed: (oldName, newName) => setRenamedTo({ oldName, newName }),
    },
  );

  const updateStatus = useCallback(
    (name: string, status: Status) => {
      send({ type: "status", name, status });
    },
    [send],
  );

  const leave = useCallback(
    (name: string) => {
      send({ type: "leave", name });
    },
    [send],
  );

  const rename = useCallback(
    (oldName: string, newName: string) => {
      send({ type: "rename", oldName, newName });
    },
    [send],
  );

  const closeWorkshop = useCallback(() => {
    send({ type: "close_workshop" });
  }, [send]);

  const clearError = useCallback(() => setError(null), []);

  return {
    participants,
    connected,
    workshopClosed,
    updateStatus,
    leave,
    rename,
    closeWorkshop,
    error,
    clearError,
    renamedTo,
  };
}

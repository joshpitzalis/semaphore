import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, Participant, Status } from "../../lib/protocol";

type UseWorkshopOptions = {
  joinAs?: string;
  /** @internal Test seam — override WebSocket constructor */
  createSocket?: (url: string) => WebSocket;
};

export function useWorkshop(slug: string, options?: UseWorkshopOptions) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connected, setConnected] = useState(false);
  const [workshopClosed, setWorkshopClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamedTo, setRenamedTo] = useState<{
    oldName: string;
    newName: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;

      const factory = optionsRef.current?.createSocket ?? defaultCreateSocket;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/api/ws/${slug}`;
      const ws = factory(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setConnected(true);
        const joinName = optionsRef.current?.joinAs;
        if (joinName) {
          ws.send(JSON.stringify({ type: "join", name: joinName }));
        }
      });

      ws.addEventListener("message", (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "state":
            setParticipants(msg.participants);
            break;
          case "workshop_closed":
            setWorkshopClosed(true);
            break;
          case "renamed":
            setRenamedTo({ oldName: msg.oldName, newName: msg.newName });
            break;
          case "error":
            setError(msg.message);
            break;
        }
      });

      ws.addEventListener("close", () => {
        setConnected(false);
        if (!disposed && !workshopClosed) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      });
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [slug, workshopClosed]);

  const sendMsg = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const joinName = options?.joinAs;

  const updateStatus = useCallback(
    (status: Status) => {
      if (joinName) sendMsg({ type: "status", name: joinName, status });
    },
    [sendMsg, joinName],
  );

  const leave = useCallback(() => {
    if (joinName) sendMsg({ type: "leave", name: joinName });
  }, [sendMsg, joinName]);

  const rename = useCallback(
    (newName: string) => {
      if (joinName) sendMsg({ type: "rename", oldName: joinName, newName });
    },
    [sendMsg, joinName],
  );

  const closeWorkshop = useCallback(() => {
    sendMsg({ type: "close_workshop" });
  }, [sendMsg]);

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

function defaultCreateSocket(url: string) {
  return new WebSocket(url);
}

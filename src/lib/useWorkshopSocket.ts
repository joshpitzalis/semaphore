import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, Participant, ServerMessage } from "./protocol";

type Options = {
	onRenamed?: (oldName: string, newName: string) => void;
	onError?: (message: string) => void;
};

export function useWorkshopSocket(slug: string, options?: Options) {
	const [participants, setParticipants] = useState<Array<Participant>>([]);
	const [connected, setConnected] = useState(false);
	const [workshopClosed, setWorkshopClosed] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		let disposed = false;

		function connect() {
			if (disposed) return;

			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const ws = new WebSocket(
				`${protocol}//${window.location.host}/api/ws/${slug}`,
			);
			wsRef.current = ws;

			ws.addEventListener("open", () => setConnected(true));

			ws.addEventListener("message", (event) => {
				const msg: ServerMessage = JSON.parse(event.data);
				switch (msg.type) {
					case "state":
						setParticipants(msg.participants);
						break;
					case "workshop_closed":
						setWorkshopClosed(true);
						break;
					case "renamed":
						optionsRef.current?.onRenamed?.(msg.oldName, msg.newName);
						break;
					case "error":
						optionsRef.current?.onError?.(msg.message);
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

	const send = useCallback((msg: ClientMessage) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(msg));
		}
	}, []);

	return { participants, connected, workshopClosed, send };
}

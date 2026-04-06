import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

export { WorkshopRoom } from "./worker/WorkshopRoom";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // WebSocket route: /api/ws/:slug
    if (url.pathname.startsWith("/api/ws/")) {
      const slug = url.pathname.split("/")[3];
      if (!slug) {
        return new Response("Missing slug", { status: 400 });
      }

      // Look up the DO ID from KV
      const record = await env.WORKSHOPS.get(slug);
      if (!record) {
        return new Response("Workshop not found", { status: 404 });
      }

      const { doId } = JSON.parse(record);
      const id = env.WORKSHOP_ROOM.idFromString(doId);
      const stub = env.WORKSHOP_ROOM.get(id);

      // Forward the request to the DO
      const doUrl = new URL(request.url);
      doUrl.pathname = "/ws";
      return stub.fetch(new Request(doUrl, request));
    }

    return handler(request, { context: { env, ctx } as never });
  },
};

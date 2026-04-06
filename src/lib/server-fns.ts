import { createServerFn } from "@tanstack/react-start";
import {
	createWorkshop,
	deleteWorkshop,
	getWorkshop,
	listWorkshops,
	workshopExists,
} from "./kv";
import { randomWord } from "./words";

export const getWorkshops = createServerFn({ method: "GET" }).handler(
	async ({ context }) => {
		const env = (context as { env: Env }).env;
		return listWorkshops(env.WORKSHOPS);
	},
);

export const getWorkshopBySlug = createServerFn({ method: "GET" })
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug, context }) => {
		const env = (context as { env: Env }).env;
		return getWorkshop(env.WORKSHOPS, slug);
	});

export const createNewWorkshop = createServerFn({ method: "POST" })
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug, context }) => {
		const env = (context as { env: Env }).env;

		if (await workshopExists(env.WORKSHOPS, slug)) {
			return { ok: false as const, error: "Workshop name is already taken" };
		}

		const doId = env.WORKSHOP_ROOM.newUniqueId();
		await createWorkshop(env.WORKSHOPS, slug, doId.toString());
		return { ok: true as const, slug };
	});

export const deleteWorkshopBySlug = createServerFn({ method: "POST" })
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug, context }) => {
		const env = (context as { env: Env }).env;
		await deleteWorkshop(env.WORKSHOPS, slug);
		return { ok: true };
	});

export const generateRandomWord = createServerFn({ method: "GET" }).handler(
	async () => {
		return { word: randomWord() };
	},
);

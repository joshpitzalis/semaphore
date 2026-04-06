export type WorkshopRecord = {
	doId: string;
	name: string;
	createdAt: string;
};

export async function createWorkshop(
	kv: KVNamespace,
	slug: string,
	doId: string,
): Promise<void> {
	const record: WorkshopRecord = {
		doId,
		name: slug,
		createdAt: new Date().toISOString(),
	};
	await kv.put(slug, JSON.stringify(record));
}

export async function deleteWorkshop(
	kv: KVNamespace,
	slug: string,
): Promise<void> {
	await kv.delete(slug);
}

export async function getWorkshop(
	kv: KVNamespace,
	slug: string,
): Promise<WorkshopRecord | null> {
	const val = await kv.get(slug);
	if (!val) return null;
	return JSON.parse(val);
}

export async function workshopExists(
	kv: KVNamespace,
	slug: string,
): Promise<boolean> {
	const val = await kv.get(slug);
	return val !== null;
}

export async function listWorkshops(
	kv: KVNamespace,
): Promise<Array<{ slug: string; record: WorkshopRecord }>> {
	const list = await kv.list();
	const results: Array<{ slug: string; record: WorkshopRecord }> = [];

	for (const key of list.keys) {
		const val = await kv.get(key.name);
		if (val) {
			results.push({ slug: key.name, record: JSON.parse(val) });
		}
	}

	return results;
}

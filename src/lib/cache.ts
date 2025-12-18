import { saveFile, getFile, deleteFile } from './storage';

const BLOB_NAME = 'cache.json';

export async function getCache<T>(): Promise<T | null> {
    const buffer = await getFile(BLOB_NAME);
    if (!buffer) return null;

    try {
        const data = buffer.toString('utf-8');
        return JSON.parse(data) as T;
    } catch (e) {
        console.error("Cache read error", e);
        return null;
    }
}

export async function setCache<T>(data: T): Promise<void> {
    const dataString = JSON.stringify(data, null, 2);
    await saveFile(BLOB_NAME, dataString);
}

// Invalidate cache method if needed
export async function clearCache() {
    await deleteFile(BLOB_NAME);
}


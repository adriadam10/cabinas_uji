import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

export async function getCache<T>(): Promise<T | null> {
    if (!fs.existsSync(CACHE_FILE)) return null;
    try {
        const data = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(data) as T;
    } catch (e) {
        console.error("Cache read error", e);
        return null;
    }
}

export async function setCache<T>(data: T): Promise<void> {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

// Invalidate cache method if needed? For now manual refresh mentioned in requirements.
export async function clearCache() {
    if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
    }
}

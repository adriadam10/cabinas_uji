import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_FILE = path.join(process.cwd(), 'data', 'availability-cache.json');

// TTL in milliseconds (e.g., 60 minutes - occupied slots are likely to stay occupied)
const TTL = 60 * 60 * 1000;

interface TimeSlot {
    start: number;
    end: number;
    status: string; // 'Occupied' | 'Closed'
    raw: string;
}

interface CachedDay {
    timestamp: number;
    occupiedSlots: TimeSlot[];
}

interface CacheStore {
    [key: string]: CachedDay;
}

function getCacheKey(url: string, date: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}_${date}`;
}

function loadCache(): CacheStore {
    try {
        if (!fs.existsSync(CACHE_FILE)) return {};
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error loading availability cache", e);
        return {};
    }
}

function saveCache(cache: CacheStore) {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error("Error saving availability cache", e);
    }
}

function checkOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Checks if the requested time range overlaps with any KNOWN occupied slot in the cache.
 * Returns the overlapping slot if found (meaning request is rejected/Occupied).
 * Returns NULL if no overlap found (meaning we must scrape to verify availability).
 */
export function checkCachedOccupancy(url: string, date: string, startMinutes: number, endMinutes: number): TimeSlot | null {
    const cache = loadCache();
    const key = getCacheKey(url, date);
    const entry = cache[key];

    if (entry) {
        if (Date.now() - entry.timestamp < TTL) {
            for (const slot of entry.occupiedSlots) {
                if (checkOverlap(startMinutes, endMinutes, slot.start, slot.end)) {
                    console.log(`[CACHE HIT - BLOCKED] ${date} ${startMinutes}-${endMinutes} overlaps with ${slot.raw}`);
                    return slot;
                }
            }
            console.log(`[CACHE MISS - NO BLOCK] ${date} ${startMinutes}-${endMinutes}. checking live...`);
        } else {
            console.log(`[CACHE EXPIRED]`);
        }
    }
    return null;
}

/**
 * Merges new occupied slots into the cache.
 * We Union the new slots with existing ones (simple concatenation + overwrite if full refresh).
 * Actually, since we scrape the whole day, the new scrape IS the authoritative list of occupied slots.
 * So we can overwrite. 
 * BUT, if we want to be extra safe, we overwrite. 
 * The user's nuance might be: "Checking 10-11 shouldn't rely on a cache made at 09:00 if 09:00 said it was free".
 * But if we scrape at 10:00, we get the fresh list. So overwriting is correct.
 */
export function updateOccupiedCache(url: string, date: string, slots: TimeSlot[]) {
    const cache = loadCache();
    const key = getCacheKey(url, date);

    // Filter only occupied/closed
    const busySlots = slots.filter(s => s.status === 'Occupied' || s.status === 'Closed');

    cache[key] = {
        timestamp: Date.now(),
        occupiedSlots: busySlots
    };

    saveCache(cache);
}

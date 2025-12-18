import { NextResponse } from 'next/server';
import { parseCabins, Cabin } from '@/lib/pdf-parser';
import { getCache, setCache } from '@/lib/cache';

export async function GET() {
    try {
        // Check cache
        const cached = await getCache<Cabin[]>();
        if (cached && cached.length > 0) {
            return NextResponse.json(cached);
        }

        // Parse if no cache
        const cabins = await parseCabins();

        if (cabins.length > 0) {
            await setCache(cabins);
        }

        return NextResponse.json(cabins);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch cabins' }, { status: 500 });
    }
}

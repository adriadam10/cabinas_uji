import { NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/availability';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const result = await checkAvailability(url, date || undefined, start || undefined, end || undefined);
        return NextResponse.json(result);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }
}

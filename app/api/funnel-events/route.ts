import { getAllFunnelEvents } from '@/lib/airtable';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const events = await getAllFunnelEvents();
    return NextResponse.json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


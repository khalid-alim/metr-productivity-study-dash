import { getAllFunnelEvents } from '@/lib/airtable';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const events = await getAllFunnelEvents();
    return NextResponse.json(events);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


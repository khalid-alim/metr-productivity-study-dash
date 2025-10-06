import { getAllPeople } from '@/lib/airtable';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const people = await getAllPeople();
    return NextResponse.json(people);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

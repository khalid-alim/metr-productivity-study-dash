import { peopleTable } from '@/lib/airtable';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const record = await peopleTable.update(params.id, body);
    return NextResponse.json({ id: record.id, ...record.fields });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

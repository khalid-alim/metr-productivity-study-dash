import { updatePersonField } from '@/lib/airtable';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Update all fields in the body
    const updates = Object.entries(body);
    let result = null;
    
    for (const [fieldName, value] of updates) {
      result = await updatePersonField(id, fieldName, value as string | number | boolean);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import Airtable from 'airtable';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_ACCESS_TOKEN
}).base(process.env.AIRTABLE_BASE_ID!);

export const peopleTable = base(process.env.AIRTABLE_TABLE_NAME!);
export const funnelEventsTable = base('Funnel Events');

export async function getAllPeople() {
  const records = await peopleTable.select().all();
  return records.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

export async function getAllFunnelEvents() {
  const records = await funnelEventsTable.select({
    sort: [{ field: 'Changed At', direction: 'asc' }]
  }).all();
  return records.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

export async function updatePersonStatus(recordId: string, status: string) {
  const record = await peopleTable.update(recordId, { Status: status });
  return { id: record.id, ...record.fields };
}

export async function updatePersonField(recordId: string, fieldName: string, value: any) {
  const record = await peopleTable.update(recordId, { [fieldName]: value });
  return { id: record.id, ...record.fields };
}

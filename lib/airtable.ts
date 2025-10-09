import Airtable from 'airtable';

// Lazy initialization to avoid build-time errors
function getBase() {
  if (!process.env.AIRTABLE_ACCESS_TOKEN) {
    throw new Error('AIRTABLE_ACCESS_TOKEN is not set');
  }
  if (!process.env.AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID is not set');
  }
  
  return new Airtable({
    apiKey: process.env.AIRTABLE_ACCESS_TOKEN
  }).base(process.env.AIRTABLE_BASE_ID);
}

function getPeopleTable() {
  if (!process.env.AIRTABLE_TABLE_NAME) {
    throw new Error('AIRTABLE_TABLE_NAME is not set');
  }
  return getBase()(process.env.AIRTABLE_TABLE_NAME);
}

function getFunnelEventsTable() {
  return getBase()('Funnel Events');
}

export async function getAllPeople() {
  const records = await getPeopleTable().select().all();
  return records.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

export async function getAllFunnelEvents() {
  const records = await getFunnelEventsTable().select({
    sort: [{ field: 'Changed At', direction: 'asc' }]
  }).all();
  return records.map(record => ({
    id: record.id,
    ...record.fields
  }));
}

export async function updatePersonStatus(recordId: string, status: string) {
  const record = await getPeopleTable().update(recordId, { Status: status });
  return { id: record.id, ...record.fields };
}

export async function updatePersonField(recordId: string, fieldName: string, value: string | number | boolean) {
  const record = await getPeopleTable().update(recordId, { [fieldName]: value });
  return { id: record.id, ...record.fields };
}

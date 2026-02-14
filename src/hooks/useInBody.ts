import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { InBodyRecord } from '../types';

export function useInBody() {
  const records = useLiveQuery(() =>
    db.inbodyRecords.orderBy('date').toArray()
  );

  const latest = records?.[records.length - 1];
  const previous = records && records.length >= 2 ? records[records.length - 2] : undefined;

  async function addRecord(record: Omit<InBodyRecord, 'id'>) {
    return db.inbodyRecords.add(record);
  }

  async function updateRecord(id: number, changes: Partial<InBodyRecord>) {
    return db.inbodyRecords.update(id, changes);
  }

  async function deleteRecord(id: number) {
    return db.inbodyRecords.delete(id);
  }

  return { records: records ?? [], latest, previous, addRecord, updateRecord, deleteRecord };
}

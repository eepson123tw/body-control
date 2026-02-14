import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { DietEntry } from '../types';

export function useDiet(date?: string) {
  const entries = useLiveQuery(() => {
    if (date) {
      return db.dietEntries.where('date').equals(date).toArray();
    }
    return db.dietEntries.orderBy('date').toArray();
  }, [date]);

  const todayEntries = entries ?? [];

  const totalProtein = todayEntries.reduce((sum, e) => sum + e.protein, 0);
  const totalCalories = todayEntries.reduce((sum, e) => sum + e.calories, 0);

  async function addEntry(entry: Omit<DietEntry, 'id'>) {
    return db.dietEntries.add(entry);
  }

  async function updateEntry(id: number, changes: Partial<DietEntry>) {
    return db.dietEntries.update(id, changes);
  }

  async function deleteEntry(id: number) {
    return db.dietEntries.delete(id);
  }

  return { entries: todayEntries, totalProtein, totalCalories, addEntry, updateEntry, deleteEntry };
}

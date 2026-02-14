import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TrainingSession } from '../types';

export function useTraining(month?: string) {
  const sessions = useLiveQuery(() => {
    if (month) {
      return db.trainingSessions
        .where('date')
        .startsWith(month)
        .toArray();
    }
    return db.trainingSessions.orderBy('date').toArray();
  }, [month]);

  async function addSession(session: Omit<TrainingSession, 'id'>) {
    return db.trainingSessions.add(session);
  }

  async function updateSession(id: number, changes: Partial<TrainingSession>) {
    return db.trainingSessions.update(id, changes);
  }

  async function deleteSession(id: number) {
    return db.trainingSessions.delete(id);
  }

  return { sessions: sessions ?? [], addSession, updateSession, deleteSession };
}

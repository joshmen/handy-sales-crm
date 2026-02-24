import { useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { useObservable } from './useObservable';
import type Attachment from '@/db/models/Attachment';

/**
 * Query attachments for a specific event (visita, cobro, pedido).
 */
export function useAttachmentsForEvent(eventType: string, eventLocalId: string) {
  const observable = useMemo(() => {
    if (!eventLocalId) {
      return database.get<Attachment>('attachments').query(Q.where('id', '')).observe();
    }
    return database
      .get<Attachment>('attachments')
      .query(
        Q.and(
          Q.where('event_type', eventType),
          Q.where('event_local_id', eventLocalId)
        )
      )
      .observe();
  }, [eventType, eventLocalId]);

  return useObservable<Attachment[]>(observable);
}

/**
 * Count attachments pending upload (for sync screen badge).
 */
export function usePendingAttachmentCount() {
  const observable = useMemo(() => {
    return database
      .get<Attachment>('attachments')
      .query(
        Q.or(
          Q.where('upload_status', 'pending'),
          Q.where('upload_status', 'failed')
        )
      )
      .observeCount();
  }, []);

  return useObservable<number>(observable);
}

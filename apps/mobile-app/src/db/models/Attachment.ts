import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';

export default class Attachment extends Model {
  static table = 'attachments';

  @field('server_id') serverId!: number | null;
  @text('event_type') eventType!: string;
  @field('event_local_id') eventLocalId!: string;
  @text('tipo') tipo!: string;
  @text('local_uri') localUri!: string;
  @text('remote_url') remoteUrl!: string | null;
  @text('upload_status') uploadStatus!: string;
  @field('retry_count') retryCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @writer async markUploading() {
    await this.update((record: any) => {
      record.uploadStatus = 'uploading';
    });
  }

  @writer async markUploaded(remoteUrl: string) {
    await this.update((record: any) => {
      record.uploadStatus = 'uploaded';
      record.remoteUrl = remoteUrl;
    });
  }

  @writer async markFailed() {
    await this.update((record: any) => {
      record.uploadStatus = 'failed';
      record.retryCount = (record.retryCount || 0) + 1;
    });
  }
}

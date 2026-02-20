import api from '@/lib/api';

// Types
export type AnnouncementDisplayMode = 'Banner' | 'Notification' | 'Both';

export interface AnnouncementBanner {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'Broadcast' | 'Maintenance' | 'Banner';
  prioridad: 'Low' | 'Normal' | 'High' | 'Critical';
  displayMode: AnnouncementDisplayMode;
  isDismissible: boolean;
  expiresAt: string | null;
  dataJson: string | null;
}

export interface AnnouncementListItem {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  prioridad: string;
  displayMode: string;
  targetTenantIds: string | null;
  targetRoles: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  isDismissible: boolean;
  superAdminId: number;
  sentCount: number;
  readCount: number;
  activo: boolean;
  creadoEn: string;
}

export interface AnnouncementListResponse {
  items: AnnouncementListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAnnouncementRequest {
  titulo: string;
  mensaje: string;
  tipo: string;
  prioridad?: string;
  displayMode?: string;
  targetTenantIds?: number[];
  targetRoles?: string[];
  scheduledAt?: string;
  expiresAt?: string;
  isDismissible?: boolean;
}

// SuperAdmin API
export async function getAnnouncements(page = 1, pageSize = 20): Promise<AnnouncementListResponse> {
  const { data } = await api.get('/api/superadmin/announcements', { params: { page, pageSize } });
  return data;
}

export async function createAnnouncement(dto: CreateAnnouncementRequest) {
  const { data } = await api.post('/api/superadmin/announcements', dto);
  return data;
}

export async function deleteAnnouncement(id: number) {
  const { data } = await api.delete(`/api/superadmin/announcements/${id}`);
  return data;
}

// Maintenance mode
export async function activateMaintenance(message?: string) {
  const { data } = await api.post('/api/superadmin/maintenance', { message });
  return data;
}

export async function deactivateMaintenance() {
  const { data } = await api.delete('/api/superadmin/maintenance');
  return data;
}

// Client-facing banners
export async function getActiveBanners(): Promise<AnnouncementBanner[]> {
  const { data } = await api.get('/api/notificaciones/banners');
  return data;
}

export async function dismissBanner(id: number) {
  const { data } = await api.post(`/api/notificaciones/banners/${id}/dismiss`);
  return data;
}

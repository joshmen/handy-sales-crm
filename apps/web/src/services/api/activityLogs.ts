import { api, handleApiError } from '@/lib/api';

export interface ActivityLogDto {
  id: number;
  activityType: string;
  activityCategory: string;
  activityStatus: string;
  entityType: string | null;
  entityId: number | null;
  entityName: string | null;
  description: string | null;
  ipAddress: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  city: string | null;
  countryName: string | null;
  createdAt: string;
  tenantId?: number;
  tenantName?: string | null;
  userId: number;
  userName: string;
}

export interface ActivityLogPaginatedResponse {
  items: ActivityLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityLogFilters {
  page?: number;
  pageSize?: number;
  activityType?: string;
  activityCategory?: string;
  activityStatus?: string;
  userId?: number;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tenantId?: number;
}

class ActivityLogService {
  private basePath = '/api/activity-logs';

  async getAll(params: ActivityLogFilters = {}): Promise<ActivityLogPaginatedResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params.activityType) queryParams.set('activityType', params.activityType);
      if (params.activityCategory) queryParams.set('activityCategory', params.activityCategory);
      if (params.activityStatus) queryParams.set('activityStatus', params.activityStatus);
      if (params.userId) queryParams.set('userId', params.userId.toString());
      if (params.entityType) queryParams.set('entityType', params.entityType);
      if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.set('dateTo', params.dateTo);
      if (params.search) queryParams.set('search', params.search);
      if (params.tenantId) queryParams.set('tenantId', params.tenantId.toString());

      const query = queryParams.toString();
      const url = query ? `${this.basePath}?${query}` : this.basePath;
      const res = await api.get<ActivityLogPaginatedResponse>(url);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getEntityLogs(entityType: string, entityId: number, page = 1, pageSize = 20): Promise<ActivityLogPaginatedResponse> {
    try {
      const res = await api.get<ActivityLogPaginatedResponse>(
        `${this.basePath}/${entityType}/${entityId}?page=${page}&pageSize=${pageSize}`
      );
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const activityLogService = new ActivityLogService();

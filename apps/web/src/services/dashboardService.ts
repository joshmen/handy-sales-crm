import { api } from '@/lib/api';

// Types for dashboard data
export interface DashboardMetrics {
  todayActivities: number;
  weekActivities: number;
  monthlyLogins: number;
  activeUsersToday: number;
  totalUsers: number;
  recentErrors: number;
  systemHealth: 'healthy' | 'warning';
  lastSync: string;
  lastUpdate: string;
}

export interface ActivityLogEntry {
  id: number;
  type: string;
  category: string;
  status: string;
  description: string;
  userName: string;
  userEmail?: string;
  ipAddress?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  createdAt: string;
  timeAgo: string;
}

export interface ActivityChartData {
  date: string;
  fullDate: string;
  totalActivities: number;
  logins: number;
  errors: number;
  uniqueUsers: number;
}

export interface RecentActivityResponse {
  activities: ActivityLogEntry[];
}

export interface ActivityChartResponse {
  chartData: ActivityChartData[];
}

export interface VendedorPerformance {
  totalVentas: number;
  pedidosCount: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  visitasTotal: number;
  visitasCompletadas: number;
  visitasConVenta: number;
  efectividadVisitas: number;
  rutasTotal: number;
  rutasCompletadas: number;
  rutasHoy: number;
  clientesAsignados: number;
  desde: string;
  hasta: string;
}

// Dashboard API service
export const dashboardService = {
  // Get dashboard metrics
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await api.get<DashboardMetrics>('/api/dashboard/metrics');
    return response.data;
  },

  // Get recent activity
  async getRecentActivity(limit: number = 50): Promise<RecentActivityResponse> {
    const response = await api.get<RecentActivityResponse>(`/api/dashboard/activity?limit=${limit}`);
    return response.data;
  },

  // Get activity chart data
  async getActivityChart(days: number = 7): Promise<ActivityChartResponse> {
    const response = await api.get<ActivityChartResponse>(`/api/dashboard/activity/chart?days=${days}`);
    return response.data;
  },

  // Get vendedor performance metrics
  async getMyPerformance(startDate?: string, endDate?: string): Promise<VendedorPerformance> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<VendedorPerformance>(`/api/dashboard/my-performance${query}`);
    return response.data;
  },
};

// Fallback data for when API is not available
export const getFallbackMetrics = (): DashboardMetrics => ({
  todayActivities: 0,
  weekActivities: 0,
  monthlyLogins: 0,
  activeUsersToday: 0,
  totalUsers: 0,
  recentErrors: 0,
  systemHealth: 'healthy',
  lastSync: new Date().toISOString(),
  lastUpdate: new Date().toISOString(),
});

export const getFallbackActivity = (): RecentActivityResponse => ({
  activities: [],
});

export const getFallbackChartData = (): ActivityChartResponse => ({
  chartData: [],
});
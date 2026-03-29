import { api } from '@/lib/api';

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  orderConfirmed: boolean;
  orderEnRoute: boolean;
  orderDelivered: boolean;
  orderCancelled: boolean;
  stockLow: boolean;
  inventarioCritico: boolean;
  cobroExitoso: boolean;
  cobroVencido: boolean;
  metaNoCumplida: boolean;
  clienteInactivo: boolean;
  bienvenidaCliente: boolean;
  stockBajoAlerta: boolean;
  resumenDiario: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export const notificationSettingsService = {
  async get(): Promise<NotificationSettings> {
    const { data } = await api.get<NotificationSettings>('/api/notification-settings');
    return data;
  },

  async save(settings: NotificationSettings): Promise<void> {
    await api.put('/api/notification-settings', settings);
  },
};

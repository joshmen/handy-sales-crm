import { create } from 'zustand';

interface PermissionDialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: ((value: boolean) => void) | null;
  show: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const usePermissionDialogStore = create<PermissionDialogState>((set, get) => ({
  visible: false,
  title: '',
  message: '',
  confirmText: 'Permitir',
  cancelText: 'Ahora no',
  resolve: null,

  show: (title, message, confirmText = 'Permitir', cancelText = 'Ahora no') => {
    return new Promise<boolean>((resolve) => {
      set({ visible: true, title, message, confirmText, cancelText, resolve });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    set({ visible: false });
    resolve?.(true);
  },

  handleCancel: () => {
    const { resolve } = get();
    set({ visible: false });
    resolve?.(false);
  },
}));

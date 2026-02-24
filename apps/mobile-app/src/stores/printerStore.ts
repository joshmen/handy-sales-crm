import { create } from 'zustand';
import { secureStorage } from '@/utils/storage';
import type { PrinterDevice } from '@/services/printerService';

const SAVED_PRINTER_KEY = 'printer_saved_device';

interface PrinterStore {
  connectedDevice: PrinterDevice | null;
  savedDevice: PrinterDevice | null;
  isConnecting: boolean;

  setConnectedDevice: (device: PrinterDevice | null) => void;
  setSavedDevice: (device: PrinterDevice | null) => void;
  setConnecting: (val: boolean) => void;
  restoreSaved: () => Promise<void>;
}

export const usePrinterStore = create<PrinterStore>((set) => ({
  connectedDevice: null,
  savedDevice: null,
  isConnecting: false,

  setConnectedDevice: (device) => set({ connectedDevice: device }),

  setSavedDevice: (device) => {
    set({ savedDevice: device });
    if (device) {
      secureStorage.set(SAVED_PRINTER_KEY, JSON.stringify(device));
    } else {
      secureStorage.set(SAVED_PRINTER_KEY, '');
    }
  },

  setConnecting: (val) => set({ isConnecting: val }),

  restoreSaved: async () => {
    try {
      const raw = await secureStorage.get(SAVED_PRINTER_KEY);
      if (raw) {
        const device = JSON.parse(raw) as PrinterDevice;
        set({ savedDevice: device });
      }
    } catch {
      // ignore
    }
  },
}));

import { create } from 'zustand';
import { secureStorage } from '@/utils/storage';
import type { PrinterDevice } from '@/services/printerService';

const SAVED_PRINTER_KEY = 'printer_saved_device';
const PAPER_WIDTH_KEY = 'printer_paper_width';

interface PrinterStore {
  connectedDevice: PrinterDevice | null;
  savedDevice: PrinterDevice | null;
  isConnecting: boolean;
  paperWidth: 58 | 80;

  setConnectedDevice: (device: PrinterDevice | null) => void;
  setSavedDevice: (device: PrinterDevice | null) => void;
  setConnecting: (val: boolean) => void;
  setPaperWidth: (width: 58 | 80) => void;
  restoreSaved: () => Promise<void>;
}

export const usePrinterStore = create<PrinterStore>((set) => ({
  connectedDevice: null,
  savedDevice: null,
  isConnecting: false,
  paperWidth: 58,

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

  setPaperWidth: (width) => {
    set({ paperWidth: width });
    secureStorage.set(PAPER_WIDTH_KEY, String(width));
  },

  restoreSaved: async () => {
    try {
      const [raw, widthStr] = await Promise.all([
        secureStorage.get(SAVED_PRINTER_KEY),
        secureStorage.get(PAPER_WIDTH_KEY),
      ]);
      if (raw) {
        const device = JSON.parse(raw) as PrinterDevice;
        set({ savedDevice: device });
      }
      if (widthStr === '80') set({ paperWidth: 80 });
    } catch {
      // ignore
    }
  },
}));

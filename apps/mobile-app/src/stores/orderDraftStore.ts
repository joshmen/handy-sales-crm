import { create } from 'zustand';
import type Producto from '@/db/models/Producto';

export interface DraftItem {
  productoId: string;
  productoServerId: number | null;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  imagenUrl?: string;
  unidadNombre?: string;
}

interface OrderDraftState {
  clienteId: string | null;
  clienteServerId: number | null;
  clienteNombre: string;
  items: DraftItem[];
  notas: string;

  setCliente: (id: string, serverId: number | null, nombre: string) => void;
  addItem: (producto: Producto, cantidad?: number) => void;
  removeItem: (productoId: string) => void;
  updateQuantity: (productoId: string, cantidad: number) => void;
  setNotas: (notas: string) => void;
  reset: () => void;

  // Computed-like
  itemCount: () => number;
  subtotal: () => number;
  impuestos: () => number;
  total: () => number;
}

const IVA_RATE = 0.16;

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  clienteId: null,
  clienteServerId: null,
  clienteNombre: '',
  items: [],
  notas: '',

  setCliente: (id, serverId, nombre) =>
    set({ clienteId: id, clienteServerId: serverId, clienteNombre: nombre }),

  addItem: (producto, cantidad = 1) => {
    const items = get().items;
    const existing = items.find((i) => i.productoId === producto.id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            productoId: producto.id,
            productoServerId: producto.serverId,
            nombre: producto.nombre,
            precioUnitario: producto.precio,
            cantidad,
            imagenUrl: producto.imagenUrl ?? undefined,
            unidadNombre: producto.unidadMedidaNombre ?? undefined,
          },
        ],
      });
    }
  },

  removeItem: (productoId) =>
    set({ items: get().items.filter((i) => i.productoId !== productoId) }),

  updateQuantity: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(productoId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.productoId === productoId ? { ...i, cantidad } : i
      ),
    });
  },

  setNotas: (notas) => set({ notas }),

  reset: () =>
    set({ clienteId: null, clienteServerId: null, clienteNombre: '', items: [], notas: '' }),

  itemCount: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),
  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0),
  impuestos: () => get().subtotal() * IVA_RATE,
  total: () => get().subtotal() + get().impuestos(),
}));

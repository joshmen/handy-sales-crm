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
  clienteListaPreciosId: number | null;
  items: DraftItem[];
  notas: string;
  tipoVenta: number; // 0=Preventa, 1=VentaDirecta
  metodoPago: number; // 0=Efectivo, 1=Transferencia, 2=Cheque, 3=T.Crédito, 4=T.Débito, 5=Otro
  fromParadaId: string | null; // Track which route stop originated this order

  setCliente: (id: string, serverId: number | null, nombre: string, listaPreciosId?: number | null) => void;
  setFromParada: (paradaId: string | null) => void;
  addItem: (producto: Producto, cantidad?: number, precioOverride?: number) => void;
  removeItem: (productoId: string) => void;
  updateQuantity: (productoId: string, cantidad: number) => void;
  setNotas: (notas: string) => void;
  setTipoVenta: (tipoVenta: number) => void;
  setMetodoPago: (metodoPago: number) => void;
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
  clienteListaPreciosId: null,
  items: [],
  notas: '',
  tipoVenta: 0,
  metodoPago: 0,
  fromParadaId: null,

  setCliente: (id, serverId, nombre, listaPreciosId) =>
    set({ clienteId: id, clienteServerId: serverId, clienteNombre: nombre, clienteListaPreciosId: listaPreciosId ?? null }),

  setFromParada: (paradaId) => set({ fromParadaId: paradaId }),

  addItem: (producto, cantidad = 1, precioOverride) => {
    const items = get().items;
    const precio = precioOverride ?? producto.precio;
    const existing = items.find((i) => i.productoId === producto.id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad, precioUnitario: precio }
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
            precioUnitario: precio,
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

  setTipoVenta: (tipoVenta) => set({ tipoVenta }),

  setMetodoPago: (metodoPago) => set({ metodoPago }),

  reset: () =>
    set({ clienteId: null, clienteServerId: null, clienteNombre: '', clienteListaPreciosId: null, items: [], notas: '', tipoVenta: 0, metodoPago: 0, fromParadaId: null }),

  itemCount: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),
  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0),
  impuestos: () => get().subtotal() * IVA_RATE,
  total: () => get().subtotal() + get().impuestos(),
}));

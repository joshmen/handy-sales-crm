import { useState, useEffect } from 'react';
import { database } from '@/db/database';
import { Q } from '@nozbe/watermelondb';
import type PrecioPorProducto from '@/db/models/PrecioPorProducto';
import type Descuento from '@/db/models/Descuento';
import type Promocion from '@/db/models/Promocion';

/**
 * Resolves the final price for a product given a client's price list.
 * Falls back to base product price if no custom price exists.
 */
export function usePrecioCliente(
  listaPreciosId: number | null | undefined,
  productoServerId: number,
  precioBase: number,
) {
  const [precio, setPrecio] = useState(precioBase);
  const [tieneListaPrecios, setTieneListaPrecios] = useState(false);

  useEffect(() => {
    if (!listaPreciosId || !productoServerId) {
      setPrecio(precioBase);
      setTieneListaPrecios(false);
      return;
    }

    (async () => {
      try {
        const precios = await database
          .get<PrecioPorProducto>('precios_por_producto')
          .query(
            Q.and(
              Q.where('lista_precio_id', listaPreciosId),
              Q.where('producto_server_id', productoServerId),
              Q.where('activo', true),
            ),
          )
          .fetch();

        if (precios.length > 0) {
          setPrecio(precios[0].precio);
          setTieneListaPrecios(true);
        } else {
          setPrecio(precioBase);
          setTieneListaPrecios(false);
        }
      } catch {
        setPrecio(precioBase);
        setTieneListaPrecios(false);
      }
    })();
  }, [listaPreciosId, productoServerId, precioBase]);

  return { precio, tieneListaPrecios };
}

/**
 * Finds the best applicable quantity discount for a product.
 * Checks both product-specific and global discounts.
 */
export function useDescuentoPorCantidad(productoServerId: number, cantidad: number) {
  const [descuento, setDescuento] = useState<{
    porcentaje: number;
    cantidadMinima: number;
  } | null>(null);

  useEffect(() => {
    if (!productoServerId || cantidad <= 0) {
      setDescuento(null);
      return;
    }

    (async () => {
      try {
        const descuentos = await database
          .get<Descuento>('descuentos')
          .query(
            Q.and(
              Q.where('activo', true),
              Q.where('cantidad_minima', Q.lte(cantidad)),
              Q.or(
                Q.where('producto_server_id', productoServerId),
                Q.where('tipo_aplicacion', 'Global'),
              ),
            ),
          )
          .fetch();

        if (descuentos.length === 0) {
          setDescuento(null);
          return;
        }

        // Pick the best discount (highest percentage)
        const best = descuentos.reduce((prev, curr) =>
          curr.descuentoPorcentaje > prev.descuentoPorcentaje ? curr : prev,
        );

        setDescuento({
          porcentaje: best.descuentoPorcentaje,
          cantidadMinima: best.cantidadMinima,
        });
      } catch {
        setDescuento(null);
      }
    })();
  }, [productoServerId, cantidad]);

  return descuento;
}

/**
 * Finds active promotions that include a specific product.
 */
export function usePromocionActiva(productoServerId: number) {
  const [promo, setPromo] = useState<{
    nombre: string;
    porcentaje: number;
    fechaFin: Date;
  } | null>(null);

  useEffect(() => {
    if (!productoServerId) {
      setPromo(null);
      return;
    }

    (async () => {
      try {
        const now = Date.now();
        const promociones = await database
          .get<Promocion>('promociones')
          .query(
            Q.and(
              Q.where('activo', true),
              Q.where('fecha_inicio', Q.lte(now)),
              Q.where('fecha_fin', Q.gte(now)),
            ),
          )
          .fetch();

        // Filter promotions that include this product
        const matching = promociones.filter(p =>
          p.productoIds.includes(productoServerId),
        );

        if (matching.length > 0) {
          // Pick the best promotion (highest discount)
          const best = matching.reduce((prev, curr) =>
            curr.descuentoPorcentaje > prev.descuentoPorcentaje ? curr : prev,
          );
          setPromo({
            nombre: best.nombre,
            porcentaje: best.descuentoPorcentaje,
            fechaFin: best.fechaFin,
          });
        } else {
          setPromo(null);
        }
      } catch {
        setPromo(null);
      }
    })();
  }, [productoServerId]);

  return promo;
}

/**
 * Preloads all pricing data for a client into a lookup map.
 * More efficient than individual queries per product.
 */
export function usePricingMap(listaPreciosId: number | null | undefined) {
  const [priceMap, setPriceMap] = useState<Map<number, number>>(new Map());
  const [discountMap, setDiscountMap] = useState<Descuento[]>([]);
  const [promoMap, setPromoMap] = useState<Map<number, { nombre: string; porcentaje: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1. Price list prices
        const prices = new Map<number, number>();
        if (listaPreciosId) {
          const precios = await database
            .get<PrecioPorProducto>('precios_por_producto')
            .query(
              Q.and(
                Q.where('lista_precio_id', listaPreciosId),
                Q.where('activo', true),
              ),
            )
            .fetch();
          for (const p of precios) {
            prices.set(p.productoServerId, p.precio);
          }
        }
        setPriceMap(prices);

        // 2. All active discounts
        const descuentos = await database
          .get<Descuento>('descuentos')
          .query(Q.where('activo', true))
          .fetch();
        setDiscountMap(descuentos);

        // 3. Active promotions
        const now = Date.now();
        const promos = await database
          .get<Promocion>('promociones')
          .query(
            Q.and(
              Q.where('activo', true),
              Q.where('fecha_inicio', Q.lte(now)),
              Q.where('fecha_fin', Q.gte(now)),
            ),
          )
          .fetch();

        const pMap = new Map<number, { nombre: string; porcentaje: number }>();
        for (const promo of promos) {
          for (const pid of promo.productoIds) {
            const existing = pMap.get(pid);
            if (!existing || promo.descuentoPorcentaje > existing.porcentaje) {
              pMap.set(pid, { nombre: promo.nombre, porcentaje: promo.descuentoPorcentaje });
            }
          }
        }
        setPromoMap(pMap);
      } catch {
        // Fail silently — pricing is optional, fall back to base prices
      } finally {
        setLoading(false);
      }
    })();
  }, [listaPreciosId]);

  /**
   * Get the best price + discount info for a product
   */
  function getPricing(productoServerId: number, precioBase: number, cantidad: number) {
    // Price from list
    const precioLista = priceMap.get(productoServerId);
    const precioFinal = precioLista ?? precioBase;
    const tieneListaPrecios = precioLista !== undefined;

    // Best discount for this quantity
    const applicableDiscounts = discountMap.filter(
      d => d.activo &&
           d.cantidadMinima <= cantidad &&
           (d.productoServerId === productoServerId || d.tipoAplicacion === 'Global'),
    );
    const bestDiscount = applicableDiscounts.length > 0
      ? applicableDiscounts.reduce((prev, curr) =>
          curr.descuentoPorcentaje > prev.descuentoPorcentaje ? curr : prev,
        )
      : null;

    // Active promotion
    const promo = promoMap.get(productoServerId) ?? null;

    // Best discount between volume discount and promotion
    const descuentoVolumen = bestDiscount?.descuentoPorcentaje ?? 0;
    const descuentoPromo = promo?.porcentaje ?? 0;
    const mejorDescuento = Math.max(descuentoVolumen, descuentoPromo);

    const precioConDescuento = mejorDescuento > 0
      ? precioFinal * (1 - mejorDescuento / 100)
      : precioFinal;

    return {
      precioBase,
      precioLista: precioLista ?? null,
      precioFinal,
      tieneListaPrecios,
      descuentoVolumen: bestDiscount ? { porcentaje: bestDiscount.descuentoPorcentaje, cantidadMinima: bestDiscount.cantidadMinima } : null,
      promo,
      mejorDescuento,
      precioConDescuento,
    };
  }

  return { getPricing, loading };
}

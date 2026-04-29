'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Receipt, Star } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { Modal } from '@/components/ui/Modal';
import {
  impuestosService,
  TasaImpuesto,
  TasaImpuestoCreateRequest,
} from '@/services/api/impuestos';

/**
 * Tab Impuestos: CRUD del catálogo de TasasImpuesto del tenant. Permite crear
 * tasas distintas (IVA 16%, Frontera 8%, Tasa Cero, IEPS) y marcar UNA como
 * default — esa se aplica a productos que no especifican TasaImpuestoId.
 *
 * Bug 2026-04-28 lo trajo: el sistema asumía 16% hardcoded. Ahora el admin
 * gestiona las tasas vía esta UI sin tocar código.
 */
export function ImpuestosTab() {
  const showApiError = useApiErrorToast();
  const [tasas, setTasas] = useState<TasaImpuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TasaImpuesto | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TasaImpuestoCreateRequest>({
    nombre: '',
    tasa: 0.16,
    claveSat: '002',
    tipoImpuesto: 'Traslado',
    esDefault: false,
  });

  const [confirmDelete, setConfirmDelete] = useState<TasaImpuesto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTasas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await impuestosService.getTasas(showInactive);
      setTasas(data);
    } catch (err) {
      showApiError(err, 'Error al cargar tasas de impuesto');
    } finally {
      setLoading(false);
    }
  }, [showInactive, showApiError]);

  useEffect(() => { fetchTasas(); }, [fetchTasas]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', tasa: 0.16, claveSat: '002', tipoImpuesto: 'Traslado', esDefault: false });
    setIsFormOpen(true);
  };

  const openEdit = (t: TasaImpuesto) => {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      tasa: t.tasa,
      claveSat: t.claveSat,
      tipoImpuesto: t.tipoImpuesto,
      esDefault: t.esDefault,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (form.tasa < 0 || form.tasa > 1) {
      toast.error('La tasa debe estar entre 0 y 1 (ej. 0.16 para 16%)');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await impuestosService.updateTasa(editing.id, form);
        toast.success('Tasa actualizada');
      } else {
        await impuestosService.createTasa(form);
        toast.success('Tasa creada');
      }
      setIsFormOpen(false);
      await fetchTasas();
    } catch (err) {
      showApiError(err, 'Error al guardar tasa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await impuestosService.deleteTasa(confirmDelete.id);
      toast.success('Tasa eliminada');
      setConfirmDelete(null);
      await fetchTasas();
    } catch (err) {
      showApiError(err, 'Error al eliminar tasa');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-500" />
            Tasas de impuesto
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Gestiona las tasas que se aplican al cobrar pedidos. La tasa marcada como{' '}
            <strong>default</strong> se usa para productos que no especifican una.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
            />
            Mostrar inactivas
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva tasa
          </button>
        </div>
      </div>

      <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px_140px_80px_140px] items-center gap-3 bg-surface-1 px-4 h-10 border-b border-border-subtle">
          <div className="text-xs font-semibold text-foreground/70">Nombre</div>
          <div className="text-xs font-semibold text-foreground/70 text-right">Tasa</div>
          <div className="text-xs font-semibold text-foreground/70 text-center">SAT</div>
          <div className="text-xs font-semibold text-foreground/70 text-center">Tipo</div>
          <div className="text-xs font-semibold text-foreground/70 text-center">Productos</div>
          <div className="text-xs font-semibold text-foreground/70 text-center">Acciones</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : tasas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Receipt className="w-12 h-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground/80 mb-1">Aún no hay tasas configuradas</p>
            <p className="text-xs text-muted-foreground mb-3">
              Crea al menos una tasa default (típicamente IVA 16%) para que los productos calculen impuestos.
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva tasa
            </button>
          </div>
        ) : (
          tasas.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[1fr_100px_100px_140px_80px_140px] items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {t.esDefault && (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
                <span className="text-[13px] font-medium text-foreground truncate">{t.nombre}</span>
                {!t.activo && (
                  <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-3 text-foreground/60">
                    Inactiva
                  </span>
                )}
              </div>
              <div className="text-[13px] text-foreground/80 text-right">
                {(t.tasa * 100).toFixed(2)}%
              </div>
              <div className="text-[13px] text-foreground/70 text-center font-mono">{t.claveSat}</div>
              <div className="text-[13px] text-foreground/70 text-center">{t.tipoImpuesto}</div>
              <div className="text-[13px] text-foreground/70 text-center">{t.productosCount}</div>
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => openEdit(t)}
                  className="p-1 text-muted-foreground hover:text-amber-600 rounded"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(t)}
                  className="p-1 text-muted-foreground hover:text-red-600 rounded"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !saving && setIsFormOpen(false)}
        title={editing ? 'Editar tasa' : 'Nueva tasa de impuesto'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. IVA 16%, Frontera 8%, Tasa Cero"
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Tasa decimal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.tasa}
                onChange={(e) => setForm({ ...form, tasa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ej: 0.16 para 16%, 0.08 para 8%, 0.00 para exento
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Clave SAT
              </label>
              <select
                value={form.claveSat}
                onChange={(e) => setForm({ ...form, claveSat: e.target.value })}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="002">002 — IVA</option>
                <option value="003">003 — IEPS</option>
                <option value="001">001 — ISR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Tipo</label>
            <select
              value={form.tipoImpuesto}
              onChange={(e) => setForm({ ...form, tipoImpuesto: e.target.value })}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Traslado">Traslado (vendedor cobra al cliente)</option>
              <option value="Retencion">Retención (cliente retiene al vendedor)</option>
            </select>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.esDefault ?? false}
              onChange={(e) => setForm({ ...form, esDefault: e.target.checked })}
              className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Marcar como default</p>
              <p className="text-[11px] text-muted-foreground">
                Se aplicará a productos que no especifiquen una tasa. Solo una tasa puede ser default.
              </p>
            </div>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsFormOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear tasa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Eliminar tasa"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            ¿Eliminar la tasa <strong>{confirmDelete?.nombre}</strong>?
          </p>
          {(confirmDelete?.productosCount ?? 0) > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-900 dark:text-amber-200">
              Esta tasa la usan <strong>{confirmDelete?.productosCount}</strong> producto(s). Tras eliminarla,
              esos productos caerán al cálculo con la tasa default del tenant.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

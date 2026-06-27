'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Gift,
  Plus,
  RefreshCw,
  X,
  Send,
  Trash2,
  Check,
  Sparkles,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import {
  changelogAdminService,
  NovedadDto,
  CrearNovedadDto,
  TipoNovedad,
  EstadoNovedad,
  TIPO_NOVEDAD_OPTIONS,
} from '@/services/api/changelogAdmin';

// ============ HELPERS ============

function tipoLabel(tipo: number): string {
  switch (tipo) {
    case TipoNovedad.Nuevo:
      return 'Nuevo';
    case TipoNovedad.Mejora:
      return 'Mejora';
    case TipoNovedad.Fix:
      return 'Fix';
    default:
      return 'Sin datos';
  }
}

/** Variante de Badge por tipo de novedad (color). */
function tipoBadgeVariant(tipo: number): 'success' | 'info' | 'warning' | 'secondary' {
  switch (tipo) {
    case TipoNovedad.Nuevo:
      return 'success';
    case TipoNovedad.Mejora:
      return 'info';
    case TipoNovedad.Fix:
      return 'warning';
    default:
      return 'secondary';
  }
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return 'Sin datos';
  try {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Sin datos';
  }
}

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ============ PAGINA ============

export default function ChangelogPage() {
  const [novedades, setNovedades] = useState<NovedadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado por item: id en proceso (publicar) y confirmacion de borrado
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Formulario de creacion
  const [versionEtiqueta, setVersionEtiqueta] = useState('');
  const [tipo, setTipo] = useState<number>(TipoNovedad.Nuevo);
  const [fecha, setFecha] = useState(hoyISO());
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [audiencia, setAudiencia] = useState('');

  const fetchNovedades = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await changelogAdminService.getAll();
      setNovedades(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNovedades();
  }, [fetchNovedades]);

  // KPIs
  const total = novedades.length;
  const publicadas = useMemo(
    () => novedades.filter((n) => n.estado === EstadoNovedad.Publicado).length,
    [novedades]
  );
  const borradores = useMemo(
    () => novedades.filter((n) => n.estado === EstadoNovedad.Borrador).length,
    [novedades]
  );

  // Ordenadas por fecha desc
  const ordenadas = useMemo(
    () => [...novedades].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [novedades]
  );

  const resetForm = () => {
    setVersionEtiqueta('');
    setTipo(TipoNovedad.Nuevo);
    setFecha(hoyISO());
    setTitulo('');
    setDescripcion('');
    setAudiencia('');
    setFormError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleCreate = async () => {
    if (!versionEtiqueta.trim()) {
      setFormError('La etiqueta de versión es obligatoria.');
      return;
    }
    if (!titulo.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!descripcion.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (!fecha) {
      setFormError('La fecha es obligatoria.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const dto: CrearNovedadDto = {
        versionEtiqueta: versionEtiqueta.trim(),
        tipo,
        fecha: new Date(fecha).toISOString(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        audiencia: audiencia.trim() ? audiencia.trim() : null,
        estado: EstadoNovedad.Borrador,
      };
      await changelogAdminService.create(dto);
      setModalOpen(false);
      await fetchNovedades();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la novedad.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublicar = async (id: number) => {
    setPublishingId(id);
    try {
      await changelogAdminService.publicar(id);
      await fetchNovedades();
    } catch {
      // El estado de error general no aplica aqui; recargamos para reflejar estado real
      await fetchNovedades();
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await changelogAdminService.delete(id);
      setDeleteConfirmId(null);
      await fetchNovedades();
    } catch {
      await fetchNovedades();
    } finally {
      setDeletingId(null);
    }
  };

  const inputClasses =
    'w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-card';

  // --- Modal de creacion ---
  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Gift className="h-5 w-5 text-primary" />
            Nueva novedad
          </h2>
          <button
            onClick={closeModal}
            disabled={saving}
            className="p-2 hover:bg-surface-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Etiqueta de versión <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={versionEtiqueta}
                onChange={(e) => setVersionEtiqueta(e.target.value)}
                className={inputClasses}
                placeholder="v2.4.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(Number(e.target.value))}
                className={inputClasses}
              >
                {TIPO_NOVEDAD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClasses}
              placeholder="Nuevo panel de reportes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className={`${inputClasses} resize-none`}
              placeholder="Describe el cambio para los usuarios."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Audiencia
            </label>
            <input
              type="text"
              value={audiencia}
              onChange={(e) => setAudiencia(e.target.value)}
              className={inputClasses}
              placeholder="Todos los planes, Plan Pro, etc."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Opcional. Define quién verá esta novedad.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-3 justify-end">
          <Button variant="wbOutline" size="sm" onClick={closeModal} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="wbPrimary" size="sm" onClick={handleCreate} loading={saving}>
            Crear novedad
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <PageHeader
      section="superadmin"
      icon={Gift}
      title="Novedades"
      subtitle="Novedades y registro de cambios de la plataforma."
      actions={
        <>
          <Button variant="wbOutline" size="sm" onClick={fetchNovedades} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="wbPrimary" size="sm" onClick={openModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva novedad
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de novedades"
            value={loading ? 0 : total}
            tone="default"
            icon={Gift}
            loading={loading}
          />
          <StatCard
            label="Publicadas"
            value={loading ? 0 : publicadas}
            tone="success"
            icon={CheckCircle2}
            loading={loading}
          />
          <StatCard
            label="Borradores"
            value={loading ? 0 : borradores}
            tone="warning"
            icon={FileText}
            loading={loading}
          />
        </div>

        {/* Timeline / estados */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-pulse"
              >
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-4 w-full rounded bg-muted" />
                <div className="mt-1.5 h-4 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar las novedades"
            description="Ocurrió un error al obtener el registro de cambios. Intenta nuevamente."
            onRetry={fetchNovedades}
          />
        ) : ordenadas.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Aún no hay novedades"
            description="Crea la primera novedad para empezar a documentar los cambios de la plataforma."
            action={{ label: 'Nueva novedad', onClick: openModal }}
          />
        ) : (
          <ol className="relative ml-2 border-l border-border pl-6 space-y-6">
            {ordenadas.map((n) => {
              const esBorrador = n.estado === EstadoNovedad.Borrador;
              return (
                <li key={n.id} className="relative">
                  {/* Punto del timeline */}
                  <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-primary">
                    <Sparkles className="h-2 w-2 text-primary-foreground" aria-hidden="true" />
                  </span>

                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex px-2 py-0.5 text-xs font-mono font-semibold rounded-md border border-border-subtle text-foreground/70">
                        {n.versionEtiqueta || 'Sin datos'}
                      </span>
                      <Badge variant={tipoBadgeVariant(n.tipo)}>{tipoLabel(n.tipo)}</Badge>
                      <Badge variant={esBorrador ? 'secondary' : 'success'}>
                        {esBorrador ? 'Borrador' : 'Publicado'}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatFecha(n.fecha)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-foreground">
                      {n.titulo || 'Sin datos'}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                      {n.descripcion || 'Sin datos'}
                    </p>

                    {n.audiencia && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Audiencia:</span>{' '}
                        {n.audiencia}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
                      {esBorrador && (
                        <Button
                          variant="wbSoft"
                          size="sm"
                          onClick={() => handlePublicar(n.id)}
                          loading={publishingId === n.id}
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          Publicar
                        </Button>
                      )}

                      {deleteConfirmId === n.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">¿Eliminar?</span>
                          <Button
                            variant="wbDanger"
                            size="sm"
                            onClick={() => handleDelete(n.id)}
                            loading={deletingId === n.id}
                          >
                            {deletingId === n.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1.5" />
                                Confirmar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="wbOutline"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={deletingId === n.id}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="wbOutline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(n.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1.5 text-red-500" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {modalOpen && renderModal()}
    </PageHeader>
  );
}

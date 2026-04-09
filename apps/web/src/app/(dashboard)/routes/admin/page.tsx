'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routeService, RouteTemplate, RouteTemplateCreate, RouteTemplateUpdate, InstantiateTemplateRequest } from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Map,
  Navigation,
  Loader2,
  Copy,
  CalendarPlus,
  Route,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';

interface ZoneOption {
  id: number;
  name: string;
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

// --- Form schemas ---

const templateSchema = z.object({
  nombre: z.string().min(1, 'nameRequired').max(100),
  descripcion: z.string(),
  zonaId: z.number().nullable(),
  notas: z.string(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const assignSchema = z.object({
  usuarioId: z.number().min(1, 'selectVendor'),
  fecha: z.string().min(1, 'dateRequired'),
});

type AssignFormData = z.infer<typeof assignSchema>;

export default function RouteAdminPage() {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  // Data
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RouteTemplate | null>(null);
  const drawerRef = useRef<DrawerHandle>(null);

  // Assign modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState<RouteTemplate | null>(null);

  // Template form
  const {
    register,
    handleSubmit: rhfSubmit,
    reset: resetForm,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      zonaId: null,
      notas: '',
    },
  });

  // Assign form
  const {
    setValue: setAssignValue,
    handleSubmit: rhfAssignSubmit,
    reset: resetAssignForm,
    watch: watchAssign,
    formState: { errors: assignErrors },
  } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      usuarioId: 0,
      fecha: new Date().toISOString().split('T')[0],
    },
  });

  // --- Data fetching ---

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await routeService.getTemplates();
      setTemplates(data);
    } catch {
      toast.error(t('templates.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchZones = async () => {
    try {
      const response = await zoneService.getZones();
      setZones(response.zones.map(z => ({ id: parseInt(z.id), name: z.name })));
    } catch {
      console.error('Error al cargar zonas');
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/api/usuarios?pagina=1&tamanoPagina=500');
      const data = response.data;
      const items = Array.isArray(data) ? data : data.items || [];
      setUsuarios(items);
    } catch {
      console.error('Error al cargar usuarios');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchZones();
    fetchUsuarios();
  }, []);

  // --- Filtering ---

  const filteredTemplates = templates.filter(t => {
    const matchSearch =
      !searchTerm ||
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchZone =
      filterZone === 'all' ||
      (t.zonaId != null && t.zonaId.toString() === filterZone) ||
      (t.zonaNombre && zones.find(z => z.id.toString() === filterZone)?.name === t.zonaNombre);
    return matchSearch && matchZone;
  });

  // --- Drawer handlers ---

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    resetForm({
      nombre: '',
      descripcion: '',
      zonaId: null,
      notas: '',
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (template: RouteTemplate) => {
    setEditingTemplate(template);
    resetForm({
      nombre: template.nombre,
      descripcion: template.descripcion || '',
      zonaId: template.zonaId ?? null,
      notas: '',
    });
    setIsDrawerOpen(true);
  };

  const handleSubmitTemplate = async (data: TemplateFormData) => {
    try {
      setActionLoading(true);
      if (editingTemplate) {
        const updateData: RouteTemplateUpdate = {
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          zonaId: data.zonaId,
        };
        await routeService.updateTemplate(editingTemplate.id, updateData);
        toast.success(t('templates.templateUpdated'));
      } else {
        const createData: RouteTemplateCreate = {
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          zonaId: data.zonaId,
          notas: data.notas || undefined,
          esTemplate: true,
        };
        await routeService.createTemplate(createData);
        toast.success(t('templates.templateCreated'));
      }
      setIsDrawerOpen(false);
      fetchTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t('templates.errorSaving');
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Actions ---

  const handleDuplicate = async (template: RouteTemplate) => {
    try {
      setActionLoading(true);
      await routeService.duplicateTemplate(template.id);
      toast.success(t('templates.templateDuplicated'));
      fetchTemplates();
    } catch {
      toast.error(t('templates.errorDuplicating'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (template: RouteTemplate) => {
    if (!confirm(t('templates.confirmDelete', { name: template.nombre }))) return;
    try {
      setActionLoading(true);
      await routeService.deleteTemplate(template.id);
      toast.success(t('templates.templateDeleted'));
      fetchTemplates();
    } catch {
      toast.error(t('templates.errorDeleting'));
    } finally {
      setActionLoading(false);
    }
  };

  // --- Assign ---

  const handleOpenAssign = (template: RouteTemplate) => {
    setAssigningTemplate(template);
    resetAssignForm({
      usuarioId: 0,
      fecha: new Date().toISOString().split('T')[0],
    });
    setIsAssignOpen(true);
  };

  const handleAssign = async (data: AssignFormData) => {
    if (!assigningTemplate) return;
    try {
      setActionLoading(true);
      const req: InstantiateTemplateRequest = {
        usuarioId: data.usuarioId,
        fecha: `${data.fecha}T12:00:00.000Z`,
      };
      await routeService.instantiateTemplate(assigningTemplate.id, req);
      toast.success(t('templates.routeCreatedFromTemplate', { name: assigningTemplate.nombre }));
      setIsAssignOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e?.response?.data?.error || e?.message || t('templates.errorAssigning');
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Stats ---

  const totalTemplates = templates.length;
  const zonasCubiertas = new Set(templates.map(t => t.zonaNombre).filter(Boolean)).size;
  const totalParadas = templates.reduce((sum, t) => sum + t.totalParadas, 0);
  const distanciaPromedio =
    templates.length > 0
      ? Math.round(
          templates.reduce((sum, t) => sum + (t.kilometrosEstimados || 0), 0) / templates.length
        )
      : 0;

  // --- Zone options ---

  const zonaOptions = [
    { value: 'all' as string | number, label: 'Todas las zonas' },
    ...zones.map(z => ({ value: z.id.toString() as string | number, label: z.name })),
  ];

  const zonaFormOptions = zones.map(z => ({
    value: z.id as string | number,
    label: z.name,
  }));

  const usuarioOptions = usuarios.map(u => ({
    value: u.id as string | number,
    label: u.nombre,
  }));

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title'), href: '/routes' },
        { label: t('templates.title') },
      ]}
      title={t('templates.title')}
      subtitle={
        totalTemplates > 0
          ? `${totalTemplates} template${totalTemplates !== 1 ? 's' : ''}`
          : undefined
      }
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('templates.newTemplate')}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('templates.stats.templates')}</p>
                <p className="text-2xl font-bold">{totalTemplates}</p>
              </div>
              <Map size={24} className="text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('templates.stats.zonesCovered')}</p>
                <p className="text-2xl font-bold">{zonasCubiertas}</p>
              </div>
              <MapPin size={24} className="text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('templates.stats.totalStops')}</p>
                <p className="text-2xl font-bold">{totalParadas}</p>
              </div>
              <Users size={24} className="text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('templates.stats.avgDistance')}</p>
                <p className="text-2xl font-bold">
                  {distanciaPromedio > 0 ? `${distanciaPromedio} km` : '--'}
                </p>
              </div>
              <Navigation size={24} className="text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={t('templates.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="min-w-[180px]">
            <SearchableSelect
              options={zonaOptions}
              value={filterZone}
              onChange={val => setFilterZone(val ? String(val) : 'all')}
              placeholder="Todas las zonas"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Route className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {searchTerm || filterZone !== 'all'
                ? t('templates.noTemplatesFiltered')
                : t('templates.noTemplates')}
            </p>
            {!searchTerm && filterZone === 'all' && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {t('templates.createFirst')}
              </button>
            )}
          </div>
        )}

        {/* Template Cards */}
        {!loading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {template.nombre}
                      </h3>
                      {template.descripcion && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {template.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <MapPin size={15} className="mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">{t('templates.zone')}:</span>
                      <span className="ml-1.5 font-medium text-gray-700 truncate">
                        {template.zonaNombre || t('templates.noZone')}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Users size={15} className="mr-2 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">{t('templates.stops')}:</span>
                      <span className="ml-1.5 font-medium text-gray-700">
                        {template.totalParadas}
                      </span>
                    </div>
                    {template.kilometrosEstimados != null && template.kilometrosEstimados > 0 && (
                      <div className="flex items-center text-sm">
                        <Navigation size={15} className="mr-2 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-500">{t('templates.distance')}:</span>
                        <span className="ml-1.5 font-medium text-gray-700">
                          {template.kilometrosEstimados} km
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenAssign(template)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                      title="Asignar a vendedor"
                    >
                      <CalendarPlus size={14} />
                      {t('templates.assign')}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(template)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
                      title="Editar template"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Duplicar template"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      disabled={actionLoading}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 ml-auto"
                      title="Eliminar template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingTemplate ? t('templates.editTemplate') : t('templates.newTemplate')}
        isDirty={isDirty}
        width="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={rhfSubmit(handleSubmitTemplate)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTemplate ? t('templates.update') : t('templates.create')}
            </button>
          </div>
        }
      >
        <form onSubmit={rhfSubmit(handleSubmitTemplate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('columns.name')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre')}
              placeholder={t('templates.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {errors.nombre && (
              <FieldError message={errors.nombre?.message} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('templates.descriptionLabel')}</label>
            <textarea
              {...register('descripcion')}
              rows={3}
              placeholder={t('templates.descriptionPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('columns.zone')}</label>
            <SearchableSelect
              options={zonaFormOptions}
              value={watch('zonaId')}
              onChange={val => setValue('zonaId', val != null ? Number(val) : null, { shouldDirty: true })}
              placeholder={t('drawer.selectZone')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tc('notes')}</label>
            <textarea
              {...register('notas')}
              rows={2}
              placeholder={t('templates.notesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
          </div>
        </form>
      </Drawer>

      {/* Assign Modal */}
      {isAssignOpen && assigningTemplate && (
        <Modal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          title={t('templates.assignRoute')}
        >
          <form onSubmit={rhfAssignSubmit(handleAssign)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('templates.selectedTemplate')}
              </label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{assigningTemplate.nombre}</p>
                {assigningTemplate.descripcion && (
                  <p className="text-xs text-gray-500 mt-0.5">{assigningTemplate.descripcion}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {assigningTemplate.totalParadas} parada{assigningTemplate.totalParadas !== 1 ? 's' : ''}
                  {assigningTemplate.zonaNombre ? ` - ${assigningTemplate.zonaNombre}` : ''}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('drawer.vendor')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={usuarioOptions}
                value={watchAssign('usuarioId') || null}
                onChange={val => setAssignValue('usuarioId', val != null ? Number(val) : 0, { shouldDirty: true })}
                placeholder={t('drawer.selectVendor')}
                error={!!assignErrors.usuarioId}
              />
              {assignErrors.usuarioId && (
                <p className="text-xs text-red-500 mt-1">{assignErrors.usuarioId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('columns.date')} <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                mode="date"
                value={watchAssign('fecha')}
                onChange={val => setAssignValue('fecha', val, { shouldDirty: true })}
              />
              {assignErrors.fecha && (
                <p className="text-xs text-red-500 mt-1">{assignErrors.fecha.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {tc('cancel')}
              </button>
              <button
                type="submit"
                disabled={actionLoading || !watchAssign('usuarioId')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('templates.assignRoute')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageHeader>
  );
}

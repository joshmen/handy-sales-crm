'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientService } from '@/services/api/clients';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  clientSchema,
  ClientFormData,
  ClientFormInput,
  clientDefaultValues,
  mapFormToBackendDto,
  mapBackendErrorsToForm,
} from '@/lib/validations/client';

// Tipos para datos dinámicos
interface Zona {
  id: number;
  nombre: string;
}

interface CategoriaCliente {
  id: number;
  nombre: string;
}

interface ListaPrecios {
  id: number;
  nombre: string;
}


export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCliente[]>([]);
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);

  // React Hook Form con Zod
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: clientDefaultValues as ClientFormInput,
  });

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Cargar datos del cliente y catálogos
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadingData(true);

        // Cargar catálogos y cliente en paralelo
        const [zonasRes, categoriasRes, clientData] = await Promise.all([
          api.get<Zona[]>('/zonas').catch(() => ({ data: [] })),
          api.get<CategoriaCliente[]>('/categorias-clientes').catch(() => ({ data: [] })),
          clientService.getClientById(clientId),
        ]);

        setZonas(zonasRes.data);
        setCategorias(categoriasRes.data);
        setListasPrecios([
          { id: 1, nombre: 'Lista General' },
          { id: 2, nombre: 'Lista Mayoreo' },
        ]);

        // Mapear datos del cliente al formulario
        reset({
          habilitado: clientData.isActive,
          esProspecto: false,
          esClienteMovil: true,
          facturable: false,
          pedidosEnLinea: false,
          descripcion: clientData.name,
          categoriaId: clientData.categoryId?.toString() || '',
          comentarios: '',
          listaPreciosId: '',
          descuento: 0,
          saldo: 0,
          limiteCredito: 0,
          ventaMinimaEfectiva: 0,
          tiposPagoPermitidos: 'contado_credito',
          tipoPagoPredeterminado: 'contado',
          diasCredito: 0,
          rfc: clientData.code || '',
          direccion: clientData.address || '',
          ciudad: '',
          colonia: '',
          codigoPostal: '',
          zonaId: clientData.zoneId || 0,
          latitud: clientData.latitude || 0,
          longitud: clientData.longitude || 0,
          encargado: '',
          telefono: clientData.phone || '',
          email: clientData.email || '',
        });
      } catch (error) {
        console.error('Error cargando cliente:', error);
        setClientNotFound(true);
        toast.error('No se pudo cargar el cliente');
      } finally {
        setLoading(false);
        setLoadingData(false);
      }
    }

    if (clientId) {
      loadData();
    }
  }, [clientId, reset]);

  // Handle cancel with unsaved changes check
  const handleCancel = () => {
    if (isDirty) {
      if (confirm('¿Tienes cambios sin guardar. ¿Deseas salir?')) {
        router.push('/clients');
      }
    } else {
      router.push('/clients');
    }
  };

  // Manejar envío
  const onSubmit = async (formData: ClientFormInput) => {
    const data = formData as ClientFormData;
    try {
      setSaving(true);
      const dto = mapFormToBackendDto(data);
      console.log('Actualizando cliente:', dto);
      await clientService.updateClient(parseInt(clientId), dto);
      toast.success('Cliente actualizado exitosamente');
      router.push('/clients');
    } catch (error: unknown) {
      console.error('Error al actualizar cliente:', error);
      const apiError = error as {
        status?: number;
        validationErrors?: Record<string, string[]>;
        message?: string;
      };

      if (apiError.status === 400 && apiError.validationErrors) {
        const formErrors = mapBackendErrorsToForm(apiError.validationErrors);
        Object.entries(formErrors).forEach(([field, message]) => {
          setError(field as keyof ClientFormInput, { type: 'server', message });
        });
        const errorMessages = Object.values(apiError.validationErrors).flat();
        toast.error(errorMessages[0] || 'Por favor corrige los errores en el formulario');
      } else {
        toast.error(apiError.message || 'Error al actualizar el cliente');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="text-gray-600">Cargando cliente...</span>
          </div>
        </div>
    );
  }

  if (clientNotFound) {
    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente no encontrado</h2>
            <p className="text-gray-600 mb-4">El cliente que buscas no existe o no tienes acceso.</p>
            <button
              onClick={() => router.push('/clients')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Volver a clientes
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Header */}
        <div className="bg-white px-8 py-4 border-b border-gray-200">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Clientes', href: '/clients' },
            { label: 'Editar cliente' },
          ]} />

          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Editar cliente
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                className="flex items-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white text-[13px] font-semibold px-5 py-2 rounded disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
          <div className="flex gap-6">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-6">
              {/* === Información General === */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-[15px] font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Información general
                </h2>

                {/* Checkboxes Row */}
                <div className="flex flex-wrap items-center gap-5 mb-4">
                  <Checkbox name="habilitado" control={control} label="Activo" />
                  <Checkbox name="esProspecto" control={control} label="Es prospecto" />
                  <Checkbox name="esClienteMovil" control={control} label="Es cliente móvil" />
                  <Checkbox name="facturable" control={control} label="Facturable" />
                  <Checkbox name="pedidosEnLinea" control={control} label="Pedidos en línea" />
                </div>

                {/* Fields Row 1 */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <FormField label="Descripción" required error={errors.descripcion?.message}>
                    <input
                      type="text"
                      {...register('descripcion')}
                      className={inputClass(errors.descripcion)}
                    />
                  </FormField>
                </div>

                {/* Fields Row 2 */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Categoría" required error={errors.categoriaId?.message}>
                    <SearchableSelect
                      options={categorias.map(cat => ({ value: cat.id, label: cat.nombre }))}
                      value={watch('categoriaId') || null}
                      onChange={(val) => setValue('categoriaId', val ? String(val) : '', { shouldValidate: true })}
                      placeholder="Seleccionar categoría..."
                      searchPlaceholder="Buscar categoría..."
                      disabled={loadingData}
                      error={!!errors.categoriaId}
                    />
                  </FormField>
                  <FormField label="Comentarios">
                    <input type="text" {...register('comentarios')} className={inputClass()} />
                  </FormField>
                </div>
              </div>

              {/* === Precios y descuento === */}
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-[15px] font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Precios y descuento
                  </h2>
                  <span className="text-xs text-gray-400">(Opciones)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Lista de precios">
                    <SearchableSelect
                      options={listasPrecios.map(lp => ({ value: lp.id, label: lp.nombre }))}
                      value={watch('listaPreciosId') || null}
                      onChange={(val) => setValue('listaPreciosId', val ? String(val) : '', { shouldValidate: true })}
                      placeholder="Sin lista de precios asignada"
                      searchPlaceholder="Buscar lista..."
                    />
                  </FormField>
                  <FormField label="Descuento">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register('descuento', { valueAsNumber: true })}
                      className={inputClass()}
                    />
                  </FormField>
                </div>
              </div>

              {/* === Pago, venta y crédito === */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-[15px] font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Pago, venta y crédito
                </h2>

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Saldo">
                    <div className="relative">
                      <input
                        type="number"
                        {...register('saldo', { valueAsNumber: true })}
                        className={`${inputClass()} pr-8`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                    </div>
                  </FormField>
                  <FormField label="Límite de crédito">
                    <div className="relative">
                      <input
                        type="number"
                        {...register('limiteCredito', { valueAsNumber: true })}
                        className={`${inputClass()} pr-8`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                    </div>
                  </FormField>
                  <FormField label="Venta mínima efectiva" hint="Monto mínimo de venta para considerarse una visita efectiva">
                    <input
                      type="number"
                      {...register('ventaMinimaEfectiva', { valueAsNumber: true })}
                      className={inputClass()}
                    />
                  </FormField>
                </div>
              </div>

              {/* === Config entregas === */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-[15px] font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Configuraciones exclusivas para entregas
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField label="Tipos de pago permitidos">
                    <SearchableSelect
                      options={[
                        { value: 'contado_credito', label: 'Contado y crédito' },
                        { value: 'contado', label: 'Solo contado' },
                        { value: 'credito', label: 'Solo crédito' },
                      ]}
                      value={watch('tiposPagoPermitidos') || null}
                      onChange={(val) => setValue('tiposPagoPermitidos', val ? String(val) : 'contado_credito', { shouldValidate: true })}
                      placeholder="Seleccionar tipo de pago"
                    />
                  </FormField>
                  <FormField label="Tipo de pago predeterminado">
                    <SearchableSelect
                      options={[
                        { value: 'contado', label: 'Contado' },
                        { value: 'credito', label: 'Crédito' },
                      ]}
                      value={watch('tipoPagoPredeterminado') || null}
                      onChange={(val) => setValue('tipoPagoPredeterminado', val ? String(val) : 'contado', { shouldValidate: true })}
                      placeholder="Seleccionar tipo predeterminado"
                    />
                  </FormField>
                </div>

                <div className="w-[200px]">
                  <FormField label="Días de crédito">
                    <input
                      type="number"
                      min="0"
                      {...register('diasCredito', { valueAsNumber: true })}
                      className={inputClass()}
                    />
                  </FormField>
                </div>
              </div>

              {/* === Datos fiscales === */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-[15px] font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Datos fiscales
                </h2>

                <div className="max-w-md">
                  <FormField
                    label="RFC (RUC, RUT o ID)"
                    error={errors.rfc?.message}
                    hint="Opcional, 12-13 caracteres"
                  >
                    <input
                      type="text"
                      {...register('rfc')}
                      maxLength={13}
                      className={`${inputClass(errors.rfc)} uppercase`}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-[480px] flex flex-col gap-6">
              {/* === Dirección y geolocalización === */}
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Dirección y geolocalización
                  </h2>
                  <button type="button" className="text-[#16A34A] text-xs font-medium hover:underline">
                    Calcular longitud y latitud
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <FormField label="Dirección" required error={errors.direccion?.message}>
                    <input type="text" {...register('direccion')} className={inputClass(errors.direccion)} />
                  </FormField>

                  <div className="grid grid-cols-[1fr_1fr_100px] gap-3">
                    <FormField label="Ciudad">
                      <input type="text" {...register('ciudad')} className={inputClass()} />
                    </FormField>
                    <FormField label="Colonia">
                      <input type="text" {...register('colonia')} className={inputClass()} />
                    </FormField>
                    <FormField label="C. Postal">
                      <input type="text" {...register('codigoPostal')} className={inputClass()} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-[1fr_100px_100px] gap-3">
                    <FormField label="Zona" required error={errors.zonaId?.message}>
                      <SearchableSelect
                        options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
                        value={watch('zonaId') || null}
                        onChange={(val) => setValue('zonaId', val ? Number(val) : 0, { shouldValidate: true })}
                        placeholder="No hay selección"
                        searchPlaceholder="Buscar zona..."
                        disabled={loadingData}
                        error={!!errors.zonaId}
                      />
                    </FormField>
                    <FormField label="Latitud">
                      <input
                        type="number"
                        step="0.000001"
                        {...register('latitud', { valueAsNumber: true })}
                        className={inputClass()}
                      />
                    </FormField>
                    <FormField label="Longitud">
                      <input
                        type="number"
                        step="0.000001"
                        {...register('longitud', { valueAsNumber: true })}
                        className={inputClass()}
                      />
                    </FormField>
                  </div>

                  {/* Map Placeholder */}
                  <div className="h-[260px] bg-gray-200 rounded overflow-hidden relative">
                    <div className="absolute top-3 left-3 right-3">
                      <input
                        type="text"
                        placeholder="Escribir la dirección..."
                        className="w-full h-8 px-3 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-500 text-sm">Mapa de ubicación</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* === Datos de contacto === */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-[15px] font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Datos de contacto
                </h2>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Encargado">
                      <input type="text" {...register('encargado')} className={inputClass()} />
                    </FormField>
                    <FormField label="Teléfono" required error={errors.telefono?.message} hint="10 dígitos">
                      <input
                        type="tel"
                        {...register('telefono')}
                        maxLength={10}
                        className={inputClass(errors.telefono)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Email" required error={errors.email?.message}>
                    <input type="email" {...register('email')} className={inputClass(errors.email)} />
                  </FormField>

                  <p className="text-[11px] text-gray-400">
                    Podrás agregar uno o varios correos electrónicos después de guardar este cliente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
  );
}

// === Helper Components ===

function Checkbox({
  name,
  control,
  label,
}: {
  name: keyof ClientFormData;
  control: any;
  label: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div
            onClick={() => field.onChange(!field.value)}
            className={`w-4 h-4 rounded flex items-center justify-center ${
              field.value ? 'bg-[#16A34A]' : 'border border-gray-300 bg-white'
            }`}
          >
            {field.value && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <span className="text-[13px] text-gray-700">{label}</span>
        </label>
      )}
    />
  );
}

function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// === Style Helpers ===

function inputClass(error?: { message?: string }) {
  return `w-full h-9 px-3 text-[13px] border rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
    error ? 'border-red-500' : 'border-gray-300'
  }`;
}

function selectClass(error?: { message?: string }) {
  return `w-full h-9 px-3 text-[13px] border rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent appearance-none bg-white ${
    error ? 'border-red-500' : 'border-gray-300'
  }`;
}

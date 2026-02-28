'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { clientService } from '@/services/api/clients';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Loader2 } from 'lucide-react';
import { ClientLocationMap } from '@/components/maps/ClientLocationMap';
import type { ZoneGeo } from '@/components/maps/ClientLocationMap';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Checkbox, FormField, SectionTitle, inputClass } from '@/components/forms/ClientFormComponents';
import {
  clientSchema,
  ClientFormData,
  ClientFormInput,
  clientDefaultValues,
  mapFormToBackendDto,
  mapBackendErrorsToForm,
  REGIMEN_FISCAL_OPTIONS,
  USO_CFDI_OPTIONS,
} from '@/lib/validations/client';

// Tipos para datos dinámicos
interface Zona {
  id: number;
  nombre: string;
  centroLatitud?: number | null;
  centroLongitud?: number | null;
  radioKm?: number | null;
}

interface CategoriaCliente {
  id: number;
  nombre: string;
}

interface ListaPrecios {
  id: number;
  nombre: string;
}

const MAPS_LIBRARIES: ('places')[] = ['places'];

// Opciones de tipo de pago
const TIPOS_PAGO_OPTIONS = [
  { value: 'contado_credito', label: 'Contado y crédito' },
  { value: 'contado', label: 'Solo contado' },
  { value: 'credito', label: 'Solo crédito' },
];

const TIPO_PAGO_PREDETERMINADO_OPTIONS = [
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
];

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCliente[]>([]);
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isOutOfZone, setIsOutOfZone] = useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // React Hook Form con Zod
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: clientDefaultValues as ClientFormInput,
  });

  // Handle Google Places autocomplete
  const handlePlaceSelected = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place.formatted_address) {
      setValue('direccion', place.formatted_address, { shouldValidate: true });
    }
    if (place.geometry?.location) {
      setValue('latitud', place.geometry.location.lat());
      setValue('longitud', place.geometry.location.lng());
    }
    if (place.address_components) {
      for (const comp of place.address_components) {
        if (comp.types.includes('locality')) {
          setValue('ciudad', comp.long_name);
        }
        if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          setValue('colonia', comp.long_name);
        }
        if (comp.types.includes('postal_code')) {
          setValue('codigoPostal', comp.long_name);
        }
        if (comp.types.includes('street_number')) {
          setValue('numeroExterior', comp.long_name, { shouldValidate: true });
        }
      }
    }
  }, [setValue]);

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

  // Cargar datos al montar
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const [zonasRes, categoriasRes, listasRes] = await Promise.all([
          api.get<Zona[]>('/zonas').catch(() => ({ data: [] })),
          api.get<CategoriaCliente[]>('/categorias-clientes').catch(() => ({ data: [] })),
          api.get<ListaPrecios[]>('/listas-precios').catch(() => ({ data: [] })),
        ]);
        setZonas(zonasRes.data);
        setCategorias(categoriasRes.data);
        setListasPrecios(listasRes.data);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleCancel = () => {
    if (isDirty) {
      if (confirm('¿Tienes cambios sin guardar. ¿Deseas salir?')) {
        router.push('/clients');
      }
    } else {
      router.push('/clients');
    }
  };

  const onSubmit = async (formData: ClientFormInput) => {
    const data = formData as ClientFormData;
    try {
      setSaving(true);
      const dto = mapFormToBackendDto(data);
      await clientService.createClient(dto);
      toast.success('Cliente creado exitosamente');
      router.push('/clients');
    } catch (error: unknown) {
      console.error('Error al crear cliente:', error);
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
        toast.error(apiError.message || 'Error al crear el cliente');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white px-4 sm:px-8 py-4 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Clientes', href: '/clients' },
          { label: 'Crear cliente' },
        ]} />

        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Crear cliente
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
              disabled={saving || isOutOfZone}
              title={isOutOfZone ? 'El cliente está fuera de la zona asignada' : undefined}
              className="flex items-center gap-2 bg-[#16A34A] hover:bg-green-700 text-white text-[13px] font-semibold px-5 py-2 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* === Información General === */}
            <div className="bg-white rounded-lg p-6">
              <SectionTitle>Información general</SectionTitle>

              <div className="flex flex-wrap items-center gap-5 mb-4">
                <Checkbox name="habilitado" control={control} label="Activo" tooltip="Si está desactivado, el cliente no aparecerá en rutas, pedidos ni cobranza" />
                <Checkbox name="esProspecto" control={control} label="Es prospecto" tooltip="Cliente potencial que aún no ha realizado compras. Útil para seguimiento de ventas" />
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
                <FormField label="Nombre" required error={errors.descripcion?.message}>
                  <input
                    type="text"
                    {...register('descripcion')}
                    placeholder="Nombre del cliente o negocio"
                    className={inputClass(errors.descripcion)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <input type="text" {...register('comentarios')} className={inputClass()} placeholder="Notas internas sobre el cliente" />
                </FormField>
              </div>
            </div>

            {/* === Precios y descuento === */}
            <div className="bg-white rounded-lg p-6">
              <SectionTitle subtitle="Opcional">Precios y descuento</SectionTitle>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Lista de precios">
                  <SearchableSelect
                    options={listasPrecios.map(lp => ({ value: lp.id, label: lp.nombre }))}
                    value={watch('listaPreciosId') || null}
                    onChange={(val) => setValue('listaPreciosId', val ? String(val) : '', { shouldValidate: true })}
                    placeholder="Sin lista de precios asignada"
                    searchPlaceholder="Buscar lista..."
                  />
                </FormField>
                <FormField label="Descuento %" hint="Descuento general para este cliente">
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
              <SectionTitle>Pago, venta y crédito</SectionTitle>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Saldo" hint="Saldo actual del cliente">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                    <input
                      type="number"
                      {...register('saldo', { valueAsNumber: true })}
                      className={`${inputClass()} pl-7`}
                    />
                  </div>
                </FormField>
                <FormField label="Límite de crédito">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                    <input
                      type="number"
                      {...register('limiteCredito', { valueAsNumber: true })}
                      className={`${inputClass()} pl-7`}
                    />
                  </div>
                </FormField>
                <FormField label="Venta mín. efectiva" hint="Monto mínimo para visita efectiva">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">$</span>
                    <input
                      type="number"
                      {...register('ventaMinimaEfectiva', { valueAsNumber: true })}
                      className={`${inputClass()} pl-7`}
                    />
                  </div>
                </FormField>
              </div>
            </div>

            {/* === Config entregas === */}
            <div className="bg-white rounded-lg p-6">
              <SectionTitle>Configuración de entregas</SectionTitle>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <FormField label="Tipos de pago permitidos">
                  <SearchableSelect
                    options={TIPOS_PAGO_OPTIONS}
                    value={watch('tiposPagoPermitidos') || null}
                    onChange={(val) => setValue('tiposPagoPermitidos', (val ? String(val) : 'contado_credito') as ClientFormData['tiposPagoPermitidos'], { shouldValidate: true })}
                    placeholder="Seleccionar tipo de pago"
                  />
                </FormField>
                <FormField label="Tipo de pago predeterminado">
                  <SearchableSelect
                    options={TIPO_PAGO_PREDETERMINADO_OPTIONS}
                    value={watch('tipoPagoPredeterminado') || null}
                    onChange={(val) => setValue('tipoPagoPredeterminado', (val ? String(val) : 'contado') as ClientFormData['tipoPagoPredeterminado'], { shouldValidate: true })}
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
              <SectionTitle>Datos fiscales</SectionTitle>

              <div className="mb-4">
                <Checkbox name="facturable" control={control} label="Facturable" tooltip="Requiere factura fiscal CFDI 4.0. Al activar se solicitan los datos fiscales obligatorios del SAT" />
              </div>

              {watch('facturable') ? (
                <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Razón social" required error={errors.razonSocial?.message} hint="Nombre legal registrado ante el SAT">
                      <input
                        type="text"
                        {...register('razonSocial')}
                        maxLength={300}
                        className={inputClass(errors.razonSocial)}
                      />
                    </FormField>
                    <FormField label="RFC" required error={errors.rfc?.message} hint="12-13 caracteres">
                      <input
                        type="text"
                        {...register('rfc')}
                        maxLength={13}
                        className={`${inputClass(errors.rfc)} uppercase`}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="C.P. Fiscal" required error={errors.codigoPostalFiscal?.message} hint="Domicilio fiscal (5 dígitos)">
                      <input
                        type="text"
                        {...register('codigoPostalFiscal')}
                        maxLength={5}
                        placeholder="00000"
                        className={inputClass(errors.codigoPostalFiscal)}
                      />
                    </FormField>
                    <FormField label="Régimen fiscal" required error={errors.regimenFiscal?.message}>
                      <SearchableSelect
                        options={REGIMEN_FISCAL_OPTIONS.map(r => ({ value: r.value, label: r.label }))}
                        value={watch('regimenFiscal') || null}
                        onChange={(val) => setValue('regimenFiscal', val ? String(val) : '', { shouldValidate: true })}
                        placeholder="Seleccionar régimen..."
                        searchPlaceholder="Buscar régimen..."
                        error={!!errors.regimenFiscal}
                      />
                    </FormField>
                  </div>

                  <FormField label="Uso CFDI predeterminado" hint="Se usará como valor por defecto al facturar a este cliente">
                    <SearchableSelect
                      options={USO_CFDI_OPTIONS.map(u => ({ value: u.value, label: u.label }))}
                      value={watch('usoCFDIPredeterminado') || null}
                      onChange={(val) => setValue('usoCFDIPredeterminado', val ? String(val) : '', { shouldValidate: true })}
                      placeholder="Seleccionar uso CFDI..."
                      searchPlaceholder="Buscar uso..."
                    />
                  </FormField>
                </div>
              ) : (
                <p className="text-[12px] text-gray-400">
                  Activa la opción para capturar los datos fiscales del cliente (RFC, razón social, régimen fiscal)
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[480px] flex flex-col gap-6">
            {/* === Dirección y geolocalización === */}
            <div className="bg-white rounded-lg p-6">
              <SectionTitle>Dirección y geolocalización</SectionTitle>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <FormField label="Dirección" required error={errors.direccion?.message}>
                    {mapsLoaded ? (
                      <Autocomplete
                        onLoad={(ac) => { autocompleteRef.current = ac; }}
                        onPlaceChanged={handlePlaceSelected}
                        restrictions={{ country: 'mx' }}
                        fields={['formatted_address', 'geometry', 'address_components']}
                      >
                        <input
                          type="text"
                          {...register('direccion')}
                          placeholder="Escribe una dirección..."
                          className={inputClass(errors.direccion)}
                        />
                      </Autocomplete>
                    ) : (
                      <input type="text" {...register('direccion')} className={inputClass(errors.direccion)} />
                    )}
                  </FormField>
                  <FormField label="Num. Ext." required error={errors.numeroExterior?.message}>
                    <input
                      type="text"
                      {...register('numeroExterior')}
                      placeholder="123"
                      maxLength={20}
                      className={inputClass(errors.numeroExterior)}
                    />
                  </FormField>
                </div>

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
                      readOnly
                      className={`${inputClass()} bg-gray-50 text-gray-500 cursor-default`}
                    />
                  </FormField>
                  <FormField label="Longitud">
                    <input
                      type="number"
                      step="0.000001"
                      {...register('longitud', { valueAsNumber: true })}
                      readOnly
                      className={`${inputClass()} bg-gray-50 text-gray-500 cursor-default`}
                    />
                  </FormField>
                </div>

                <ClientLocationMap
                  lat={watch('latitud') || 0}
                  lng={watch('longitud') || 0}
                  onLocationChange={(lat, lng) => {
                    setValue('latitud', lat);
                    setValue('longitud', lng);
                  }}
                  selectedZone={zonas.find(z => z.id === watch('zonaId')) as ZoneGeo | undefined}
                  onOutOfZone={setIsOutOfZone}
                  autoGeolocate
                />
              </div>
            </div>

            {/* === Datos de contacto === */}
            <div className="bg-white rounded-lg p-6">
              <SectionTitle>Datos de contacto</SectionTitle>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Encargado" hint="Persona de contacto en el negocio">
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

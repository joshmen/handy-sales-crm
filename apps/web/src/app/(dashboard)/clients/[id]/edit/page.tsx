'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ClientForm } from '@/components/clients/ClientForm';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { mapFormToBackendDto, ClientFormData, ClientFormInput } from '@/lib/validations/client';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('clients.formPage');
  const tClients = useTranslations('clients');
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<ClientFormInput> | null>(null);

  useEffect(() => {
    async function loadClient() {
      try {
        const clientData = await clientService.getClientById(clientId);
        // Mapeo del DTO backend a los defaults del form. tiposPagoPermitidos +
        // tipoPagoPredeterminado se sanitizan contra el enum permitido (legacy data).
        const allowedTiposPago = ['contado_credito', 'contado', 'credito', 'efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'otro'];
        const allowedTipoPagoPred = ['contado', 'credito', 'efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'otro'];
        const tiposPagoIn = (clientData.tiposPagoPermitidos || '').toLowerCase();
        const tipoPagoPredIn = (clientData.tipoPagoPredeterminado || '').toLowerCase();

        setInitialValues({
          habilitado: clientData.isActive,
          esProspecto: clientData.esProspecto || false,
          descripcion: clientData.name,
          categoriaId: clientData.categoryId?.toString() || '',
          comentarios: clientData.comentarios || '',
          listaPreciosId: clientData.listaPreciosId?.toString() || '',
          descuento: clientData.descuento || 0,
          saldo: clientData.saldo || 0,
          limiteCredito: clientData.limiteCredito || 0,
          ventaMinimaEfectiva: clientData.ventaMinimaEfectiva || 0,
          tiposPagoPermitidos: (allowedTiposPago.includes(tiposPagoIn) ? tiposPagoIn : 'efectivo') as ClientFormData['tiposPagoPermitidos'],
          tipoPagoPredeterminado: (allowedTipoPagoPred.includes(tipoPagoPredIn) ? tipoPagoPredIn : 'efectivo') as ClientFormData['tipoPagoPredeterminado'],
          diasCredito: clientData.diasCredito || 0,
          facturable: clientData.facturable || false,
          rfc: clientData.code || '',
          razonSocial: clientData.razonSocial || '',
          codigoPostalFiscal: clientData.codigoPostalFiscal || '',
          regimenFiscal: clientData.regimenFiscal || '',
          usoCFDIPredeterminado: clientData.usoCFDIPredeterminado || '',
          direccion: clientData.address || '',
          numeroExterior: clientData.exteriorNumber || '',
          ciudad: clientData.ciudad || '',
          colonia: clientData.colonia || '',
          codigoPostal: clientData.codigoPostal || '',
          zonaId: clientData.zoneId || 0,
          vendedorId: clientData.vendedorId ?? null,
          latitud: clientData.latitude || 0,
          longitud: clientData.longitude || 0,
          encargado: clientData.encargado || '',
          telefono: clientData.phone || '',
          email: clientData.email || '',
        });
      } catch (error) {
        console.error('Error cargando cliente:', error);
        setClientNotFound(true);
        toast.error(t('errorLoadingClient'));
      } finally {
        setLoading(false);
      }
    }

    if (clientId) loadClient();
  }, [clientId, t]);

  const handleSubmit = async (data: ClientFormData) => {
    const dto = mapFormToBackendDto(data);
    await clientService.updateClient(parseInt(clientId), dto);
    toast.success(tClients('clientUpdated'));
    router.push('/clients');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-foreground/70">{t('loadingClient')}</span>
        </div>
      </div>
    );
  }

  if (clientNotFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('clientNotFound')}</h2>
          <p className="text-foreground/70 mb-4">{t('clientNotFoundMessage')}</p>
          <button
            onClick={() => router.push('/clients')}
            className="px-4 py-2 bg-success text-success-foreground rounded hover:bg-success/90"
          >
            {t('backToClients')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ClientForm
      mode="edit"
      initialValues={initialValues ?? undefined}
      onSubmit={handleSubmit}
      breadcrumbLabel={t('editClient')}
      pageTitle={t('editClient')}
      submitLabel={t('saveChangesButton')}
    />
  );
}

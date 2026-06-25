'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ClientForm } from '@/components/clients/ClientForm';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { mapFormToBackendDto, ClientFormData } from '@/lib/validations/client';

export default function NewClientPage() {
  const router = useRouter();
  const t = useTranslations('clients.formPage');
  const tClients = useTranslations('clients');

  const handleSubmit = async (data: ClientFormData) => {
    const dto = mapFormToBackendDto(data);
    const created = await clientService.createClient(dto);
    router.push('/clients');
    // Toast con acción "Ver": navega al cliente recién creado (el toast persiste al navegar).
    toast.view(tClients('clientCreated'), '', '', () => router.push(`/clients/${created.id}`));
  };

  return (
    <ClientForm
      mode="create"
      onSubmit={handleSubmit}
      breadcrumbLabel={t('createClient')}
      pageTitle={t('createClient')}
      submitLabel={t('saveButton')}
    />
  );
}

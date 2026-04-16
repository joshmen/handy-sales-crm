'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Loader2, Cloud } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function QuickMigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);
  const t = useTranslations('adminMigration');

  const handleMigration = async () => {
    setIsMigrating(true);

    interface MigrationResponse {
      message: string;
    }

    try {
      const response = await api.post<MigrationResponse>(
        '/api/migration/initialize-existing-tenants'
      );

      toast({
        title: t('migrationComplete'),
        description: response.data.message,
      });
    } catch (error) {
      console.error('Error en migración:', error);
      toast({
        title: t('migrationError'),
        description: t('couldNotCompleteInit'),
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Button
      onClick={handleMigration}
      disabled={isMigrating}
      className="bg-orange-600 hover:bg-orange-700 text-white"
    >
      {isMigrating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Cloud className="h-4 w-4 mr-2" />
      )}
      {t('initCloudinary')}
    </Button>
  );
}

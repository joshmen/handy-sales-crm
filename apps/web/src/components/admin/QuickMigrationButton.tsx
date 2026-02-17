'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Loader2, Cloud } from 'lucide-react';

export function QuickMigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);

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
        title: 'Migración completada',
        description: response.data.message,
      });

      console.log('Resultados de migración:', response.data);
    } catch (error) {
      console.error('Error en migración:', error);
      toast({
        title: 'Error en la migración',
        description: 'No se pudo completar la inicialización. Ver consola.',
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
      Inicializar Cloudinary (Una vez)
    </Button>
  );
}

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { impersonationService } from '@/services/api/impersonation';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { toast } from '@/hooks/useToast';
import {
  AlertTriangle,
  Building2,
  Eye,
  Edit,
  Loader2,
  Shield,
  FileText,
} from 'lucide-react';

interface Tenant {
  id: number;
  nombre: string;
  logoUrl?: string;
}

interface ImpersonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

/**
 * Modal para iniciar una sesión de impersonación.
 * Requiere justificación obligatoria y muestra advertencias de auditoría.
 */
export function ImpersonationModal({ isOpen, onClose, tenant }: ImpersonationModalProps) {
  const [reason, setReason] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [accessLevel, setAccessLevel] = useState<'READ_ONLY' | 'READ_WRITE'>('READ_ONLY');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  const { startImpersonation } = useImpersonationStore();

  const handleStart = async () => {
    if (!tenant) return;

    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar una justificación',
        variant: 'destructive',
      });
      return;
    }

    if (reason.trim().length < 20) {
      toast({
        title: 'Error',
        description: 'La justificación debe tener al menos 20 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (!agreedToPolicy) {
      toast({
        title: 'Error',
        description: 'Debes aceptar la política de impersonación',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await impersonationService.startSession({
        targetTenantId: tenant.id,
        reason: reason.trim(),
        ticketNumber: ticketNumber.trim() || undefined,
        accessLevel,
      });

      // Guardar en el store
      startImpersonation(
        response.sessionId,
        { id: tenant.id, name: tenant.nombre, logoUrl: tenant.logoUrl },
        accessLevel,
        new Date(response.expiresAt),
        response.impersonationToken,
        '' // El token original se guardará desde el contexto de auth
      );

      toast({
        title: 'Sesión iniciada',
        description: `Ahora estás viendo la cuenta de ${tenant.nombre}`,
      });

      onClose();

      // Recargar para aplicar el nuevo contexto
      window.location.href = '/dashboard';
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo iniciar la sesión',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setTicketNumber('');
    setAccessLevel('READ_ONLY');
    setAgreedToPolicy(false);
    onClose();
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Iniciar Sesión de Soporte
          </DialogTitle>
          <DialogDescription>
            Accederás temporalmente a la cuenta del cliente para brindar soporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Advertencia */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>Todas las acciones serán registradas</li>
                  <li>El cliente será notificado de este acceso</li>
                  <li>La sesión expira en 60 minutos</li>
                  <li>Solo accede a la información necesaria</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info del tenant */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{tenant.nombre}</p>
              <p className="text-sm text-gray-500">ID: {tenant.id}</p>
            </div>
          </div>

          {/* Nivel de acceso */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nivel de acceso</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccessLevel('READ_ONLY')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  accessLevel === 'READ_ONLY'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Eye className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium text-sm">Solo lectura</p>
                  <p className="text-xs text-gray-500">Recomendado</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAccessLevel('READ_WRITE')}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  accessLevel === 'READ_WRITE'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Edit className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium text-sm">Lectura/Escritura</p>
                  <p className="text-xs text-gray-500">Requiere justificación</p>
                </div>
              </button>
            </div>
          </div>

          {/* Justificación */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Justificación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe el motivo del acceso (mínimo 20 caracteres)..."
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500">{reason.length}/20 caracteres mínimos</p>
          </div>

          {/* Número de ticket */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Número de ticket (opcional)
            </label>
            <Input
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="Ej: TICKET-12345"
            />
          </div>

          {/* Aceptar política */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={(e) => setAgreedToPolicy(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Confirmo que este acceso cumple con la{' '}
              <a
                href="/docs/impersonation-policy"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                Política de Impersonación
              </a>{' '}
              y que entiendo que todas mis acciones serán auditadas.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleStart}
            disabled={isLoading || !agreedToPolicy || reason.trim().length < 20}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Sesión de Soporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

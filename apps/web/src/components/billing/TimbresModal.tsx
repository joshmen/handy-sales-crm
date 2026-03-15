'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SbBilling, SbSubscription } from '@/components/layout/DashboardIcons';

interface TimbresModalProps {
  open: boolean;
  onClose: () => void;
  errorMessage: string;
}

/**
 * Reusable modal for timbres/billing errors.
 * Two states based on the backend error message:
 *   1. "no incluye" → Plan doesn't include billing → Upgrade CTA
 *   2. Otherwise → Timbres exhausted → Buy more CTA
 */
export function TimbresModal({ open, onClose, errorMessage }: TimbresModalProps) {
  if (!open) return null;

  const isNoPlan = errorMessage.includes('no incluye');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 flex items-center justify-center">
            {isNoPlan ? <SbSubscription size={56} /> : <SbBilling size={56} />}
          </div>
        </div>

        {isNoPlan ? (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Tu plan no incluye facturación
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/subscription">
                <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl">
                  Actualizar plan &rarr;
                </Button>
              </Link>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Timbres agotados
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5 leading-relaxed">
              {errorMessage}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              Los timbres se renuevan cada mes. También puedes comprar paquetes adicionales.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/subscription/buy-timbres">
                <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl">
                  Comprar timbres adicionales &rarr;
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="outline" className="w-full h-11 rounded-xl">
                  Ver mi plan
                </Button>
              </Link>
              <button
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

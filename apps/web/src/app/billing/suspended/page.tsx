'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CreditCard, Mail, Phone, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function SuspendedPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const t = useTranslations('billingSuspended');

  const handleReactivate = async () => {
    setIsProcessing(true);
    toast({
      title: t('processingPayment'),
      description: t('redirectingToPayment'),
    });

    // TODO: Integrar con sistema de pago real
    setTimeout(() => {
      toast({
        title: t('paymentProcessed'),
        description: t('membershipReactivated'),
      });
      window.location.href = '/dashboard';
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>

          <p className="text-lg text-foreground/70">
            {t('subtitle')}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">{t('whySuspendedTitle')}</h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>{t('reason1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>{t('reason2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-1">•</span>
              <span>{t('reason3')}</span>
            </li>
          </ul>
        </div>

        <div className="bg-surface-2 border rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">{t('subscriptionDetails')}</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground/70">{t('currentPlan')}</span>
              <span className="font-medium">Pro - $899 MXN/mes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">{t('lastPayment')}</span>
              <span className="font-medium">15 de diciembre, 2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">{t('amountDue')}</span>
              <span className="font-bold text-red-600">$899 MXN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">{t('suspensionDate')}</span>
              <span className="font-medium">8 de enero, 2025</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleReactivate}
            disabled={isProcessing}
            className="w-full bg-success hover:bg-success/90"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-r-transparent" />
                {t('processing')}
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                {t('payAndReactivate')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => (window.location.href = '/billing/payment-methods')}
          >
            {t('updatePaymentMethod')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t">
          <h4 className="font-medium text-foreground mb-3">{t('needHelp')}</h4>
          <div className="space-y-2 text-sm">
            <a
              href="mailto:soporte@handysuites.com"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Mail className="h-4 w-4" />
              soporte@handysuites.com
            </a>
            <a
              href="tel:+526611234567"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Phone className="h-4 w-4" />
              +52 661 123 4567
            </a>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {t('businessHours')}
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>{t('importantNotice')}</strong> {t('dataRetentionNotice')}
          </p>
        </div>
      </Card>
    </div>
  );
}

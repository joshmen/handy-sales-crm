'use client';

import Link from 'next/link';
import { ShieldWarning, ArrowLeft, Buildings } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

export default function AccessDeniedPage() {
  const t = useTranslations('admin.accessDenied');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-surface-2 rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 max-w-lg w-full">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <ShieldWarning size={32} className="text-amber-600" weight="duotone" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-500 mb-2">
          {t('description')}
        </p>
        <p className="text-sm text-gray-400 mb-8" dangerouslySetInnerHTML={{ __html: t('impersonateHint') }} />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/system-dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            {t('goToDashboard')}
          </Link>
          <Link
            href="/admin/tenants"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-surface-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-surface-1 transition-colors text-sm font-medium"
          >
            <Buildings size={18} />
            {t('viewCompanies')}
          </Link>
        </div>
      </div>
    </div>
  );
}

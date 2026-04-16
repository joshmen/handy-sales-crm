'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AutocompleteDropdown } from './SatAutocomplete';
import { searchCatalogoProdServ, searchCatalogoUnidad } from '@/services/api/billing';
import type { DefaultsFiscalesTenant, CatalogoProdServItem, CatalogoUnidadItem } from '@/types/billing';

interface DefaultsPanelProps {
  defaults: DefaultsFiscalesTenant;
  savingDefaults: boolean;
  defaultsEditProdServ: boolean;
  defaultsEditUnidad: boolean;
  onDefaultsChange: (updater: (prev: DefaultsFiscalesTenant) => DefaultsFiscalesTenant) => void;
  onSetDefaultsEditProdServ: (value: boolean) => void;
  onSetDefaultsEditUnidad: (value: boolean) => void;
  onSaveDefaults: () => void;
}

export function DefaultsPanel({
  defaults,
  savingDefaults,
  defaultsEditProdServ,
  defaultsEditUnidad,
  onDefaultsChange,
  onSetDefaultsEditProdServ,
  onSetDefaultsEditUnidad,
  onSaveDefaults,
}: DefaultsPanelProps) {
  const t = useTranslations('billing.fiscalMapping');

  return (
    <div className="mb-6 bg-card border border-border rounded-xl p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">{t('defaultsTitle')}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        {t('defaultsDesc')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Default ProdServ */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('defaultProdServLabel')}
          </label>
          {defaultsEditProdServ ? (
            <AutocompleteDropdown<CatalogoProdServItem>
              value={defaults.claveProdServDefault}
              onSelect={item => {
                onDefaultsChange(prev => ({ ...prev, claveProdServDefault: item.clave }));
                onSetDefaultsEditProdServ(false);
              }}
              onClose={() => onSetDefaultsEditProdServ(false)}
              searchFn={searchCatalogoProdServ}
              renderLabel={item => item.descripcion}
              placeholder={t('searchProdServ')}
            />
          ) : (
            <button
              onClick={() => onSetDefaultsEditProdServ(true)}
              className="w-full text-left px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:border-green-500 transition-colors"
            >
              {defaults.claveProdServDefault ? (
                <span className="font-mono">{defaults.claveProdServDefault}</span>
              ) : (
                <span className="text-muted-foreground">{t('clickToSelect')}</span>
              )}
            </button>
          )}
        </div>

        {/* Default Unidad */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('defaultUnitLabel')}
          </label>
          {defaultsEditUnidad ? (
            <AutocompleteDropdown<CatalogoUnidadItem>
              value={defaults.claveUnidadDefault}
              onSelect={item => {
                onDefaultsChange(prev => ({ ...prev, claveUnidadDefault: item.clave }));
                onSetDefaultsEditUnidad(false);
              }}
              onClose={() => onSetDefaultsEditUnidad(false)}
              searchFn={searchCatalogoUnidad}
              renderLabel={item => item.nombre}
              placeholder={t('searchUnit')}
            />
          ) : (
            <button
              onClick={() => onSetDefaultsEditUnidad(true)}
              className="w-full text-left px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:border-green-500 transition-colors"
            >
              {defaults.claveUnidadDefault ? (
                <span className="font-mono">{defaults.claveUnidadDefault}</span>
              ) : (
                <span className="text-muted-foreground">{t('clickToSelect')}</span>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={onSaveDefaults}
          disabled={savingDefaults}
          className="bg-success hover:bg-success/90 text-white"
        >
          {savingDefaults && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('saveDefaults')}
        </Button>
      </div>
    </div>
  );
}

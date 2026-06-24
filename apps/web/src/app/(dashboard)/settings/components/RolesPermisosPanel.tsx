'use client';

// RolesPermisosPanel — matriz de roles × permisos (PRESENTACIÓN).
// PENDIENTE BACKEND: el modelo real de permisos lo define el backend; esta matriz
// refleja la intención. roleService.ts solo expone CRUD básico de roles hoy.

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Minus, ShieldCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { toast } from '@/hooks/useToast';

const ROLES = ['Administrador', 'Supervisor', 'Vendedor', 'Almacenista'] as const;

type Cell = 'yes' | 'own' | 'no';

interface PermRow {
  label: string;
  cells: [Cell, Cell, Cell, Cell];
}
interface PermArea {
  area: string;
  perms: PermRow[];
}

const MATRIX: PermArea[] = [
  {
    area: 'Ventas',
    perms: [
      { label: 'Ver pedidos', cells: ['yes', 'yes', 'own', 'no'] },
      { label: 'Crear y editar pedidos', cells: ['yes', 'yes', 'yes', 'no'] },
      { label: 'Cancelar pedidos', cells: ['yes', 'yes', 'no', 'no'] },
      { label: 'Registrar cobranza', cells: ['yes', 'yes', 'own', 'no'] },
    ],
  },
  {
    area: 'Catálogo y clientes',
    perms: [
      { label: 'Ver clientes', cells: ['yes', 'yes', 'own', 'no'] },
      { label: 'Editar productos', cells: ['yes', 'no', 'no', 'yes'] },
      { label: 'Listas de precios y descuentos', cells: ['yes', 'yes', 'no', 'no'] },
    ],
  },
  {
    area: 'Inventario y rutas',
    perms: [
      { label: 'Ver inventario', cells: ['yes', 'yes', 'no', 'yes'] },
      { label: 'Ajustes de inventario', cells: ['yes', 'no', 'no', 'yes'] },
      { label: 'Asignar rutas', cells: ['yes', 'yes', 'no', 'no'] },
      { label: 'Carga y liquidación de reparto', cells: ['yes', 'yes', 'no', 'yes'] },
    ],
  },
  {
    area: 'Administración',
    perms: [
      { label: 'Configuración del sistema', cells: ['yes', 'no', 'no', 'no'] },
      { label: 'Usuarios y roles', cells: ['yes', 'no', 'no', 'no'] },
      { label: 'Reportes', cells: ['yes', 'yes', 'no', 'no'] },
      { label: 'Facturación', cells: ['yes', 'no', 'no', 'no'] },
    ],
  },
];

function CellMark({ value }: { value: Cell }) {
  if (value === 'yes') {
    return (
      <span className="inline-flex items-center justify-center text-green-600 dark:text-green-400" aria-label="Permitido">
        <Check size={17} />
      </span>
    );
  }
  if (value === 'own') {
    return <SoftBadge tone="warning" dot={false}>Propio</SoftBadge>;
  }
  return (
    <span className="inline-flex items-center justify-center text-muted-foreground/50" aria-label="Sin acceso">
      <Minus size={15} />
    </span>
  );
}

export function RolesPermisosPanel() {
  const t = useTranslations('settings');
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Roles y permisos</h3>
            <p className="text-xs text-muted-foreground">Qué puede hacer cada rol en la plataforma.</p>
          </div>
        </div>
        <Button
          variant="wbPrimary"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={() => toast.success(t('comingSoonCustomRoles'))}
        >
          <Plus size={14} /> Rol personalizado
        </Button>
      </div>

      {/* Matriz */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Permiso
              </th>
              {ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((area) => (
              <React.Fragment key={area.area}>
                <tr className="bg-muted/40">
                  <td colSpan={ROLES.length + 1} className="px-5 py-2 text-xs font-semibold text-foreground/80">
                    {area.area}
                  </td>
                </tr>
                {area.perms.map((perm) => (
                  <tr key={perm.label} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-2.5 text-sm text-foreground">{perm.label}</td>
                    {perm.cells.map((c, i) => (
                      <td key={i} className="px-4 py-2.5 text-center">
                        <div className="flex justify-center">
                          <CellMark value={c} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border p-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Check size={15} className="text-green-600 dark:text-green-400" /> Permitido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <SoftBadge tone="warning" dot={false}>Propio</SoftBadge> Solo sus registros
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Minus size={14} className="text-muted-foreground/50" /> Sin acceso
        </span>
      </div>
    </div>
  );
}

'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Users, Smartphone, Shield, Loader2 } from 'lucide-react';

import { MiembrosTab } from './components/MiembrosTab';
import { DispositivosTab } from './components/DispositivosTab';
import { RolesTab } from './components/RolesTab';

function TeamPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userRole = session?.user?.role || 'VENDEDOR';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const activeTab = searchParams.get('tab') || 'miembros';

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Equipo' },
      ]}
      title="Equipo"
      subtitle="Gestiona miembros, dispositivos y roles de tu equipo"
    >
      <Tabs
        value={activeTab}
        onValueChange={value => {
          const params = new URLSearchParams(searchParams);
          params.set('tab', value);
          router.push(`/team?${params.toString()}`, { scroll: false });
        }}
        className="space-y-6"
      >
        <TabsList aria-label="Secciones de Equipo" className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="miembros" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Miembros
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="dispositivos" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Dispositivos
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="miembros" className="space-y-6">
          <MiembrosTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="dispositivos" className="space-y-6">
            <DispositivosTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="roles" className="space-y-6">
            <RolesTab />
          </TabsContent>
        )}
      </Tabs>
    </PageHeader>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div role="status" className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" /><span className="sr-only">Cargando...</span></div>}>
      <TeamPageContent />
    </Suspense>
  );
}

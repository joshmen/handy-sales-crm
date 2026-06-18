import { useAuthStore } from '@/stores';
import { VendedorDashboard, SupervisorDashboard, AdminDashboard } from '@/components/dashboard';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PlataformaDashboard } from '@/components/admin/PlataformaDashboard';

function HoyScreenContent() {
  const role = useAuthStore(s => s.user?.role);

  // Super admin: dashboard de salud de plataforma (agregado, READ-ONLY). No
  // impersona tenants desde el móvil; el drill-down por empresa vive en la web.
  if (role === 'SUPER_ADMIN') return <PlataformaDashboard />;
  if (role === 'SUPERVISOR') return <SupervisorDashboard />;
  if (role === 'ADMIN') return <AdminDashboard />;
  return <VendedorDashboard />;
}

export default function HoyScreen() {
  return (
    <ErrorBoundary componentName="TabHoy">
      <HoyScreenContent />
    </ErrorBoundary>
  );
}

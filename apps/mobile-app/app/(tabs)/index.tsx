import { useAuthStore } from '@/stores';
import { VendedorDashboard, SupervisorDashboard, AdminDashboard } from '@/components/dashboard';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { EmpresasPicker } from '@/components/admin/EmpresasPicker';

function HoyScreenContent() {
  const role = useAuthStore(s => s.user?.role);
  const impersonation = useAuthStore(s => s.impersonation);

  // Super admin: sin empresa elegida ve el picker de Empresas (como en la web);
  // al entrar a una (impersonation) ve el AdminDashboard de ESE tenant.
  if (role === 'SUPER_ADMIN') {
    return impersonation ? <AdminDashboard /> : <EmpresasPicker />;
  }
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

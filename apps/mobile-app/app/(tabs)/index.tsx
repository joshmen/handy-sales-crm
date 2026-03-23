import { useAuthStore } from '@/stores';
import { VendedorDashboard, SupervisorDashboard, AdminDashboard } from '@/components/dashboard';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function HoyScreenContent() {
  const role = useAuthStore(s => s.user?.role);

  if (role === 'SUPERVISOR') return <SupervisorDashboard />;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <AdminDashboard />;
  return <VendedorDashboard />;
}

export default function HoyScreen() {
  return (
    <ErrorBoundary componentName="TabHoy">
      <HoyScreenContent />
    </ErrorBoundary>
  );
}

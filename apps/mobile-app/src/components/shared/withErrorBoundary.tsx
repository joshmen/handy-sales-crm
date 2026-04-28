import { ComponentType } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * HOC que envuelve una pantalla con ErrorBoundary. Útil para flujos críticos
 * (vender, cobrar, ruta) donde un crash sin captura deja al vendedor en una
 * pantalla blanca y le hace perder el progreso del pedido/cobro.
 *
 * Uso: `export default withErrorBoundary(MiPantalla, 'MiPantalla');`
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  componentName: string,
): ComponentType<P> {
  function Wrapped(props: P) {
    return (
      <ErrorBoundary componentName={componentName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  Wrapped.displayName = `withErrorBoundary(${componentName})`;
  return Wrapped;
}

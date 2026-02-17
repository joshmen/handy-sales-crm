import { useState, useEffect, useRef } from 'react';

interface UseAsyncTableStateOptions {
  /**
   * Tiempo mínimo de loading para evitar flashes (en ms)
   * @default 300
   */
  minLoadingTime?: number;
  
  /**
   * Mantener datos anteriores mientras carga los nuevos
   * @default true
   */
  keepPreviousData?: boolean;
  
  /**
   * Deshabilitar loading state (útil para testing)
   * @default false
   */
  disableLoading?: boolean;
}

export function useAsyncTableState<T>(
  data: T,
  loading: boolean,
  options: UseAsyncTableStateOptions = {}
) {
  const {
    minLoadingTime = 300,
    keepPreviousData = true,
    disableLoading = false
  } = options;

  const [displayData, setDisplayData] = useState<T>(data);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const loadingStartTime = useRef<number | null>(null);
  const minTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (disableLoading) {
      setDisplayData(data);
      setIsTransitioning(false);
      return;
    }

    if (loading) {
      // Comenzar loading state
      if (!loadingStartTime.current) {
        loadingStartTime.current = Date.now();
        setIsTransitioning(true);
      }
    } else {
      // Datos listos
      const finishLoading = () => {
        setDisplayData(data);
        setIsTransitioning(false);
        loadingStartTime.current = null;
        
        if (minTimeoutRef.current) {
          clearTimeout(minTimeoutRef.current);
          minTimeoutRef.current = null;
        }
      };

      if (loadingStartTime.current) {
        const elapsedTime = Date.now() - loadingStartTime.current;
        const remainingTime = minLoadingTime - elapsedTime;

        if (remainingTime > 0) {
          // Esperar el tiempo mínimo
          minTimeoutRef.current = setTimeout(finishLoading, remainingTime);
        } else {
          // Ya pasó el tiempo mínimo
          finishLoading();
        }
      } else {
        // No había loading anterior, actualizar inmediatamente
        setDisplayData(data);
      }
    }

    // Cleanup
    return () => {
      if (minTimeoutRef.current) {
        clearTimeout(minTimeoutRef.current);
        minTimeoutRef.current = null;
      }
    };
  }, [data, loading, minLoadingTime, disableLoading]);

  return {
    /**
     * Datos a mostrar (anteriores si keepPreviousData=true y está cargando)
     */
    displayData: keepPreviousData && isTransitioning ? displayData : data,
    
    /**
     * Si está en transición de carga
     */
    isTransitioning,
    
    /**
     * Si debe mostrar skeleton (útil para mostrar skeleton en lugar de datos)
     */
    showSkeleton: isTransitioning && !keepPreviousData,
    
    /**
     * Clases CSS útiles para transiciones
     */
    transitionClasses: {
      opacity: isTransitioning ? 'opacity-50' : 'opacity-100',
      transition: 'transition-opacity duration-200',
      pointerEvents: isTransitioning ? 'pointer-events-none' : 'pointer-events-auto'
    }
  };
}

// Hook específico para tablas paginadas
export function useAsyncPaginatedTable<T>(
  data: T[],
  loading: boolean,
  paginationInfo: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  },
  options?: UseAsyncTableStateOptions
) {
  const tableState = useAsyncTableState(data, loading, options);
  
  return {
    ...tableState,
    ...paginationInfo,
    
    /**
     * Clases CSS para la tabla completa
     */
    tableClasses: `${tableState.transitionClasses.opacity} ${tableState.transitionClasses.transition}`,
    
    /**
     * Props listos para pasar a componentes de tabla
     */
    tableProps: {
      className: `${tableState.transitionClasses.opacity} ${tableState.transitionClasses.transition} ${tableState.transitionClasses.pointerEvents}`,
      'aria-busy': tableState.isTransitioning,
      'data-loading': tableState.isTransitioning
    }
  };
}
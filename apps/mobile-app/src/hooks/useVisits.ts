import { useQuery } from '@tanstack/react-query';
import { visitasApi } from '@/api';

export function useVisitsToday() {
  return useQuery({
    queryKey: ['visits', 'today'],
    queryFn: () => visitasApi.getHoy(),
  });
}

export function useVisitsSummary() {
  return useQuery({
    queryKey: ['visits', 'summary', 'daily'],
    queryFn: () => visitasApi.resumenDiario(),
  });
}

export function useVisitsSummaryWeekly() {
  return useQuery({
    queryKey: ['visits', 'summary', 'weekly'],
    queryFn: () => visitasApi.resumenSemanal(),
  });
}

export function useActiveVisit() {
  return useQuery({
    queryKey: ['visits', 'active'],
    queryFn: () => visitasApi.getActiva(),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import {
  Brain, Sparkle, FileText, ChartBar, TrendUp, ChatCircle,
  PaperPlaneRight, Lightning, CreditCard, Clock,
} from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { queryAi, getAiCredits, getAiUsageStats } from '@/services/api/ai';
import type { AiCreditBalance, AiResponse, AiUsageStats } from '@/services/api/ai';

const ACTION_TYPES = [
  { value: 'resumen', label: 'Resumen', icon: FileText, cost: 1, description: 'Resumir notas o historial' },
  { value: 'insight', label: 'Insight', icon: ChartBar, cost: 2, description: 'Análisis inteligente de datos' },
  { value: 'pregunta', label: 'Pregunta', icon: ChatCircle, cost: 3, description: 'Pregunta libre sobre tu negocio' },
  { value: 'pronostico', label: 'Pronóstico', icon: TrendUp, cost: 5, description: 'Pronóstico de ventas o demanda' },
] as const;

export default function AiPage() {
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('pregunta');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const loadCredits = useCallback(async () => {
    try {
      const [balance, usageStats] = await Promise.all([getAiCredits(), getAiUsageStats()]);
      setCredits(balance);
      setStats(usageStats);
    } catch { /* non-PRO tenants */ }
    finally { setLoadingCredits(false); }
  }, []);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await queryAi({
        tipoAccion: selectedAction as 'resumen' | 'insight' | 'pregunta' | 'pronostico',
        prompt: prompt.trim(),
      });
      setResponse(result);
      setCredits(prev => prev ? { ...prev, disponibles: result.creditosRestantes, usados: prev.usados + result.creditosUsados } : prev);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar tu solicitud');
    } finally { setLoading(false); }
  };

  const selectedActionConfig = ACTION_TYPES.find(a => a.value === selectedAction);
  const hasCredits = credits && credits.disponibles > 0;
  const noPlan = credits && (credits.plan === 'free' || credits.plan === 'basico');

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Asistente IA' },
      ]}
      title="Asistente IA"
      subtitle="Usa inteligencia artificial para analizar tus datos de negocio"
    >
      <div className="space-y-6">

      {/* Credit Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Lightning size={16} weight="fill" className="text-amber-500" />
            Créditos disponibles
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{loadingCredits ? '...' : credits?.disponibles ?? 0}</div>
          {credits && <div className="text-xs text-gray-400 mt-1">{credits.usados} / {credits.asignados + credits.extras} usados este mes</div>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <CreditCard size={16} weight="fill" className="text-blue-500" />
            Plan
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{loadingCredits ? '...' : credits?.plan ?? 'free'}</div>
          <div className="text-xs text-gray-400 mt-1">{credits?.asignados ?? 0} créditos/mes incluidos</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Sparkle size={16} weight="fill" className="text-purple-500" />
            Consultas este mes
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalRequests ?? 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Clock size={16} weight="fill" className="text-green-500" />
            Último uso
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
            {stats?.ultimosUsos?.[0]?.creadoEn ? new Date(stats.ultimosUsos[0].creadoEn).toLocaleDateString('es-MX') : 'Sin uso aún'}
          </div>
        </div>
      </div>

      {/* No plan warning */}
      {noPlan && !loadingCredits && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <Lightning size={20} weight="fill" className="text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">El Asistente IA está disponible a partir del plan Profesional</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Actualiza tu plan para obtener 100 créditos mensuales de IA.</p>
          </div>
        </div>
      )}

      {/* Action Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ACTION_TYPES.map((action) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.value;
          return (
            <button key={action.value} onClick={() => setSelectedAction(action.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <Icon size={24} weight={isSelected ? 'fill' : 'regular'} className={isSelected ? 'text-blue-500' : 'text-gray-400'} />
              <div className="mt-2">
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{action.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({action.cost} cr)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{action.description}</p>
            </button>
          );
        })}
      </div>

      {/* Prompt Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={selectedAction === 'resumen' ? 'Pega las notas de visita o datos que quieras resumir...' : selectedAction === 'insight' ? 'Describe los datos que quieres analizar...' : selectedAction === 'pregunta' ? '¿Cuál es tu pregunta sobre el negocio?' : 'Describe qué pronóstico necesitas...'}
            rows={4} maxLength={2000} disabled={!!noPlan}
            className="w-full p-4 pr-24 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50" />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">{prompt.length}/2000</span>
            <Button type="submit" disabled={!prompt.trim() || loading || !!noPlan || !hasCredits} className="!rounded-lg !px-3 !py-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PaperPlaneRight size={18} weight="fill" />}
            </Button>
          </div>
        </div>
        {selectedActionConfig && !noPlan && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Esta consulta costará <strong>{selectedActionConfig.cost} crédito{selectedActionConfig.cost > 1 ? 's' : ''}</strong>.
            {credits && ` Te quedan ${credits.disponibles} créditos.`}
          </p>
        )}
      </form>

      {/* Response */}
      {response && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} weight="duotone" className="text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Respuesta</span>
            <span className="text-xs text-gray-400 ml-auto">{response.latenciaMs}ms · {response.creditosUsados} crédito{response.creditosUsados > 1 ? 's' : ''}</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{response.respuesta}</div>
        </div>
      )}

      {/* Recent Usage */}
      {stats && stats.ultimosUsos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Últimas consultas</h3>
          <div className="space-y-3">
            {stats.ultimosUsos.slice(0, 5).map((uso) => (
              <div key={uso.id} className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${uso.exitoso ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>{uso.tipoAccion}</span>
                <span className="text-gray-600 dark:text-gray-400 truncate flex-1">{uso.promptResumen}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{uso.creditosCobrados} cr · {new Date(uso.creadoEn).toLocaleDateString('es-MX')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </PageHeader>
  );
}

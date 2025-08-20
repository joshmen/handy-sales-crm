"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { DollarSign, ShoppingCart, Calendar, Users } from "lucide-react";

// Importar Layout de forma dinámica para evitar problemas de SSR
const Layout = dynamic(
  () => import("@/components/layout/Layout").then((mod) => mod.Layout),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Cargando...</h2>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }
);

// Importar componentes del dashboard de forma dinámica
const MetricCard = dynamic(
  () => import("@/components/dashboard/MetricCard").then((mod) => mod.MetricCard),
  { ssr: false }
);

const SalesChart = dynamic(
  () => import("@/components/dashboard/SalesChart").then((mod) => mod.SalesChart),
  { ssr: false }
);

const VisitsChart = dynamic(
  () => import("@/components/dashboard/VisitsChart").then((mod) => mod.VisitsChart),
  { ssr: false }
);

const GoalProgress = dynamic(
  () => import("@/components/dashboard/GoalProgress").then((mod) => mod.GoalProgress),
  { ssr: false }
);

// Datos mock para las métricas
const mockMetrics = [
  {
    title: "Ventas del Mes",
    value: 124500,
    subtitle: "$124,500 MXN",
    icon: DollarSign,
    trend: { value: 12.5, label: "vs mes anterior", isPositive: true },
    color: "green" as const,
  },
  {
    title: "Pedidos Hoy",
    value: 23,
    subtitle: "23 pedidos",
    icon: ShoppingCart,
    trend: { value: 8.2, label: "vs ayer", isPositive: true },
    color: "blue" as const,
  },
  {
    title: "Visitas Programadas",
    value: 45,
    subtitle: "Esta semana",
    icon: Calendar,
    trend: { value: -5.3, label: "vs sem. anterior", isPositive: false },
    color: "orange" as const,
  },
  {
    title: "Clientes Activos",
    value: 156,
    subtitle: "156 clientes",
    icon: Users,
    trend: { value: 3.1, label: "vs mes anterior", isPositive: true },
    color: "purple" as const,
  },
];

// Datos mock para gráfico de ventas
const mockSalesData = [
  { date: "01 Ene", sales: 45000, orders: 12 },
  { date: "02 Ene", sales: 52000, orders: 15 },
  { date: "03 Ene", sales: 48000, orders: 13 },
  { date: "04 Ene", sales: 61000, orders: 18 },
  { date: "05 Ene", sales: 55000, orders: 16 },
  { date: "06 Ene", sales: 67000, orders: 20 },
  { date: "07 Ene", sales: 71000, orders: 22 },
  { date: "08 Ene", sales: 58000, orders: 17 },
  { date: "09 Ene", sales: 64000, orders: 19 },
  { date: "10 Ene", sales: 72000, orders: 23 },
  { date: "11 Ene", sales: 69000, orders: 21 },
  { date: "12 Ene", sales: 75000, orders: 24 },
];

// Datos mock para gráfico de visitas
const mockVisitsData = [
  {
    date: "Lun",
    programadas: 15,
    completadas: 12,
    canceladas: 2,
    pendientes: 1,
  },
  {
    date: "Mar",
    programadas: 18,
    completadas: 16,
    canceladas: 1,
    pendientes: 1,
  },
  {
    date: "Mié",
    programadas: 20,
    completadas: 17,
    canceladas: 2,
    pendientes: 1,
  },
  {
    date: "Jue",
    programadas: 16,
    completadas: 14,
    canceladas: 1,
    pendientes: 1,
  },
  {
    date: "Vie",
    programadas: 22,
    completadas: 19,
    canceladas: 2,
    pendientes: 1,
  },
  {
    date: "Sáb",
    programadas: 12,
    completadas: 10,
    canceladas: 1,
    pendientes: 1,
  },
  { date: "Dom", programadas: 8, completadas: 7, canceladas: 0, pendientes: 1 },
];

// Datos mock para metas
const mockGoals = [
  {
    id: "sales-goal",
    title: "Meta de Ventas Mensual",
    current: 124500,
    target: 150000,
    unit: "currency",
    type: "sales" as const,
    deadline: new Date("2025-01-31"),
    color: "green" as const,
  },
  {
    id: "visits-goal",
    title: "Visitas Semanales",
    current: 45,
    target: 60,
    unit: "visitas",
    type: "visits" as const,
    deadline: new Date("2025-01-19"),
    color: "blue" as const,
  },
  {
    id: "clients-goal",
    title: "Nuevos Clientes",
    current: 8,
    target: 15,
    unit: "clientes",
    type: "clients" as const,
    deadline: new Date("2025-01-31"),
    color: "purple" as const,
  },
  {
    id: "orders-goal",
    title: "Pedidos del Mes",
    current: 167,
    target: 200,
    unit: "pedidos",
    type: "orders" as const,
    deadline: new Date("2025-01-31"),
    color: "orange" as const,
  },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Cargando Dashboard...</h2>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Resumen general de tu negocio -{" "}
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mockMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              icon={metric.icon}
              trend={metric.trend}
              color={metric.color}
              isLoading={loading}
            />
          ))}
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SalesChart
            data={mockSalesData}
            title="Ventas Diarias"
            subtitle="Evolución de ventas en los últimos 12 días"
            type="area"
            height={350}
            isLoading={loading}
          />

          <VisitsChart
            data={mockVisitsData}
            title="Visitas Semanales"
            subtitle="Estado de visitas de la semana actual"
            type="stacked"
            height={350}
            isLoading={loading}
          />
        </div>

        {/* Metas y objetivos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoalProgress
            goals={mockGoals}
            title="Metas del Período"
            subtitle="Progreso hacia los objetivos establecidos"
            isLoading={loading}
          />
        </div>
      </div>
    </Layout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import {
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Calculator,
  CreditCard,
  Banknote,
  ShoppingCart,
  RotateCcw,
  Save,
  Send,
  Printer,
  Eye,
  Calendar,
  User,
  MapPin,
  Target,
  TrendingDown,
  BarChart3,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useRouteStore from '@/stores/useRouteStore';
import { useToast } from '@/hooks/useToast';

// Tipos para el cierre
interface CloseSummary {
  routeId: string;
  routeName: string;
  date: Date;
  user: string;
  zone: string;

  // Visitas
  totalVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  pendingVisits: number;

  // Inventario
  initialInventory: number;
  soldInventory: number;
  returnedInventory: number;
  damagedInventory: number;

  // Ventas
  totalSales: number;
  cashSales: number;
  creditSales: number;

  // Efectivo
  initialCash: number;
  collectedCash: number;
  expensesCash: number;
  finalCash: number;

  // Métricas
  efficiency: number;
  conversionRate: number;
  avgTicket: number;

  // Gastos
  expenses: Array<{
    id: string;
    concept: string;
    amount: number;
    category: string;
  }>;

  // Productos vendidos
  soldProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

// Datos mock de rutas activas para cerrar
const mockActiveRoutes = [
  {
    id: 'R001',
    name: 'Ruta Centro Norte',
    user: 'Juan Pérez',
    zone: 'CENTRO_NORTE',
    date: new Date(),
    status: 'in_progress',
    progress: 85,
  },
  {
    id: 'R002',
    name: 'Ruta Sur',
    user: 'María García',
    zone: 'SUR',
    date: new Date(),
    status: 'in_progress',
    progress: 92,
  },
];

export default function RouteClosePage() {
  const { toast } = useToast();
  const { routes, completeRoute } = useRouteStore();

  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [closeSummary, setCloseSummary] = useState<CloseSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados del formulario de cierre
  const [cashCount, setCashCount] = useState({
    bills1000: 0,
    bills500: 0,
    bills200: 0,
    bills100: 0,
    bills50: 0,
    bills20: 0,
    coins10: 0,
    coins5: 0,
    coins2: 0,
    coins1: 0,
  });

  const [expenses, setExpenses] = useState<
    Array<{
      id: string;
      concept: string;
      amount: number;
      category: string;
    }>
  >([]);

  const [newExpense, setNewExpense] = useState({
    concept: '',
    amount: 0,
    category: 'combustible',
  });

  const [returnedProducts, setReturnedProducts] = useState<
    Array<{
      productId: string;
      quantity: number;
      reason: string;
    }>
  >([]);

  const [notes, setNotes] = useState('');

  // Calcular total de efectivo contado
  const calculateCashTotal = () => {
    return (
      cashCount.bills1000 * 1000 +
      cashCount.bills500 * 500 +
      cashCount.bills200 * 200 +
      cashCount.bills100 * 100 +
      cashCount.bills50 * 50 +
      cashCount.bills20 * 20 +
      cashCount.coins10 * 10 +
      cashCount.coins5 * 5 +
      cashCount.coins2 * 2 +
      cashCount.coins1 * 1
    );
  };

  // Cargar resumen de ruta
  const loadRouteSummary = (routeId: string) => {
    setLoading(true);

    // Simulación de carga de datos
    setTimeout(() => {
      const mockSummary: CloseSummary = {
        routeId: routeId,
        routeName: 'Ruta Centro Norte',
        date: new Date(),
        user: 'Juan Pérez',
        zone: 'CENTRO_NORTE',

        totalVisits: 24,
        completedVisits: 20,
        cancelledVisits: 2,
        pendingVisits: 2,

        initialInventory: 150,
        soldInventory: 98,
        returnedInventory: 12,
        damagedInventory: 2,

        totalSales: 45300,
        cashSales: 28500,
        creditSales: 16800,

        initialCash: 5000,
        collectedCash: 28500,
        expensesCash: 850,
        finalCash: 32650,

        efficiency: 85,
        conversionRate: 75,
        avgTicket: 2265,

        expenses: [
          { id: 'E001', concept: 'Gasolina', amount: 500, category: 'combustible' },
          { id: 'E002', concept: 'Comida', amount: 150, category: 'alimentos' },
          { id: 'E003', concept: 'Peaje', amount: 200, category: 'transporte' },
        ],

        soldProducts: [
          { id: 'P001', name: 'Tanque Rotoplas 1100L', quantity: 8, price: 3500, total: 28000 },
          { id: 'P002', name: 'Tinaco 450L', quantity: 12, price: 1200, total: 14400 },
          { id: 'P003', name: 'Bomba de agua 1HP', quantity: 3, price: 900, total: 2700 },
          { id: 'P004', name: 'Tubería PVC 2', quantity: 20, price: 10, total: 200 },
        ],
      };

      setCloseSummary(mockSummary);
      setExpenses(mockSummary.expenses);
      setLoading(false);
    }, 1000);
  };

  // Agregar gasto
  const addExpense = () => {
    if (newExpense.concept && newExpense.amount > 0) {
      setExpenses([
        ...expenses,
        {
          id: `E${Date.now()}`,
          ...newExpense,
        },
      ]);
      setNewExpense({ concept: '', amount: 0, category: 'combustible' });
      toast.success('Gasto agregado');
    }
  };

  // Eliminar gasto
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Procesar cierre de ruta
  const processRouteClose = () => {
    if (!closeSummary) return;

    const cashTotal = calculateCashTotal();
    const expectedCash =
      closeSummary.initialCash +
      closeSummary.cashSales -
      expenses.reduce((sum, e) => sum + e.amount, 0);
    const difference = cashTotal - expectedCash;

    if (Math.abs(difference) > 1) {
      if (
        !confirm(
          `Hay una diferencia de $${Math.abs(difference).toFixed(
            2
          )} en el efectivo. ¿Continuar con el cierre?`
        )
      ) {
        return;
      }
    }

    setLoading(true);

    // Simular procesamiento
    setTimeout(() => {
      completeRoute(closeSummary.routeId);
      toast.success('Ruta cerrada exitosamente');
      setLoading(false);

      // Generar reporte
      generateReport();
    }, 2000);
  };

  // Generar reporte
  const generateReport = () => {
    toast.info('Generando reporte PDF...');
    setTimeout(() => {
      toast.success('Reporte generado y enviado por email');
    }, 1500);
  };

  // Calcular totales
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashTotal = calculateCashTotal();

  return (
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cierre de Ruta</h1>
            <p className="text-gray-600 mt-2">Conciliación y cierre de rutas comerciales</p>
          </div>
          {closeSummary && (
            <div className="flex gap-3">
              <Button variant="outline">
                <Eye size={16} className="mr-2" />
                Vista previa
              </Button>
              <Button variant="outline">
                <Printer size={16} className="mr-2" />
                Imprimir
              </Button>
            </div>
          )}
        </div>

        {/* Selección de ruta */}
        {!closeSummary ? (
          <Card className="mb-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Seleccionar Ruta para Cerrar</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockActiveRoutes.map(route => (
                  <Card
                    key={route.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                    onClick={() => {
                      setSelectedRoute(route.id);
                      loadRouteSummary(route.id);
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{route.name}</h3>
                        <p className="text-sm text-gray-600">{route.user}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {route.progress}% completado
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <MapPin size={14} className="mr-1" />
                        {route.zone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-1" />
                        {format(route.date, 'dd/MM/yyyy')}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${route.progress}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Resumen de ruta */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Información general */}
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText size={20} className="mr-2" />
                      Información de la Ruta
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Ruta</p>
                        <p className="font-medium">{closeSummary.routeName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vendedor</p>
                        <p className="font-medium">{closeSummary.user}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Zona</p>
                        <p className="font-medium">{closeSummary.zone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha</p>
                        <p className="font-medium">
                          {format(closeSummary.date, "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Resumen de visitas */}
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Target size={20} className="mr-2" />
                      Resumen de Visitas
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {closeSummary.totalVisits}
                        </p>
                        <p className="text-sm text-gray-600">Totales</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {closeSummary.completedVisits}
                        </p>
                        <p className="text-sm text-gray-600">Completadas</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {closeSummary.cancelledVisits}
                        </p>
                        <p className="text-sm text-gray-600">Canceladas</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">
                          {closeSummary.pendingVisits}
                        </p>
                        <p className="text-sm text-gray-600">Pendientes</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Eficiencia de ruta</span>
                        <span className="text-lg font-semibold text-green-600">
                          {closeSummary.efficiency}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">Tasa de conversión</span>
                        <span className="text-lg font-semibold text-blue-600">
                          {closeSummary.conversionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Conteo de efectivo */}
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Calculator size={20} className="mr-2" />
                      Conteo de Efectivo
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">$1000</label>
                        <Input
                          type="number"
                          value={cashCount.bills1000}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills1000: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$500</label>
                        <Input
                          type="number"
                          value={cashCount.bills500}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills500: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$200</label>
                        <Input
                          type="number"
                          value={cashCount.bills200}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills200: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$100</label>
                        <Input
                          type="number"
                          value={cashCount.bills100}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills100: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$50</label>
                        <Input
                          type="number"
                          value={cashCount.bills50}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills50: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$20</label>
                        <Input
                          type="number"
                          value={cashCount.bills20}
                          onChange={e =>
                            setCashCount({ ...cashCount, bills20: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$10</label>
                        <Input
                          type="number"
                          value={cashCount.coins10}
                          onChange={e =>
                            setCashCount({ ...cashCount, coins10: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$5</label>
                        <Input
                          type="number"
                          value={cashCount.coins5}
                          onChange={e =>
                            setCashCount({ ...cashCount, coins5: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$2</label>
                        <Input
                          type="number"
                          value={cashCount.coins2}
                          onChange={e =>
                            setCashCount({ ...cashCount, coins2: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">$1</label>
                        <Input
                          type="number"
                          value={cashCount.coins1}
                          onChange={e =>
                            setCashCount({ ...cashCount, coins1: parseInt(e.target.value) || 0 })
                          }
                          className="text-center"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Contado:</span>
                        <span className="text-xl font-bold text-green-600">
                          ${cashTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Gastos */}
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign size={20} className="mr-2" />
                      Gastos de Ruta
                    </h2>

                    <div className="space-y-3 mb-4">
                      {expenses.map(expense => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{expense.concept}</p>
                            <p className="text-sm text-gray-600">{expense.category}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">${expense.amount}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeExpense(expense.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Concepto"
                        value={newExpense.concept}
                        onChange={e => setNewExpense({ ...newExpense, concept: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Monto"
                        value={newExpense.amount || ''}
                        onChange={e =>
                          setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-32"
                      />
                      <Button onClick={addExpense}>
                        <Plus size={16} />
                      </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Gastos:</span>
                        <span className="text-lg font-semibold text-red-600">
                          ${totalExpenses.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Notas */}
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Observaciones</h2>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      rows={4}
                      placeholder="Agregar notas o comentarios sobre el cierre de ruta..."
                    />
                  </div>
                </Card>
              </div>

              {/* Panel lateral */}
              <div className="space-y-6">
                {/* Resumen financiero */}
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <BarChart3 size={20} className="mr-2" />
                      Resumen Financiero
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-sm text-gray-600">Efectivo Inicial</span>
                        <span className="font-medium">
                          ${closeSummary.initialCash.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ventas en Efectivo</span>
                        <span className="font-medium text-green-600">
                          +${closeSummary.cashSales.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ventas a Crédito</span>
                        <span className="font-medium text-blue-600">
                          ${closeSummary.creditSales.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-sm text-gray-600">Gastos</span>
                        <span className="font-medium text-red-600">
                          -${totalExpenses.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Efectivo Esperado</span>
                        <span className="text-lg font-bold">
                          $
                          {(
                            closeSummary.initialCash +
                            closeSummary.cashSales -
                            totalExpenses
                          ).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Efectivo Contado</span>
                        <span className="text-lg font-bold text-green-600">
                          ${cashTotal.toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`flex justify-between items-center p-3 rounded-lg ${
                          Math.abs(
                            cashTotal -
                              (closeSummary.initialCash + closeSummary.cashSales - totalExpenses)
                          ) > 1
                            ? 'bg-red-50'
                            : 'bg-green-50'
                        }`}
                      >
                        <span className="font-medium">Diferencia</span>
                        <span
                          className={`text-lg font-bold ${
                            Math.abs(
                              cashTotal -
                                (closeSummary.initialCash + closeSummary.cashSales - totalExpenses)
                            ) > 1
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          $
                          {(
                            cashTotal -
                            (closeSummary.initialCash + closeSummary.cashSales - totalExpenses)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Inventario */}
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Package size={20} className="mr-2" />
                      Resumen de Inventario
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Inicial</span>
                        <span className="font-medium">{closeSummary.initialInventory} u.</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Vendido</span>
                        <span className="font-medium text-green-600">
                          {closeSummary.soldInventory} u.
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Devuelto</span>
                        <span className="font-medium text-yellow-600">
                          {closeSummary.returnedInventory} u.
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Dañado</span>
                        <span className="font-medium text-red-600">
                          {closeSummary.damagedInventory} u.
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-medium">Restante</span>
                        <span className="text-lg font-bold">
                          {closeSummary.initialInventory -
                            closeSummary.soldInventory -
                            closeSummary.damagedInventory}{' '}
                          u.
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Métricas */}
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center">
                      <TrendingUp size={20} className="mr-2" />
                      Métricas de Desempeño
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Eficiencia</span>
                          <span className="text-sm font-medium">{closeSummary.efficiency}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${closeSummary.efficiency}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Conversión</span>
                          <span className="text-sm font-medium">
                            {closeSummary.conversionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${closeSummary.conversionRate}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="text-sm text-gray-600">Ticket Promedio</span>
                        <span className="font-semibold">
                          ${closeSummary.avgTicket.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Acciones */}
                <Card>
                  <div className="p-6">
                    <Button className="w-full mb-3" onClick={processRouteClose} disabled={loading}>
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} className="mr-2" />
                          Cerrar Ruta
                        </>
                      )}
                    </Button>

                    <Button variant="outline" className="w-full mb-3">
                      <Save size={16} className="mr-2" />
                      Guardar Borrador
                    </Button>

                    <Button variant="outline" className="w-full">
                      <XCircle size={16} className="mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
  );
}

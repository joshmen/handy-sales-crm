import React from "react";
import { Route, RouteSummary } from "@/types/routes";
import { Card, CardContent } from "@/components/ui";

interface RouteCardProps {
  route: Route;
  summary: RouteSummary;
  onView: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  summary,
  onView,
  onEdit,
  onClose,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Progreso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{route.name}</h3>
            <p className="text-sm text-gray-500">
              {route.user.name} •{" "}
              {new Date(route.startDate).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              route.status
            )}`}
          >
            {getStatusLabel(route.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Ventas</p>
            <p className="text-lg font-semibold">
              ${summary.totalSales.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pedidos</p>
            <p className="text-lg font-semibold">{summary.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Visitas</p>
            <p className="text-lg font-semibold">
              {summary.completedVisits}/{summary.totalVisits}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Efectividad</p>
            <p className="text-lg font-semibold">{summary.effectiveness}%</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onView}
            className="flex-1 bg-teal-500 text-white py-2 px-4 rounded text-sm hover:bg-teal-600"
          >
            Ver Detalles
          </button>
          {route.status === "pending" && (
            <button
              onClick={onEdit}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded text-sm hover:bg-blue-600"
            >
              Editar
            </button>
          )}
          {route.status === "in_progress" && (
            <button
              onClick={onClose}
              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded text-sm hover:bg-orange-600"
            >
              Cerrar Ruta
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

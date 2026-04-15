import React from "react";
import { useTranslations } from "next-intl";
import { Route, RouteSummary } from "@/types/routes";
import { Card, CardContent } from "@/components/ui";

interface RouteCardProps {
  route: Route;
  summary: RouteSummary;
  onView: () => void;
  onEdit: () => void;
  onClose: () => void;
}

const STATUS_KEYS: Record<string, string> = {
  pending: "statusPending",
  in_progress: "statusInProgress",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  summary,
  onView,
  onEdit,
  onClose,
}) => {
  const t = useTranslations('routes.card');

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
        return "bg-surface-3 text-foreground";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{route.name}</h3>
            <p className="text-sm text-muted-foreground">
              {route.user.name} •{" "}
              {new Date(route.startDate).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(route.status)}`}
          >
            {t(STATUS_KEYS[route.status] ?? route.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('sales')}</p>
            <p className="text-lg font-semibold">
              ${summary.totalSales.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('orders')}</p>
            <p className="text-lg font-semibold">{summary.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('visits')}</p>
            <p className="text-lg font-semibold">
              {summary.completedVisits}/{summary.totalVisits}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('effectiveness')}</p>
            <p className="text-lg font-semibold">{summary.effectiveness}%</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onView}
            className="flex-1 bg-teal-500 text-white py-2 px-4 rounded text-sm hover:bg-teal-600"
          >
            {t('viewDetails')}
          </button>
          {route.status === "pending" && (
            <button
              onClick={onEdit}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded text-sm hover:bg-blue-600"
            >
              {t('edit')}
            </button>
          )}
          {route.status === "in_progress" && (
            <button
              onClick={onClose}
              className="flex-1 bg-orange-500 text-white py-2 px-4 rounded text-sm hover:bg-orange-600"
            >
              {t('closeRoute')}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

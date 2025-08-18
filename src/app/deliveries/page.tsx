"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { Separator } from '@/components/ui';
import { Layout } from '@/components/layout';
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  User,
  FileText,
} from "lucide-react";

interface Delivery {
  id: string;
  number: string;
  orderId: string;
  clientName: string;
  clientAddress: string;
  status: "PROGRAMADA" | "EN_TRANSITO" | "ENTREGADA" | "FALLIDA" | "CANCELADA";
  scheduledDate: Date;
  deliveredDate?: Date;
  driverName?: string;
  vehicle?: string;
  items: number;
  total: number;
  notes?: string;
}

const deliveries: Delivery[] = [
  {
    id: "1",
    number: "DEL-001",
    orderId: "ORD-001",
    clientName: "Abarrotes Don Juan",
    clientAddress: "Av. Revolución 123, Centro",
    status: "EN_TRANSITO",
    scheduledDate: new Date("2024-01-15T09:00:00"),
    driverName: "Carlos Mendoza",
    vehicle: "Camión-01",
    items: 15,
    total: 2500,
  },
  {
    id: "2",
    number: "DEL-002",
    orderId: "ORD-002",
    clientName: "Supermercado La Esperanza",
    clientAddress: "Calle Morelos 456, Norte",
    status: "ENTREGADA",
    scheduledDate: new Date("2024-01-15T10:30:00"),
    deliveredDate: new Date("2024-01-15T10:45:00"),
    driverName: "Luis García",
    vehicle: "Van-02",
    items: 23,
    total: 4200,
  },
  {
    id: "3",
    number: "DEL-003",
    orderId: "ORD-003",
    clientName: "Tienda La Esquina",
    clientAddress: "Av. Juárez 789, Sur",
    status: "PROGRAMADA",
    scheduledDate: new Date("2024-01-16T08:00:00"),
    items: 8,
    total: 1800,
  },
];

const getStatusBadge = (status: Delivery["status"]) => {
  const statusConfig = {
    PROGRAMADA: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Programada",
    },
    EN_TRANSITO: {
      variant: "info" as const,
      icon: Truck,
      label: "En Tránsito",
    },
    ENTREGADA: {
      variant: "success" as const,
      icon: CheckCircle,
      label: "Entregada",
    },
    FALLIDA: {
      variant: "destructive" as const,
      icon: XCircle,
      label: "Fallida",
    },
    CANCELADA: {
      variant: "destructive" as const,
      icon: XCircle,
      label: "Cancelada",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default function DeliveriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || delivery.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getDeliveriesByStatus = (status: string) => {
    if (status === "all") return deliveries;
    return deliveries.filter((d) => d.status === status);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Layout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entregas</h1>
            <p className="text-muted-foreground">
              Gestiona y monitorea todas las entregas
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Entrega
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Programar Nueva Entrega</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Funcionalidad de creación de entregas en desarrollo...
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="w-full"
                >
                  Cerrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entregas Hoy
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDeliveriesByStatus("EN_TRANSITO").length}
              </div>
              <p className="text-xs text-muted-foreground">
                En tránsito actualmente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDeliveriesByStatus("ENTREGADA").length}
              </div>
              <p className="text-xs text-muted-foreground">Entregas exitosas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programadas</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getDeliveriesByStatus("PROGRAMADA").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendientes de envío
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  deliveries.reduce((sum, d) => sum + d.total, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                En entregas activas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente o número de entrega..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="PROGRAMADA">Programada</option>
                  <option value="EN_TRANSITO">En Tránsito</option>
                  <option value="ENTREGADA">Entregada</option>
                  <option value="FALLIDA">Fallida</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">
                      {delivery.number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {delivery.clientName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-xs truncate">
                          {delivery.clientAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDateTime(delivery.scheduledDate)}
                      </div>
                    </TableCell>
                    <TableCell>{delivery.driverName || "-"}</TableCell>
                    <TableCell>{delivery.vehicle || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{delivery.items} items</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(delivery.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

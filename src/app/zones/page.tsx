"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { toast } from "@/hooks/useToast";
import { 
  ZoneModal, 
  ZoneList, 
  ZoneFilters 
} from "@/components/zones";
import { 
  Zone, 
  ZoneForm, 
  ZoneFilters as ZoneFilterType,
  ZoneMetrics 
} from "@/types/zones";
import { User } from "@/types/users";
import { zoneService } from "@/services/api";
import { 
  Plus, 
  MapPin, 
  Users, 
  Activity, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export default function ZonesPage() {
  // State
  const [zones, setZones] = useState<Zone[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<ZoneMetrics | null>(null);
  const [filters, setFilters] = useState<ZoneFilterType>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 10,
  });
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load zones when filters change
  useEffect(() => {
    loadZones();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, metricsData] = await Promise.all([
        zoneService.getAvailableUsers(),
        zoneService.getZoneMetrics(),
      ]);
      
      setAvailableUsers(usersData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos iniciales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const response = await zoneService.getZones(filters);
      setZones(response.zones);
    } catch (error) {
      console.error('Error loading zones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las zonas",
        variant: "destructive",
      });
    }
  };

  const handleCreateZone = async (zoneData: ZoneForm) => {
    try {
      setActionLoading(true);
      const newZone = await zoneService.createZone(zoneData);
      
      toast({
        title: "Zona creada",
        description: `La zona "${newZone.name}" se creó exitosamente`,
      });
      
      setIsCreateModalOpen(false);
      await loadZones();
      await loadData(); // Reload metrics
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la zona",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditZone = async (zoneData: ZoneForm) => {
    if (!selectedZone) return;
    
    try {
      setActionLoading(true);
      const updatedZone = await zoneService.updateZone({
        id: selectedZone.id,
        ...zoneData,
      });
      
      toast({
        title: "Zona actualizada",
        description: `La zona "${updatedZone.name}" se actualizó exitosamente`,
      });
      
      setIsEditModalOpen(false);
      setSelectedZone(null);
      await loadZones();
      await loadData(); // Reload metrics
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la zona",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteZone = async () => {
    if (!selectedZone) return;
    
    try {
      setActionLoading(true);
      await zoneService.deleteZone(selectedZone.id);
      
      toast({
        title: "Zona eliminada",
        description: `La zona "${selectedZone.name}" se eliminó exitosamente`,
      });
      
      setIsDeleteModalOpen(false);
      setSelectedZone(null);
      await loadZones();
      await loadData(); // Reload metrics
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la zona",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (zone: Zone) => {
    try {
      const updatedZone = await zoneService.toggleZoneStatus(zone.id);
      
      toast({
        title: updatedZone.isEnabled ? "Zona habilitada" : "Zona deshabilitada",
        description: `La zona "${zone.name}" se ${updatedZone.isEnabled ? 'habilitó' : 'deshabilitó'} exitosamente`,
      });
      
      await loadZones();
      await loadData(); // Reload metrics
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cambiar el estado de la zona",
        variant: "destructive",
      });
    }
  };

  const handleViewMap = () => {
    toast({
      title: "Próximamente",
      description: "La funcionalidad del mapa estará disponible pronto",
    });
  };

  const handleExportZones = () => {
    toast({
      title: "Próximamente",
      description: "La funcionalidad de exportación estará disponible pronto",
    });
  };

  // Get used colors for validation
  const usedColors = zones
    .filter(zone => selectedZone?.id !== zone.id)
    .map(zone => zone.color);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Zonas</h1>
            <p className="text-muted-foreground mt-1">
              Administra las zonas geográficas y asignación de usuarios
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleViewMap}
            >
              <MapPin className="h-4 w-4" />
              Mapa
            </Button>
            
            <Button 
              className="gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar Nueva
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total zonas</p>
                  <p className="text-2xl font-bold">{metrics.totalZones}</p>
                </div>
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Habilitadas</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.enabledZones}</p>
                </div>
                <Activity className="h-8 w-8 text-green-400" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Con usuarios</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.zonesWithUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sin usuarios</p>
                  <p className="text-2xl font-bold text-amber-600">{metrics.zonesWithoutUsers}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-400" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total clientes</p>
                  <p className="text-2xl font-bold">{metrics.totalClientsInZones}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <ZoneFilters
            filters={filters}
            onFiltersChange={setFilters}
            onExport={handleExportZones}
            totalZones={zones.length}
            loading={loading}
          />
        </Card>

        {/* Zones List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Zonas ({zones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ZoneList
              zones={zones}
              users={availableUsers}
              onEditZone={(zone) => {
                setSelectedZone(zone);
                setIsEditModalOpen(true);
              }}
              onDeleteZone={(zone) => {
                setSelectedZone(zone);
                setIsDeleteModalOpen(true);
              }}
              onToggleStatus={handleToggleStatus}
              onViewMap={handleViewMap}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Create Zone Modal */}
        <ZoneModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          mode="create"
          availableUsers={availableUsers}
          usedColors={usedColors}
          onSubmit={handleCreateZone}
          loading={actionLoading}
        />

        {/* Edit Zone Modal */}
        <ZoneModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          mode="edit"
          zone={selectedZone || undefined}
          availableUsers={availableUsers}
          usedColors={usedColors}
          onSubmit={handleEditZone}
          loading={actionLoading}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar zona?</DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              {selectedZone?.userIds.length ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    No se puede eliminar la zona <strong>&quot;{selectedZone?.name}&quot;</strong> porque tiene usuarios asignados.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Primero debes reasignar o remover los usuarios de esta zona.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  ¿Estás seguro de que deseas eliminar la zona <strong>&quot;{selectedZone?.name}&quot;</strong>?
                  Esta acción no se puede deshacer.
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedZone(null);
                }}
              >
                Cancelar
              </Button>
              {!selectedZone?.userIds.length && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteZone}
                  loading={actionLoading}
                >
                  Eliminar Zona
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

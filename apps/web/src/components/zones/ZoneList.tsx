import React from 'react';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Zone } from '@/types/zones';
import { User } from '@/types/users';
import { 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  Users, 
  MapPin
} from 'lucide-react';

interface ZoneListProps {
  zones: Zone[];
  users: User[];
  onEditZone: (zone: Zone) => void;
  onDeleteZone: (zone: Zone) => void;
  onToggleStatus: (zone: Zone) => void;
  onViewMap?: (zone: Zone) => void;
  loading?: boolean;
}

export function ZoneList({
  zones,
  users,
  onEditZone,
  onDeleteZone,
  onToggleStatus,
  onViewMap,
  loading = false,
}: ZoneListProps) {
  // Helper para obtener usuarios de una zona
  const getZoneUsers = (zone: Zone) => {
    return users.filter(user => zone.userIds.includes(user.id));
  };

  // Helper para obtener nombres de usuarios
  const getUserNames = (zone: Zone) => {
    const zoneUsers = getZoneUsers(zone);
    if (zoneUsers.length === 0) return 'Ningún usuario asignado';
    if (zoneUsers.length === 1) return zoneUsers[0].name;
    if (zoneUsers.length === 2) return `${zoneUsers[0].name}, ${zoneUsers[1].name}`;
    return `${zoneUsers[0].name} y ${zoneUsers.length - 1} más`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Cargando zonas...</p>
        </div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay zonas creadas</p>
          <p className="text-sm">Crea tu primera zona para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Color</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead>Clientes/Habilidades</TableHead>
            <TableHead>Proyectos/Habilidades</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((zone) => {
            const zoneUsers = getZoneUsers(zone);
            
            return (
              <TableRow key={zone.id}>
                {/* Color */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-6 w-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: zone.color }}
                      title={zone.color}
                    />
                  </div>
                </TableCell>

                {/* Descripción */}
                <TableCell>
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    {zone.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {zone.description}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Usuarios */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm">{getUserNames(zone)}</p>
                      <p className="text-xs text-muted-foreground">
                        {zoneUsers.length} usuario{zoneUsers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Activo */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {zone.isEnabled ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm">Activo</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm">Inactivo</span>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Clientes/Habilidades */}
                <TableCell>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{zone.clientCount || 0}</p>
                    <p className="text-xs text-muted-foreground">clientes</p>
                  </div>
                </TableCell>

                {/* Proyectos/Habilidades */}
                <TableCell>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{zone.projectCount || 0}</p>
                    <p className="text-xs text-muted-foreground">proyectos</p>
                  </div>
                </TableCell>

                {/* Acciones */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Toggle Status */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleStatus(zone)}
                      title={zone.isEnabled ? 'Desactivar zona' : 'Activar zona'}
                      className="h-8 w-8 p-0"
                    >
                      {zone.isEnabled ? (
                        <PowerOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>

                    {/* View Map (if handler provided) */}
                    {onViewMap && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewMap(zone)}
                        title="Ver en mapa"
                        className="h-8 w-8 p-0"
                      >
                        <MapPin className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}

                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditZone(zone)}
                      title="Editar zona"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4 text-gray-600" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteZone(zone)}
                      title="Eliminar zona"
                      className="h-8 w-8 p-0"
                      disabled={zone.userIds.length > 0} // No permitir eliminar si tiene usuarios
                    >
                      <Trash2 className={`h-4 w-4 ${
                        zone.userIds.length > 0 
                          ? 'text-gray-300' 
                          : 'text-red-500 hover:text-red-700'
                      }`} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

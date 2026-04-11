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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('zones.list');
  // Helper para obtener usuarios de una zona
  const getZoneUsers = (zone: Zone) => {
    return users.filter(user => zone.userIds.includes(user.id));
  };

  // Helper para obtener nombres de usuarios
  const getUserNames = (zone: Zone) => {
    const zoneUsers = getZoneUsers(zone);
    if (zoneUsers.length === 0) return t('noUserAssigned');
    if (zoneUsers.length === 1) return zoneUsers[0].name;
    if (zoneUsers.length === 2) return `${zoneUsers[0].name}, ${zoneUsers[1].name}`;
    return `${zoneUsers[0].name} ${t('andMore', { count: zoneUsers.length - 1 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">{t('loadingZones')}</p>
        </div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
          <p>{t('noZonesCreated')}</p>
          <p className="text-sm">{t('createFirstZone')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('colorHeader')}</TableHead>
            <TableHead>{t('descriptionHeader')}</TableHead>
            <TableHead>{t('usersHeader')}</TableHead>
            <TableHead>{t('activeHeader')}</TableHead>
            <TableHead>{t('clientsHeader')}</TableHead>
            <TableHead>{t('projectsHeader')}</TableHead>
            <TableHead>{t('actionsHeader')}</TableHead>
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
                      className="h-6 w-6 rounded-full border border-border-default"
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{getUserNames(zone)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('userCount', { count: zoneUsers.length, plural: zoneUsers.length !== 1 ? 's' : '' })}
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
                        <span className="text-sm">{t('active')}</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm">{t('inactive')}</span>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Clientes/Habilidades */}
                <TableCell>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{zone.clientCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('clients')}</p>
                  </div>
                </TableCell>

                {/* Proyectos/Habilidades */}
                <TableCell>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{zone.projectCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('projects')}</p>
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
                      title={zone.isEnabled ? t('deactivateZone') : t('activateZone')}
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
                        title={t('viewOnMap')}
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
                      title={t('editZone')}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4 text-foreground/70" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteZone(zone)}
                      title={t('deleteZone')}
                      className="h-8 w-8 p-0"
                      disabled={zone.userIds.length > 0} // No permitir eliminar si tiene usuarios
                    >
                      <Trash2 className={`h-4 w-4 ${
                        zone.userIds.length > 0 
                          ? 'text-muted-foreground/60' 
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

/// <reference path="../jest.d.ts" />

import { zoneService } from '@/services/api/zones';
import { ZONE_COLORS, ZoneFilters } from '@/types/zones';

// Note: The zones service uses mock data internally with delays,
// so we're testing the service logic directly

describe('ZoneService', () => {
  describe('getZones', () => {
    it('should fetch all zones with default filters', async () => {
      const result = await zoneService.getZones();

      expect(result.zones).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter zones by search term', async () => {
      const filters: ZoneFilters = { search: 'Norte' };
      const result = await zoneService.getZones(filters);

      expect(result.zones.every(z =>
        z.name.toLowerCase().includes('norte') ||
        z.description?.toLowerCase().includes('norte')
      )).toBe(true);
    });

    it('should filter zones by enabled status', async () => {
      const filters: ZoneFilters = { isEnabled: true };
      const result = await zoneService.getZones(filters);

      expect(result.zones.every(z => z.isEnabled === true)).toBe(true);
    });

    it('should filter zones by disabled status', async () => {
      const filters: ZoneFilters = { isEnabled: false };
      const result = await zoneService.getZones(filters);

      expect(result.zones.every(z => z.isEnabled === false)).toBe(true);
    });

    it('should filter zones with users', async () => {
      const filters: ZoneFilters = { hasUsers: true };
      const result = await zoneService.getZones(filters);

      expect(result.zones.every(z => z.userIds.length > 0)).toBe(true);
    });

    it('should filter zones without users', async () => {
      const filters: ZoneFilters = { hasUsers: false };
      const result = await zoneService.getZones(filters);

      expect(result.zones.every(z => z.userIds.length === 0)).toBe(true);
    });

    it('should sort zones by name ascending', async () => {
      const filters: ZoneFilters = { sortBy: 'name', sortOrder: 'asc' };
      const result = await zoneService.getZones(filters);

      for (let i = 1; i < result.zones.length; i++) {
        expect(result.zones[i - 1].name <= result.zones[i].name).toBe(true);
      }
    });

    it('should sort zones by name descending', async () => {
      const filters: ZoneFilters = { sortBy: 'name', sortOrder: 'desc' };
      const result = await zoneService.getZones(filters);

      for (let i = 1; i < result.zones.length; i++) {
        expect(result.zones[i - 1].name >= result.zones[i].name).toBe(true);
      }
    });

    it('should paginate results', async () => {
      const filters: ZoneFilters = { page: 1, limit: 2 };
      const result = await zoneService.getZones(filters);

      expect(result.zones.length).toBeLessThanOrEqual(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getZoneById', () => {
    it('should fetch a zone with details', async () => {
      const zones = await zoneService.getZones();
      const firstZone = zones.zones[0];

      const result = await zoneService.getZoneById(firstZone.id);

      expect(result.id).toBe(firstZone.id);
      expect(result.name).toBe(firstZone.name);
      expect(result.users).toBeDefined();
      expect(result.clients).toBeDefined();
    });

    it('should throw error for non-existent zone', async () => {
      await expect(zoneService.getZoneById('invalid-id')).rejects.toThrow('Zona no encontrada');
    });
  });

  describe('createZone', () => {
    it('should create a new zone', async () => {
      const availableColors = zoneService.getAvailableColors();
      const newZoneData = {
        name: `Zona Test ${Date.now()}`,
        description: 'Zona de prueba',
        color: availableColors[0] || ZONE_COLORS[5],
        isEnabled: true,
        userIds: [],
      };

      const result = await zoneService.createZone(newZoneData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(newZoneData.name);
      expect(result.description).toBe(newZoneData.description);
      expect(result.isEnabled).toBe(true);
      expect(result.clientCount).toBe(0);
    });

    it('should throw error for duplicate name', async () => {
      const zones = await zoneService.getZones();
      const existingName = zones.zones[0].name;

      const duplicateZone = {
        name: existingName,
        description: 'Duplicate',
        color: ZONE_COLORS[6],
        isEnabled: true,
        userIds: [],
      };

      await expect(zoneService.createZone(duplicateZone)).rejects.toThrow(
        'Ya existe una zona con ese nombre'
      );
    });

    it('should throw error for invalid user IDs', async () => {
      const invalidZone = {
        name: `Zona Invalid ${Date.now()}`,
        description: 'Test',
        color: ZONE_COLORS[7],
        isEnabled: true,
        userIds: ['invalid-user-1', 'invalid-user-2'],
      };

      await expect(zoneService.createZone(invalidZone)).rejects.toThrow('Usuarios no válidos');
    });
  });

  describe('updateZone', () => {
    it('should update an existing zone', async () => {
      const zones = await zoneService.getZones();
      const zoneToUpdate = zones.zones[0];

      const updateData = {
        id: zoneToUpdate.id,
        description: 'Descripción actualizada',
      };

      const result = await zoneService.updateZone(updateData);

      expect(result.id).toBe(zoneToUpdate.id);
      expect(result.description).toBe('Descripción actualizada');
      expect(result.updatedAt.getTime()).toBeGreaterThan(zoneToUpdate.updatedAt.getTime());
    });

    it('should throw error for non-existent zone', async () => {
      const updateData = {
        id: 'invalid-id',
        name: 'New Name',
      };

      await expect(zoneService.updateZone(updateData)).rejects.toThrow('Zona no encontrada');
    });

    it('should throw error for duplicate name on update', async () => {
      const zones = await zoneService.getZones();
      if (zones.zones.length < 2) return; // Skip if not enough zones

      const updateData = {
        id: zones.zones[1].id,
        name: zones.zones[0].name, // Try to use existing name
      };

      await expect(zoneService.updateZone(updateData)).rejects.toThrow(
        'Ya existe una zona con ese nombre'
      );
    });
  });

  describe('deleteZone', () => {
    it('should not delete zone with assigned users', async () => {
      const zones = await zoneService.getZones({ hasUsers: true });
      if (zones.zones.length === 0) return; // Skip if no zones with users

      const zoneWithUsers = zones.zones[0];

      await expect(zoneService.deleteZone(zoneWithUsers.id)).rejects.toThrow(
        'No se puede eliminar una zona que tiene usuarios asignados'
      );
    });

    it('should throw error for non-existent zone', async () => {
      await expect(zoneService.deleteZone('invalid-id')).rejects.toThrow('Zona no encontrada');
    });
  });

  describe('toggleZoneStatus', () => {
    it('should toggle zone status', async () => {
      const zones = await zoneService.getZones();
      const zone = zones.zones[0];
      const originalStatus = zone.isEnabled;

      const result = await zoneService.toggleZoneStatus(zone.id);

      expect(result.isEnabled).toBe(!originalStatus);

      // Toggle back to original
      await zoneService.toggleZoneStatus(zone.id);
    });

    it('should throw error for non-existent zone', async () => {
      await expect(zoneService.toggleZoneStatus('invalid-id')).rejects.toThrow('Zona no encontrada');
    });
  });

  describe('getZoneMetrics', () => {
    it('should return zone metrics', async () => {
      const metrics = await zoneService.getZoneMetrics();

      expect(metrics.totalZones).toBeGreaterThan(0);
      expect(metrics.enabledZones + metrics.disabledZones).toBe(metrics.totalZones);
      expect(metrics.zonesWithUsers + metrics.zonesWithoutUsers).toBe(metrics.totalZones);
      expect(metrics.totalClientsInZones).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAvailableUsers', () => {
    it('should return available users', async () => {
      const users = await zoneService.getAvailableUsers();

      expect(users.length).toBeGreaterThan(0);
      expect(users.every(u => u.status === 'ACTIVE' || u.status === 'SUSPENDED')).toBe(true);
    });
  });

  describe('getUsersByZone', () => {
    it('should return users for a zone', async () => {
      const zones = await zoneService.getZones({ hasUsers: true });
      if (zones.zones.length === 0) return;

      const zoneWithUsers = zones.zones[0];
      const users = await zoneService.getUsersByZone(zoneWithUsers.id);

      expect(users.length).toBeGreaterThan(0);
      expect(users.every(u => zoneWithUsers.userIds.includes(u.id))).toBe(true);
    });

    it('should throw error for non-existent zone', async () => {
      await expect(zoneService.getUsersByZone('invalid-id')).rejects.toThrow('Zona no encontrada');
    });
  });

  describe('getAvailableColors', () => {
    it('should return available colors', () => {
      const colors = zoneService.getAvailableColors();

      expect(Array.isArray(colors)).toBe(true);
      colors.forEach(color => {
        expect(ZONE_COLORS).toContain(color);
      });
    });
  });

  describe('isColorAvailable', () => {
    it('should check if color is available', async () => {
      const zones = await zoneService.getZones();
      const usedColor = zones.zones[0].color;
      const availableColors = zoneService.getAvailableColors();

      // Used color should not be available
      expect(zoneService.isColorAvailable(usedColor)).toBe(false);

      // Available color should be available
      if (availableColors.length > 0) {
        expect(zoneService.isColorAvailable(availableColors[0])).toBe(true);
      }
    });

    it('should allow same color when excluding current zone', async () => {
      const zones = await zoneService.getZones();
      const zone = zones.zones[0];

      // Color should be available when excluding its own zone
      expect(zoneService.isColorAvailable(zone.color, zone.id)).toBe(true);
    });
  });
});

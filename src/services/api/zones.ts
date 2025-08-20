// src/services/api/zones.ts
import { 
  Zone, 
  ZoneFilters, 
  CreateZoneRequest, 
  UpdateZoneRequest, 
  ZoneListResponse,
  ZoneWithDetails,
  ZoneMetrics,
  ZONE_COLORS 
} from '@/types/zones';
import { User } from '@/types/users';

// Mock data para desarrollo
const mockUsers: User[] = [
  {
    id: "2",
    companyId: "1",
    email: "supervisor@handysales.com",
    name: "Juan Pérez",
    phone: "555-0101",
    role: "SUPERVISOR" as User['role'],
    status: "ACTIVE" as User['status'],
    zone: "Norte",
    lastLogin: new Date("2025-01-14T09:15:00"),
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "3",
    companyId: "1",
    email: "vendedor1@handysales.com",
    name: "Carlos Mendoza",
    phone: "555-0102",
    role: "VENDEDOR" as User['role'],
    status: "ACTIVE" as User['status'],
    zone: "Norte",
    supervisor: "2",
    lastLogin: new Date("2025-01-14T08:00:00"),
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "4",
    companyId: "1",
    email: "vendedor2@handysales.com",
    name: "María García",
    phone: "555-0103",
    role: "VENDEDOR" as User['role'],
    status: "ACTIVE" as User['status'],
    zone: "Sur",
    supervisor: "2",
    lastLogin: new Date("2025-01-14T07:45:00"),
    createdAt: new Date("2024-07-10"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "5",
    companyId: "1",
    email: "vendedor3@handysales.com",
    name: "Pedro López",
    phone: "555-0104",
    role: "VENDEDOR" as User['role'],
    status: "SUSPENDED" as User['status'],
    zone: "Centro",
    supervisor: "2",
    isLocked: true,
    createdAt: new Date("2024-08-20"),
    updatedAt: new Date("2025-01-10"),
  },
];

// eslint-disable-next-line prefer-const
let mockZones: Zone[] = [
  {
    id: "1",
    name: "Zona Norte",
    description: "Cobertura de clientes mayoristas del norte de la ciudad",
    color: ZONE_COLORS[0], // #FF6B6B - Rojo
    isEnabled: true,
    userIds: ["2", "3"], // Juan Pérez (Supervisor) y Carlos Mendoza (Vendedor)
    clientCount: 15,
    projectCount: 8,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "2", 
    name: "Zona Sur",
    description: "Área comercial sur con enfoque en minoristas",
    color: ZONE_COLORS[1], // #4ECDC4 - Turquesa
    isEnabled: true,
    userIds: ["4"], // María García (Vendedor)
    clientCount: 22,
    projectCount: 12,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "3",
    name: "Zona Centro",
    description: "Centro de la ciudad - zona comercial principal",
    color: ZONE_COLORS[2], // #45B7D1 - Azul
    isEnabled: false, // Deshabilitada porque Pedro López está suspendido
    userIds: ["5"], // Pedro López (Vendedor suspendido)
    clientCount: 8,
    projectCount: 3,
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2025-01-10"),
  },
];

// Simular delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ZoneService {
  async getZones(filters: ZoneFilters = {}): Promise<ZoneListResponse> {
    await delay(500);
    
    let filteredZones = [...mockZones];
    
    // Aplicar filtros
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredZones = filteredZones.filter(zone => 
        zone.name.toLowerCase().includes(search) ||
        zone.description?.toLowerCase().includes(search)
      );
    }
    
    if (filters.isEnabled !== undefined) {
      filteredZones = filteredZones.filter(zone => zone.isEnabled === filters.isEnabled);
    }
    
    if (filters.hasUsers !== undefined) {
      if (filters.hasUsers) {
        filteredZones = filteredZones.filter(zone => zone.userIds.length > 0);
      } else {
        filteredZones = filteredZones.filter(zone => zone.userIds.length === 0);
      }
    }
    
    // Ordenar
    if (filters.sortBy) {
      filteredZones.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;
        
        switch (filters.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'clientCount':
            aValue = a.clientCount || 0;
            bValue = b.clientCount || 0;
            break;
          case 'userCount':
            aValue = a.userIds.length;
            bValue = b.userIds.length;
            break;
          default:
            aValue = a.name;
            bValue = b.name;
        }
        
        if (filters.sortOrder === 'desc') {
          return aValue > bValue ? -1 : 1;
        }
        return aValue < bValue ? -1 : 1;
      });
    }
    
    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedZones = filteredZones.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredZones.length / limit);
    
    return {
      zones: paginatedZones,
      total: filteredZones.length,
      page,
      limit,
      totalPages,
    };
  }

  async getZoneById(id: string): Promise<ZoneWithDetails> {
    await delay(300);
    
    const zone = mockZones.find(z => z.id === id);
    if (!zone) {
      throw new Error('Zona no encontrada');
    }
    
    // Agregar detalles de usuarios
    const users = mockUsers
      .filter(user => zone.userIds.includes(user.id))
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));
    
    // Simular clientes de la zona
    const clients = [
      { id: '1', name: 'Distribuidora El Sol', type: 'mayorista' },
      { id: '2', name: 'Tienda La Esquina', type: 'minorista' },
      { id: '3', name: 'Supermercado Central', type: 'distribuidor' },
    ].slice(0, zone.clientCount ? Math.min(3, zone.clientCount) : 0);
    
    return {
      ...zone,
      users,
      clients,
    };
  }

  async createZone(zoneData: CreateZoneRequest): Promise<Zone> {
    await delay(800);
    
    // Validar que el nombre no esté duplicado
    const nameExists = mockZones.some(zone => 
      zone.name.toLowerCase() === zoneData.name.toLowerCase()
    );
    
    if (nameExists) {
      throw new Error('Ya existe una zona con ese nombre');
    }
    
    // Validar que los usuarios existen
    const invalidUsers = zoneData.userIds.filter(userId => 
      !mockUsers.some(user => user.id === userId)
    );
    
    if (invalidUsers.length > 0) {
      throw new Error(`Usuarios no válidos: ${invalidUsers.join(', ')}`);
    }
    
    const newZone: Zone = {
      id: Date.now().toString(),
      name: zoneData.name,
      description: zoneData.description,
      color: zoneData.color,
      isEnabled: zoneData.isEnabled,
      userIds: zoneData.userIds,
      clientCount: 0,
      projectCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockZones.push(newZone);
    return newZone;
  }

  async updateZone(zoneData: UpdateZoneRequest): Promise<Zone> {
    await delay(800);
    
    const zoneIndex = mockZones.findIndex(z => z.id === zoneData.id);
    if (zoneIndex === -1) {
      throw new Error('Zona no encontrada');
    }
    
    // Validar nombre único (excluyendo la zona actual)
    if (zoneData.name) {
      const nameExists = mockZones.some((zone, index) => 
        index !== zoneIndex && 
        zone.name.toLowerCase() === zoneData.name!.toLowerCase()
      );
      
      if (nameExists) {
        throw new Error('Ya existe una zona con ese nombre');
      }
    }
    
    // Validar usuarios si se proporcionan
    if (zoneData.userIds) {
      const invalidUsers = zoneData.userIds.filter(userId => 
        !mockUsers.some(user => user.id === userId)
      );
      
      if (invalidUsers.length > 0) {
        throw new Error(`Usuarios no válidos: ${invalidUsers.join(', ')}`);
      }
    }
    
    const updatedZone = {
      ...mockZones[zoneIndex],
      ...zoneData,
      updatedAt: new Date(),
    };
    
    mockZones[zoneIndex] = updatedZone;
    return updatedZone;
  }

  async deleteZone(id: string): Promise<{ message: string }> {
    await delay(500);
    
    const zoneIndex = mockZones.findIndex(z => z.id === id);
    if (zoneIndex === -1) {
      throw new Error('Zona no encontrada');
    }
    
    const zone = mockZones[zoneIndex];
    
    // Verificar si tiene usuarios asignados
    if (zone.userIds.length > 0) {
      throw new Error('No se puede eliminar una zona que tiene usuarios asignados');
    }
    
    mockZones.splice(zoneIndex, 1);
    return { message: 'Zona eliminada exitosamente' };
  }

  async toggleZoneStatus(id: string): Promise<Zone> {
    await delay(300);
    
    const zoneIndex = mockZones.findIndex(z => z.id === id);
    if (zoneIndex === -1) {
      throw new Error('Zona no encontrada');
    }
    
    mockZones[zoneIndex] = {
      ...mockZones[zoneIndex],
      isEnabled: !mockZones[zoneIndex].isEnabled,
      updatedAt: new Date(),
    };
    
    return mockZones[zoneIndex];
  }

  async getZoneMetrics(): Promise<ZoneMetrics> {
    await delay(200);
    
    const totalZones = mockZones.length;
    const enabledZones = mockZones.filter(z => z.isEnabled).length;
    const disabledZones = totalZones - enabledZones;
    const zonesWithUsers = mockZones.filter(z => z.userIds.length > 0).length;
    const zonesWithoutUsers = totalZones - zonesWithUsers;
    const totalClientsInZones = mockZones.reduce((sum, z) => sum + (z.clientCount || 0), 0);
    
    return {
      totalZones,
      enabledZones,
      disabledZones,
      zonesWithUsers,
      zonesWithoutUsers,
      totalClientsInZones,
    };
  }

  async getAvailableUsers(): Promise<User[]> {
    await delay(200);
    
    // Retornar todos los usuarios disponibles para asignar a zonas
    return mockUsers.filter(user => user.status === 'ACTIVE' || user.status === 'SUSPENDED');
  }

  async getUsersByZone(zoneId: string): Promise<User[]> {
    await delay(200);
    
    const zone = mockZones.find(z => z.id === zoneId);
    if (!zone) {
      throw new Error('Zona no encontrada');
    }
    
    return mockUsers.filter(user => zone.userIds.includes(user.id));
  }

  // Helper para obtener colores disponibles
  getAvailableColors(): string[] {
    const usedColors = mockZones.map(z => z.color);
    return ZONE_COLORS.filter(color => !usedColors.includes(color));
  }

  // Helper para validar color
  isColorAvailable(color: string, excludeZoneId?: string): boolean {
    return !mockZones.some(zone => 
      zone.color === color && zone.id !== excludeZoneId
    );
  }
}

export const zoneService = new ZoneService();
export default zoneService;

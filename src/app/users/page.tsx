"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { Separator } from "@/components/ui";
import { toast } from "@/hooks/useToast";
import { useSession } from "next-auth/react";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Lock,
  Unlock,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Monitor,
  Crown,
  UserCheck,
  UserX,
  Send,
  Copy,
  Download,
  Search,
  Filter
} from "lucide-react";
import { UserRole, UserStatus, MembershipPlan, type User } from "@/types/users";

// Mock data para desarrollo
const mockCompany = {
  id: "1",
  name: "Distribuidora El Sol",
  plan: MembershipPlan.PROFESSIONAL,
  maxUsers: 20,
  currentUsers: 8,
  planExpiresAt: new Date("2025-12-31"),
};

const mockUsers: User[] = [
  {
    id: "1",
    companyId: "1",
    email: "admin@handysales.com",
    name: "Admin Usuario",
    phone: "555-0100",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    lastLogin: new Date("2025-01-14T10:30:00"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "2",
    companyId: "1",
    email: "supervisor@handysales.com",
    name: "Juan Pérez",
    phone: "555-0101",
    role: UserRole.SUPERVISOR,
    status: UserStatus.ACTIVE,
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
    role: UserRole.VENDEDOR,
    status: UserStatus.ACTIVE,
    code: "V001",
    zone: "Norte",
    supervisor: "2",
    commissionRate: 5,
    dailyTarget: 50000,
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
    role: UserRole.VENDEDOR,
    status: UserStatus.ACTIVE,
    code: "V002",
    zone: "Sur",
    supervisor: "2",
    commissionRate: 5,
    dailyTarget: 45000,
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
    role: UserRole.VENDEDOR,
    status: UserStatus.SUSPENDED,
    code: "V003",
    zone: "Centro",
    supervisor: "2",
    isLocked: true,
    createdAt: new Date("2024-08-20"),
    updatedAt: new Date("2025-01-10"),
  },
  {
    id: "6",
    companyId: "1",
    email: "nuevo@handysales.com",
    name: "Ana Martínez",
    role: UserRole.VENDEDOR,
    status: UserStatus.PENDING,
    createdAt: new Date("2025-01-12"),
    updatedAt: new Date("2025-01-12"),
  },
];

const roleColors = {
  [UserRole.SUPER_ADMIN]: "bg-purple-500",
  [UserRole.ADMIN]: "bg-blue-500",
  [UserRole.SUPERVISOR]: "bg-green-500",
  [UserRole.VENDEDOR]: "bg-gray-500",
  [UserRole.VIEWER]: "bg-gray-400",
};

const statusColors = {
  [UserStatus.ACTIVE]: "bg-green-500",
  [UserStatus.INACTIVE]: "bg-gray-400",
  [UserStatus.SUSPENDED]: "bg-red-500",
  [UserStatus.PENDING]: "bg-yellow-500",
  [UserStatus.TRIAL]: "bg-blue-400",
};

const roleLabels = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.ADMIN]: "Administrador",
  [UserRole.SUPERVISOR]: "Supervisor",
  [UserRole.VENDEDOR]: "Vendedor",
  [UserRole.VIEWER]: "Visor",
};

const statusLabels = {
  [UserStatus.ACTIVE]: "Activo",
  [UserStatus.INACTIVE]: "Inactivo",
  [UserStatus.SUSPENDED]: "Suspendido",
  [UserStatus.PENDING]: "Pendiente",
  [UserStatus.TRIAL]: "Prueba",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "all">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Dialogs
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form data
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: UserRole.VENDEDOR,
    phone: "",
    zone: "",
    supervisor: "",
    sendEmail: true,
  });

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Estadísticas
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === UserStatus.ACTIVE).length,
    pending: users.filter(u => u.status === UserStatus.PENDING).length,
    suspended: users.filter(u => u.status === UserStatus.SUSPENDED).length,
    vendedores: users.filter(u => u.role === UserRole.VENDEDOR).length,
  };

  const handleInviteUser = async () => {
    // Validar límite del plan
    if (mockCompany.currentUsers >= mockCompany.maxUsers) {
      toast({
        title: "Límite alcanzado",
        description: `Tu plan ${mockCompany.plan} permite hasta ${mockCompany.maxUsers} usuarios`,
        variant: "destructive",
      });
      return;
    }

    // Simular envío de invitación
    const newUser: User = {
      id: Date.now().toString(),
      companyId: mockCompany.id,
      email: inviteForm.email,
      name: inviteForm.name,
      phone: inviteForm.phone,
      role: inviteForm.role,
      status: UserStatus.PENDING,
      zone: inviteForm.zone,
      supervisor: inviteForm.supervisor,
      createdAt: new Date(),
      updatedAt: new Date(),
      invitedAt: new Date(),
    };

    setUsers([...users, newUser]);
    
    if (inviteForm.sendEmail) {
      toast({
        title: "Invitación enviada",
        description: `Se envió una invitación por email a ${inviteForm.email}`,
      });
    } else {
      toast({
        title: "Usuario creado",
        description: "El usuario fue creado pero no se envió invitación",
      });
    }

    setIsInviteOpen(false);
    setInviteForm({
      email: "",
      name: "",
      role: UserRole.VENDEDOR,
      phone: "",
      zone: "",
      supervisor: "",
      sendEmail: true,
    });
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === UserStatus.ACTIVE 
      ? UserStatus.SUSPENDED 
      : UserStatus.ACTIVE;
    
    setUsers(users.map(u => 
      u.id === user.id 
        ? { ...u, status: newStatus, isLocked: newStatus === UserStatus.SUSPENDED }
        : u
    ));

    toast({
      title: newStatus === UserStatus.ACTIVE ? "Usuario activado" : "Usuario suspendido",
      description: `${user.name} ha sido ${newStatus === UserStatus.ACTIVE ? "activado" : "suspendido"}`,
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setUsers(users.filter(u => u.id !== selectedUser.id));
    
    toast({
      title: "Usuario eliminado",
      description: `${selectedUser.name} ha sido eliminado del sistema`,
    });

    setIsDeleteOpen(false);
    setSelectedUser(null);
  };

  const handleResendInvitation = async (user: User) => {
    toast({
      title: "Invitación reenviada",
      description: `Se reenvió la invitación a ${user.email}`,
    });
  };

  const handleCopyInviteLink = (user: User) => {
    const inviteLink = `${window.location.origin}/invite?token=mock-token-${user.id}`;
    navigator.clipboard.writeText(inviteLink);
    
    toast({
      title: "Enlace copiado",
      description: "El enlace de invitación se copió al portapapeles",
    });
  };

  const formatLastLogin = (date?: Date) => {
    if (!date) return "Nunca";
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Hace menos de 1 hora";
    if (hours < 24) return `Hace ${hours} horas`;
    if (hours < 48) return "Ayer";
    
    return date.toLocaleDateString("es-MX");
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              Administra los usuarios y permisos de tu equipo
            </p>
          </div>
          
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invitar nuevo usuario</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    placeholder="Juan Pérez"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm({...inviteForm, role: value as UserRole})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                      <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
                      <SelectItem value={UserRole.VENDEDOR}>Vendedor</SelectItem>
                      <SelectItem value={UserRole.VIEWER}>Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="555-0100"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({...inviteForm, phone: e.target.value})}
                  />
                </div>
                
                {(inviteForm.role === UserRole.VENDEDOR || inviteForm.role === UserRole.SUPERVISOR) && (
                  <div className="space-y-2">
                    <Label htmlFor="zone">Zona</Label>
                    <Input
                      id="zone"
                      placeholder="Norte, Sur, Centro..."
                      value={inviteForm.zone}
                      onChange={(e) => setInviteForm({...inviteForm, zone: e.target.value})}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={inviteForm.sendEmail}
                    onChange={(e) => setInviteForm({...inviteForm, sendEmail: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="sendEmail" className="text-sm font-normal">
                    Enviar invitación por email
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInviteUser}>
                  Invitar Usuario
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plan Info */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white rounded-lg">
                <Crown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Plan {mockCompany.plan}</h3>
                <p className="text-sm text-muted-foreground">
                  {mockCompany.currentUsers} de {mockCompany.maxUsers} usuarios utilizados
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Vence el</p>
              <p className="font-semibold">
                {mockCompany.planExpiresAt.toLocaleDateString("es-MX")}
              </p>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="w-full bg-white rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(mockCompany.currentUsers / mockCompany.maxUsers) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total usuarios</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspendidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
              </div>
              <UserX className="h-8 w-8 text-red-400" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendedores</p>
                <p className="text-2xl font-bold">{stats.vendedores}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, email o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as UserRole | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                <SelectItem value={UserRole.SUPERVISOR}>Supervisor</SelectItem>
                <SelectItem value={UserRole.VENDEDOR}>Vendedor</SelectItem>
                <SelectItem value={UserRole.VIEWER}>Visor</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as UserStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value={UserStatus.ACTIVE}>Activo</SelectItem>
                <SelectItem value={UserStatus.PENDING}>Pendiente</SelectItem>
                <SelectItem value={UserStatus.SUSPENDED}>Suspendido</SelectItem>
                <SelectItem value={UserStatus.INACTIVE}>Inactivo</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.code && (
                          <span className="text-xs text-gray-500">Código: {user.code}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={`${roleColors[user.role]} text-white`}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColors[user.status]}`} />
                      <span className="text-sm">{statusLabels[user.status]}</span>
                      {user.isLocked && (
                        <Lock className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {user.zone || "-"}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.lastLogin && (
                        <>
                          {user.devices?.some(d => d.platform === 'android' || d.platform === 'ios') ? (
                            <Smartphone className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Monitor className="h-4 w-4 text-gray-400" />
                          )}
                        </>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatLastLogin(user.lastLogin)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.status === UserStatus.PENDING && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendInvitation(user)}
                            title="Reenviar invitación"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyInviteLink(user)}
                            title="Copiar enlace"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleUserStatus(user)}
                        title={user.status === UserStatus.ACTIVE ? "Suspender" : "Activar"}
                      >
                        {user.status === UserStatus.ACTIVE ? (
                          <Lock className="h-4 w-4 text-red-500" />
                        ) : (
                          <Unlock className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditOpen(true);
                        }}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDeleteOpen(true);
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar usuario?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                ¿Estás seguro de que deseas eliminar a <strong>{selectedUser?.name}</strong>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Eliminar Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

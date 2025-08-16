"use client";

import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from "@/hooks/useToast";
import { useSession } from "next-auth/react";
import { 
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Calendar,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  MapPin,
  Building,
  Languages,
  Clock,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Palette,
  Eye,
  EyeOff
} from "lucide-react";

// Mock user data
const mockUser = {
  id: "1",
  name: "Carlos Mendoza",
  email: "carlos@handysales.com",
  phone: "555-0100",
  role: "VENDEDOR",
  avatar: "",
  company: "Distribuidora El Sol",
  department: "Ventas",
  location: "Ciudad de México",
  language: "es",
  timezone: "America/Mexico_City",
  joinedDate: new Date("2024-01-15"),
  lastPasswordChange: new Date("2024-11-01"),
  twoFactorEnabled: false,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  theme: "light",
  compactMode: false,
};

const mockDevices = [
  {
    id: "1",
    name: "iPhone 14 Pro",
    type: "mobile",
    platform: "iOS",
    lastActive: new Date("2025-01-14T10:30:00"),
    current: true,
  },
  {
    id: "2",
    name: "Chrome - Windows",
    type: "desktop",
    platform: "Windows",
    lastActive: new Date("2025-01-14T09:15:00"),
    current: false,
  },
  {
    id: "3",
    name: "Safari - MacBook",
    type: "desktop",
    platform: "macOS",
    lastActive: new Date("2025-01-10T14:20:00"),
    current: false,
  },
];

const mockActivity = [
  {
    id: "1",
    action: "Inicio de sesión",
    timestamp: new Date("2025-01-14T08:00:00"),
    device: "iPhone 14 Pro",
    ip: "192.168.1.100",
  },
  {
    id: "2",
    action: "Cambio de contraseña",
    timestamp: new Date("2025-01-10T15:30:00"),
    device: "Chrome - Windows",
    ip: "192.168.1.101",
  },
  {
    id: "3",
    action: "Actualización de perfil",
    timestamp: new Date("2025-01-08T11:20:00"),
    device: "Safari - MacBook",
    ip: "192.168.1.102",
  },
];

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: mockUser.phone,
    department: mockUser.department,
    location: mockUser.location,
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [preferences, setPreferences] = useState({
    language: mockUser.language,
    timezone: mockUser.timezone,
    theme: mockUser.theme,
    compactMode: mockUser.compactMode,
    emailNotifications: mockUser.emailNotifications,
    pushNotifications: mockUser.pushNotifications,
    smsNotifications: mockUser.smsNotifications,
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleSaveProfile = () => {
    toast({
      title: "Perfil actualizado",
      description: "Tu información personal ha sido actualizada correctamente",
    });
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Contraseña actualizada",
      description: "Tu contraseña ha sido cambiada exitosamente",
    });
    
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferencias guardadas",
      description: "Tus preferencias han sido actualizadas",
    });
  };

  const handleAvatarUpload = () => {
    toast({
      title: "Foto actualizada",
      description: "Tu foto de perfil ha sido actualizada",
    });
  };

  const handleRevokeDevice = (deviceId: string) => {
    toast({
      title: "Dispositivo revocado",
      description: "El dispositivo ha sido desconectado de tu cuenta",
    });
  };

  const handleEnable2FA = () => {
    toast({
      title: "2FA configurado",
      description: "La autenticación de dos factores ha sido activada",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu información personal y preferencias
          </p>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getInitials(mockUser.name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarUpload}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold">{mockUser.name}</h2>
                <p className="text-muted-foreground">{mockUser.email}</p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <Badge>{mockUser.role}</Badge>
                  <Badge variant="outline">
                    <Building className="h-3 w-3 mr-1" />
                    {mockUser.company}
                  </Badge>
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {mockUser.location}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Miembro desde {formatDate(mockUser.joinedDate)}
                </p>
              </div>
              
              <div className="text-center md:text-right">
                <Button onClick={() => setIsEditing(true)}>
                  Editar Perfil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Actualiza tu información personal y de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Input
                      id="department"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Input value={mockUser.role} disabled />
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Última actualización: {formatDate(mockUser.lastPasswordChange)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  />
                </div>
                
                <Button onClick={handleChangePassword}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Autenticación de Dos Factores</CardTitle>
                <CardDescription>
                  Añade una capa extra de seguridad a tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">2FA</p>
                      <p className="text-sm text-muted-foreground">
                        {mockUser.twoFactorEnabled ? "Activado" : "Desactivado"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={mockUser.twoFactorEnabled ? "outline" : "default"}
                    onClick={handleEnable2FA}
                  >
                    {mockUser.twoFactorEnabled ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select value={preferences.language} onValueChange={(value) => setPreferences({...preferences, language: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona horaria</Label>
                    <Select value={preferences.timezone} onValueChange={(value) => setPreferences({...preferences, timezone: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                        <SelectItem value="America/Bogota">Bogotá</SelectItem>
                        <SelectItem value="America/New_York">Nueva York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Apariencia</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {preferences.theme === "light" ? (
                        <Sun className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Moon className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Tema</p>
                        <p className="text-sm text-muted-foreground">
                          {preferences.theme === "light" ? "Claro" : "Oscuro"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPreferences({...preferences, theme: preferences.theme === "light" ? "dark" : "light"})}
                    >
                      Cambiar
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Palette className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Modo compacto</p>
                        <p className="text-sm text-muted-foreground">
                          Reduce el espaciado en la interfaz
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.compactMode}
                      onChange={(e) => setPreferences({...preferences, compactMode: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Notificaciones</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">
                          Recibir notificaciones por correo
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Push</p>
                        <p className="text-sm text-muted-foreground">
                          Notificaciones en el navegador
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications}
                      onChange={(e) => setPreferences({...preferences, pushNotifications: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS</p>
                        <p className="text-sm text-muted-foreground">
                          Notificaciones por mensaje de texto
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.smsNotifications}
                      onChange={(e) => setPreferences({...preferences, smsNotifications: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSavePreferences}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Preferencias
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dispositivos Conectados</CardTitle>
                <CardDescription>
                  Gestiona los dispositivos que tienen acceso a tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {device.type === "mobile" ? (
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.platform} • Último acceso: {formatTime(device.lastActive)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.current && (
                          <Badge className="bg-green-500 text-white">
                            Sesión actual
                          </Badge>
                        )}
                        {!device.current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeDevice(device.id)}
                          >
                            Revocar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Actividad</CardTitle>
                <CardDescription>
                  Registro de las últimas acciones en tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="p-2 bg-muted rounded-full">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(activity.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.device} • IP: {activity.ip}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

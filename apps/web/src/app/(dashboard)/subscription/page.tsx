"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { toast } from "@/hooks/useToast";
import { useSession } from "next-auth/react";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { 
  Crown,
  CreditCard,
  Users,
  Check,
  X,
  TrendingUp,
  Calendar,
  Download,
  Mail,
  Phone,
  Building,
  MapPin,
  Receipt,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  Smartphone
} from "lucide-react";
import { MembershipPlan } from "@/types/users";

const plans = [
  {
    id: MembershipPlan.TRIAL,
    name: "Prueba Gratuita",
    price: 0,
    period: "14 días",
    color: "bg-gray-500",
    features: {
      users: 3,
      mobileApp: true,
      support: "Comunidad",
      storage: "100 MB",
      reports: "Básicos",
      api: false,
      customization: false,
      training: false,
    },
    popular: false,
  },
  {
    id: MembershipPlan.BASIC,
    name: "Básico",
    price: 499,
    period: "mes",
    color: "bg-blue-500",
    features: {
      users: 5,
      mobileApp: true,
      support: "Email",
      storage: "5 GB",
      reports: "Estándar",
      api: false,
      customization: false,
      training: "Videos",
    },
    popular: false,
  },
  {
    id: MembershipPlan.PROFESSIONAL,
    name: "Profesional",
    price: 999,
    period: "mes",
    color: "bg-purple-500",
    features: {
      users: 20,
      mobileApp: true,
      support: "Prioritario",
      storage: "50 GB",
      reports: "Avanzados",
      api: true,
      customization: "Básica",
      training: "1 sesión",
    },
    popular: true,
    savings: "Ahorra 20%",
  },
  {
    id: MembershipPlan.ENTERPRISE,
    name: "Empresarial",
    price: 2499,
    period: "mes",
    color: "bg-gradient-to-r from-purple-500 to-blue-500",
    features: {
      users: "Ilimitados",
      mobileApp: true,
      support: "24/7 Dedicado",
      storage: "Ilimitado",
      reports: "Personalizados",
      api: true,
      customization: "Completa",
      training: "Ilimitado",
    },
    popular: false,
  },
];

// Mock data
const mockCompany = {
  id: "1",
  name: "Distribuidora El Sol",
  rfc: "DES123456789",
  address: "Av. Principal 123, Col. Centro",
  phone: "555-0100",
  email: "contacto@distribuidora.com",
  plan: MembershipPlan.PROFESSIONAL,
  planExpiresAt: new Date("2025-02-15"),
  maxUsers: 20,
  currentUsers: 8,
  storageUsed: 12.5, // GB
  storageLimit: 50, // GB
  billingEmail: "facturacion@distribuidora.com",
  nextBillingDate: new Date("2025-02-01"),
  monthlyAmount: 999,
};

const mockInvoices = [
  {
    id: "INV-2025-001",
    date: new Date("2025-01-01"),
    amount: 999,
    status: "paid",
    downloadUrl: "#",
  },
  {
    id: "INV-2024-012",
    date: new Date("2024-12-01"),
    amount: 999,
    status: "paid",
    downloadUrl: "#",
  },
  {
    id: "INV-2024-011",
    date: new Date("2024-11-01"),
    amount: 999,
    status: "paid",
    downloadUrl: "#",
  },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { isAuthorized } = useRequireAdmin();
  const [selectedPlan, setSelectedPlan] = useState(mockCompany.plan);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = plans.find(p => p.id === mockCompany.plan);
  const daysUntilExpiration = Math.ceil(
    (mockCompany.planExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleUpgrade = async (planId: MembershipPlan) => {
    setIsProcessing(true);
    
    // Simular proceso de upgrade
    setTimeout(() => {
      toast({
        title: "Plan actualizado",
        description: `Has cambiado al plan ${plans.find(p => p.id === planId)?.name}`,
      });
      setIsProcessing(false);
    }, 2000);
  };

  const handleCancelSubscription = () => {
    toast({
      title: "Cancelación iniciada",
      description: "Te contactaremos para confirmar la cancelación",
      variant: "destructive",
    });
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast({
      title: "Descargando factura",
      description: `Factura ${invoiceId} descargada`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Suscripción y Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu plan y métodos de pago
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <Crown className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Plan {currentPlan?.name}</CardTitle>
                  <CardDescription>
                    ${currentPlan?.price} MXN / {currentPlan?.period}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                {daysUntilExpiration > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">Renovación en</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {daysUntilExpiration} días
                    </p>
                  </>
                ) : (
                  <Badge variant="destructive">Expirado</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Usuarios</p>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">
                    {mockCompany.currentUsers} / {mockCompany.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${(mockCompany.currentUsers / mockCompany.maxUsers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Almacenamiento</p>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">
                    {mockCompany.storageUsed} / {mockCompany.storageLimit} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(mockCompany.storageUsed / mockCompany.storageLimit) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Próximo pago</p>
                <p className="font-semibold">
                  {mockCompany.nextBillingDate.toLocaleDateString("es-MX")}
                </p>
                <p className="text-sm text-muted-foreground">
                  ${mockCompany.monthlyAmount} MXN
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge className="bg-green-500 text-white">
                  Activo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Planes disponibles</TabsTrigger>
            <TabsTrigger value="billing">Información de facturación</TabsTrigger>
            <TabsTrigger value="invoices">Facturas</TabsTrigger>
            <TabsTrigger value="usage">Uso y límites</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative ${plan.popular ? 'border-2 border-purple-500' : ''} ${
                    plan.id === mockCompany.plan ? 'bg-purple-50' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-500 text-white">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Más popular
                      </Badge>
                    </div>
                  )}
                  
                  {plan.id === mockCompany.plan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-500 text-white">
                        Plan actual
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground ml-1">/ {plan.period}</span>
                    </div>
                    {plan.savings && (
                      <Badge variant="secondary" className="mt-2">
                        {plan.savings}
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {typeof plan.features.users === 'number' 
                            ? `${plan.features.users} usuarios` 
                            : 'Usuarios ilimitados'}
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">App móvil</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{plan.features.storage} almacenamiento</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Soporte {plan.features.support}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Reportes {plan.features.reports}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.features.api ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300" />
                        )}
                        <span className={`text-sm ${!plan.features.api ? 'text-gray-400' : ''}`}>
                          Acceso API
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.features.customization ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300" />
                        )}
                        <span className={`text-sm ${!plan.features.customization ? 'text-gray-400' : ''}`}>
                          Personalización {plan.features.customization || ''}
                        </span>
                      </li>
                    </ul>
                    
                    <Button
                      className="w-full mt-4"
                      variant={plan.id === mockCompany.plan ? "outline" : "default"}
                      disabled={plan.id === mockCompany.plan || plan.id < mockCompany.plan || isProcessing}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {plan.id === mockCompany.plan ? (
                        "Plan actual"
                      ) : plan.id < mockCompany.plan ? (
                        "No disponible"
                      ) : (
                        <>
                          Actualizar
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">¿Necesitas más?</h3>
                      <p className="text-sm text-muted-foreground">
                        Contacta con nosotros para un plan personalizado
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Contactar ventas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Information Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información de la empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Razón social</Label>
                    <p className="text-sm">{mockCompany.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">RFC</Label>
                    <p className="text-sm">{mockCompany.rfc}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dirección fiscal</Label>
                    <p className="text-sm">{mockCompany.address}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email de facturación</Label>
                    <p className="text-sm">{mockCompany.billingEmail}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar información
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Vence 12/25</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-600">Zona de peligro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cancelar suscripción</p>
                    <p className="text-sm text-muted-foreground">
                      Tu suscripción se cancelará al final del período actual
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleCancelSubscription}
                  >
                    Cancelar suscripción
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de facturas</CardTitle>
                <CardDescription>
                  Descarga tus facturas anteriores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.date.toLocaleDateString("es-MX")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">${invoice.amount} MXN</span>
                        <Badge className="bg-green-100 text-green-800">
                          Pagada
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usuarios activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Uso actual</span>
                        <span className="text-sm font-medium">
                          {mockCompany.currentUsers} de {mockCompany.maxUsers}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                          style={{ width: `${(mockCompany.currentUsers / mockCompany.maxUsers) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Administradores</span>
                        <span className="font-medium">1</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Supervisores</span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Vendedores</span>
                        <span className="font-medium">5</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Almacenamiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Uso actual</span>
                        <span className="text-sm font-medium">
                          {mockCompany.storageUsed} GB de {mockCompany.storageLimit} GB
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                          style={{ width: `${(mockCompany.storageUsed / mockCompany.storageLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Documentos</span>
                        <span className="font-medium">3.2 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Imágenes</span>
                        <span className="font-medium">8.1 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Base de datos</span>
                        <span className="font-medium">1.2 GB</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispositivos móviles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">Dispositivos activos</span>
                      </div>
                      <span className="font-semibold">5</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Android</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>iOS</span>
                        <span className="font-medium">2</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-gray-400" />
                        <span className="text-sm">Este mes</span>
                      </div>
                      <span className="font-semibold">12,543</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sincronización</span>
                        <span className="font-medium">8,231</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Reportes</span>
                        <span className="font-medium">2,156</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Otros</span>
                        <span className="font-medium">2,156</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}

// Helper component
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{children}</label>;
}

// Helper component  
function Edit({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>;
}

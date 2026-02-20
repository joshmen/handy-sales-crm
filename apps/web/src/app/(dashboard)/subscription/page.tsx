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
import { useCompany } from "@/contexts/CompanyContext";
import {
  Crown,
  Users,
  Check,
  X,
  Calendar,
  Phone,
  Building,
  ChevronRight,
  Sparkles,
  Zap,
  Loader2,
  Info,
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
    },
    popular: false,
  },
];

function mapPlan(planStr: string | undefined): MembershipPlan {
  if (!planStr) return MembershipPlan.TRIAL;
  const upper = planStr.toUpperCase();
  if (upper === 'PROFESSIONAL' || upper === 'PRO') return MembershipPlan.PROFESSIONAL;
  if (upper === 'BASIC') return MembershipPlan.BASIC;
  if (upper === 'ENTERPRISE') return MembershipPlan.ENTERPRISE;
  return MembershipPlan.TRIAL;
}

function getPlanPrice(plan: MembershipPlan): number {
  return plans.find(p => p.id === plan)?.price ?? 0;
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { isAuthorized } = useRequireAdmin();
  const { settings, isLoading } = useCompany();
  const [isProcessing, setIsProcessing] = useState(false);

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const currentPlanId = mapPlan(settings.subscriptionPlan);
  const currentPlan = plans.find(p => p.id === currentPlanId);
  const maxUsers = settings.maxUsers ?? currentPlan?.features.users ?? 0;
  const currentUsers = settings.currentUsers ?? 0;
  const monthlyAmount = getPlanPrice(currentPlanId);
  const isActive = settings.subscriptionStatus?.toUpperCase() !== 'EXPIRED' && settings.isActive;

  const handleUpgrade = async (planId: MembershipPlan) => {
    setIsProcessing(true);
    setTimeout(() => {
      toast({
        title: "Solicitud recibida",
        description: `Tu solicitud de cambio al plan ${plans.find(p => p.id === planId)?.name} ha sido enviada. Te contactaremos pronto.`,
      });
      setIsProcessing(false);
    }, 1500);
  };

  const handleCancelSubscription = () => {
    toast({
      title: "Cancelación iniciada",
      description: "Te contactaremos para confirmar la cancelación",
      variant: "destructive",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Suscripción</h1>
        <p className="text-muted-foreground mt-1">
          Tu plan actual y opciones disponibles
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
                <CardTitle>Plan {currentPlan?.name ?? settings.subscriptionPlan}</CardTitle>
                <CardDescription>
                  {monthlyAmount > 0 ? `$${monthlyAmount.toLocaleString('es-MX')} MXN / ${currentPlan?.period ?? 'mes'}` : 'Gratis'}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              {isActive ? (
                <Badge className="bg-green-500 text-white">Activo</Badge>
              ) : (
                <Badge variant="destructive">Expirado</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Usuarios</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="font-semibold">
                  {currentUsers} / {typeof maxUsers === 'number' ? maxUsers : '∞'}
                </span>
              </div>
              {typeof maxUsers === 'number' && maxUsers > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((currentUsers / maxUsers) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Empresa</p>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="font-semibold">{settings.companyName}</span>
              </div>
              {settings.taxId && (
                <p className="text-xs text-muted-foreground">RFC: {settings.taxId}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monto mensual</p>
              <p className="font-semibold text-lg">
                {monthlyAmount > 0 ? `$${monthlyAmount.toLocaleString('es-MX')} MXN` : 'Gratis'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Planes disponibles</TabsTrigger>
          <TabsTrigger value="info">Información de cuenta</TabsTrigger>
          <TabsTrigger value="usage">Uso actual</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'border-2 border-purple-500' : ''} ${
                  plan.id === currentPlanId ? 'bg-purple-50' : ''
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

                {plan.id === currentPlanId && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500 text-white">
                      Plan actual
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${plan.price.toLocaleString('es-MX')}</span>
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
                    variant={plan.id === currentPlanId ? "outline" : "default"}
                    disabled={plan.id === currentPlanId || plan.id < currentPlanId || isProcessing}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : plan.id === currentPlanId ? (
                      "Plan actual"
                    ) : plan.id < currentPlanId ? (
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

        {/* Account Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Razón social</p>
                  <p className="text-sm font-medium">{settings.companyName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">RFC</p>
                  <p className="text-sm font-medium">{settings.taxId || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Email de contacto</p>
                  <p className="text-sm font-medium">{settings.contactEmail || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Teléfono</p>
                  <p className="text-sm font-medium">{settings.contactPhone || '—'}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Dirección</p>
                  <p className="text-sm font-medium">
                    {[settings.address, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Para actualizar esta información ve a <a href="/settings" className="text-blue-600 hover:underline">Configuración</a></span>
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
                        {currentUsers} de {typeof maxUsers === 'number' ? maxUsers : '∞'}
                      </span>
                    </div>
                    {typeof maxUsers === 'number' && maxUsers > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((currentUsers / maxUsers) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {typeof maxUsers === 'number' && currentUsers >= maxUsers && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <Info className="h-4 w-4" />
                        <span>Has alcanzado el límite de usuarios. Considera actualizar tu plan.</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles del plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{currentPlan?.name ?? settings.subscriptionPlan}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estado</span>
                    {isActive ? (
                      <Badge className="bg-green-100 text-green-800">Activo</Badge>
                    ) : (
                      <Badge variant="destructive">Expirado</Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Máx. usuarios</span>
                    <span className="font-medium">{typeof maxUsers === 'number' ? maxUsers : 'Ilimitados'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Soporte</span>
                    <span className="font-medium">{currentPlan?.features.support ?? '—'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Acceso API</span>
                    <span className="font-medium">{currentPlan?.features.api ? 'Sí' : 'No'}</span>
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

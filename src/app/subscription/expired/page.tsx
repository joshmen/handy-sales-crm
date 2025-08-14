"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  AlertTriangle, 
  CreditCard, 
  Phone, 
  Mail, 
  MessageSquare,
  CheckCircle
} from "lucide-react";
import { signOut } from "next-auth/react";

const plans = [
  {
    name: "BÁSICO",
    price: 999,
    users: "1-5 usuarios",
    features: [
      "Hasta 5 vendedores",
      "100 clientes",
      "Gestión de rutas básica",
      "Reportes básicos",
      "Soporte por email",
    ],
  },
  {
    name: "PROFESIONAL",
    price: 2999,
    users: "6-20 usuarios",
    featured: true,
    features: [
      "Hasta 20 vendedores",
      "Clientes ilimitados",
      "Gestión avanzada de rutas",
      "Reportes personalizados",
      "Integración con app móvil",
      "Soporte prioritario",
      "Backups automáticos",
    ],
  },
  {
    name: "EMPRESARIAL",
    price: "Personalizado",
    users: "21+ usuarios",
    features: [
      "Usuarios ilimitados",
      "Todas las características Pro",
      "API personalizada",
      "Capacitación incluida",
      "Soporte 24/7",
      "SLA garantizado",
      "Servidor dedicado",
    ],
  },
];

export default function SubscriptionExpiredPage() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Alert Banner */}
        <Card className="bg-red-50 border-red-200 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-red-900 mb-1">
                Tu suscripción ha expirado
              </h1>
              <p className="text-red-700">
                Para continuar usando HandySales CRM, por favor renueva tu suscripción.
                Tu información está segura y podrás acceder nuevamente al activar tu plan.
              </p>
            </div>
          </div>
        </Card>

        {/* Plans */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-2">
            Elige el plan perfecto para tu negocio
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Todos los planes incluyen actualizaciones y sincronización con app móvil
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`p-6 ${
                  plan.featured
                    ? "border-2 border-blue-500 shadow-xl relative"
                    : ""
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Más Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.users}
                  </p>
                  <div className="text-3xl font-bold">
                    {typeof plan.price === "number" ? (
                      <>
                        ${plan.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mes
                        </span>
                      </>
                    ) : (
                      plan.price
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.featured
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-gray-800 hover:bg-gray-900"
                  }`}
                >
                  {plan.name === "EMPRESARIAL"
                    ? "Contactar Ventas"
                    : "Activar Plan"}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <Card className="p-8 mb-8">
          <h3 className="text-xl font-bold mb-6 text-center">
            ¿Necesitas ayuda para renovar?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-full inline-block mb-3">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-1">Llámanos</h4>
              <p className="text-sm text-muted-foreground">+52 555 123 4567</p>
              <p className="text-xs text-muted-foreground">Lun-Vie 9am-6pm</p>
            </div>
            
            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-full inline-block mb-3">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-1">WhatsApp</h4>
              <p className="text-sm text-muted-foreground">+52 555 123 4567</p>
              <p className="text-xs text-muted-foreground">Respuesta inmediata</p>
            </div>
            
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-full inline-block mb-3">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-1">Email</h4>
              <p className="text-sm text-muted-foreground">ventas@handysales.com</p>
              <p className="text-xs text-muted-foreground">24-48 horas</p>
            </div>
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">Métodos de pago aceptados</h3>
              <p className="text-sm text-muted-foreground">
                Pago seguro con encriptación SSL
              </p>
            </div>
            <div className="flex gap-4">
              <CreditCard className="h-8 w-8 text-gray-600" />
              <span className="text-sm text-gray-600">VISA</span>
              <span className="text-sm text-gray-600">MasterCard</span>
              <span className="text-sm text-gray-600">AMEX</span>
              <span className="text-sm text-gray-600">PayPal</span>
              <span className="text-sm text-gray-600">Transferencia</span>
            </div>
          </div>
        </Card>

        {/* Logout Button */}
        <div className="text-center pb-8">
          <Button variant="outline" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

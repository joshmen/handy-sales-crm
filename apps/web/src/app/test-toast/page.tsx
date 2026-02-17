"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "@/hooks/useToast";
import { Layout } from "@/components/layout/Layout";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info,
  Loader2
} from "lucide-react";
import { useState } from "react";

export default function TestToastPage() {
  const [isLoading, setIsLoading] = useState(false);

  const showSuccessToast = () => {
    toast.success("La operación se completó correctamente");
  };

  const showErrorToast = () => {
    toast.error("Algo salió mal. Por favor intenta de nuevo");
  };

  const showInfoToast = () => {
    toast.info("Este es un mensaje informativo");
  };

  const showWarningToast = () => {
    toast.warning("Ten cuidado con esta acción");
  };

  const simulateAsyncOperation = async () => {
    setIsLoading(true);
    
    toast({
      title: "Procesando...",
      description: "Por favor espera mientras procesamos tu solicitud",
    });

    try {
      // Simular operación asíncrona
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "¡Operación exitosa!",
        description: "El proceso se completó correctamente",
      });
    } catch (error) {
      toast({
        title: "Error en la operación",
        description: "No se pudo completar el proceso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showMultipleToasts = () => {
    toast({
      title: "Primer mensaje",
      description: "Este es el primer toast",
    });

    setTimeout(() => {
      toast({
        title: "Segundo mensaje",
        description: "Este aparece después de 1 segundo",
      });
    }, 1000);

    setTimeout(() => {
      toast({
        title: "Tercer mensaje",
        description: "Y este después de 2 segundos",
        variant: "destructive",
      });
    }, 2000);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sistema de Notificaciones Toast</h1>
          <p className="text-muted-foreground">
            Ejemplos de uso del sistema de notificaciones toast en la aplicación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Toasts básicos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Toast de Éxito
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Muestra un mensaje de éxito cuando una operación se completa correctamente.
            </p>
            <Button onClick={showSuccessToast} className="w-full">
              Mostrar Toast de Éxito
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Toast de Error
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Muestra un mensaje de error cuando algo sale mal.
            </p>
            <Button 
              onClick={showErrorToast} 
              variant="destructive"
              className="w-full"
            >
              Mostrar Toast de Error
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Toast Informativo
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Muestra información general al usuario.
            </p>
            <Button 
              onClick={showInfoToast}
              variant="outline"
              className="w-full"
            >
              Mostrar Toast Informativo
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Toast de Advertencia
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Alerta al usuario sobre acciones importantes.
            </p>
            <Button 
              onClick={showWarningToast}
              variant="outline"
              className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            >
              Mostrar Toast de Advertencia
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-purple-500" />
              Operación Asíncrona
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Simula una operación asíncrona con toasts de progreso.
            </p>
            <Button 
              onClick={simulateAsyncOperation}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Iniciar Operación"
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Múltiples Toasts
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Muestra varios toasts en secuencia.
            </p>
            <Button 
              onClick={showMultipleToasts}
              variant="outline"
              className="w-full"
            >
              Mostrar Múltiples Toasts
            </Button>
          </Card>
        </div>

        {/* Ejemplos de código */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cómo usar los Toasts</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Importar el hook:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm">
                <code>{`import { toast } from "@/hooks/useToast"`}</code>
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Toast de éxito:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm">
                <code>{`toast.success("Operación completada")`}</code>
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Toast de error:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm">
                <code>{`toast.error("Algo salió mal")`}</code>
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">4. En operaciones asíncronas:</h4>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                <code>{`try {
  const result = await apiCall();
  toast.success("Datos guardados correctamente");
} catch (error) {
  toast.error(error.message);
}`}</code>
              </pre>
            </div>
          </div>
        </Card>

        {/* Guía de uso */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">
            📝 Guía de Buenas Prácticas
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Usa toasts para confirmar acciones del usuario (guardar, eliminar, actualizar)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Mantén los mensajes cortos y claros</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Usa variant=&quot;destructive&quot; solo para errores importantes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>No uses toasts para información crítica que el usuario debe leer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Evita mostrar demasiados toasts al mismo tiempo</span>
            </li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
}

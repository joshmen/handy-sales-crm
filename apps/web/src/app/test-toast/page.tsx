"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { toast } from "@/hooks/useToast";
import { Layout } from "@/components/layout/Layout";
import { notFound } from "next/navigation";

export default function TestToastPage() {
  // Sprint pre-prod #37 audit 2026-06-06: esta page era de QA dev pero
  // estaba accesible en prod via /test-toast. Gate con NODE_ENV: si NO
  // es development, 404. Asi seguimos teniendo la utility para dev
  // sin exponerla a clientes.
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const successToast = () =>
    toast.success("Pedido guardado", "P-2841 de Abarrotes Don Pepe se registro correctamente.");

  const errorToast = () =>
    toast.error("No se pudo timbrar", "El RFC del receptor no es valido. Revisa los datos fiscales.");

  const infoToast = () =>
    toast.info("Sincronizacion en curso", "Se estan subiendo 3 pedidos guardados sin conexion.");

  const warningToast = () =>
    toast.warning("Saldo vencido", "Deposito El Rancho tiene $6,100 con 22 dias de atraso.");

  const loadingToast = () => {
    const t = toast.loading("Timbrando factura…", "Conectando con el PAC (Finkok).");
    setTimeout(() => t.resolve("success", "Factura timbrada", "CFDI A3F1-9X emitido y enviado por correo."), 2200);
  };

  const undoToast = () =>
    toast.undo("Cliente eliminado", "Mini Super Rosa se movio a la papelera.", () =>
      toast.success("Accion deshecha", "Mini Super Rosa fue restaurado.")
    );

  const viewToast = () =>
    toast.view("Factura creada", "CFDI F-1042 listo para descargar.", "Ver factura", () =>
      toast.info("Abriendo factura…", "F-1042 · Abarrotes Don Pepe")
    );

  const stackToast = () => {
    for (let i = 1; i <= 6; i++) {
      setTimeout(() => toast.info(`Toast ${i}`, "Apilado: el mas viejo se cierra al pasar de 4."), i * 350);
    }
  };

  // Back-compat: forma vieja del objeto base
  const legacyToast = () =>
    toast({ title: "Forma vieja", description: "toast({title, description, variant})", variant: "destructive" });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sistema de Notificaciones Toast</h1>
          <p className="text-muted-foreground">
            Toast con accion: apilado abajo-derecha, barra de progreso, pausa al hover, error persistente.
          </p>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Button onClick={successToast} className="w-full">Success</Button>
            <Button onClick={errorToast} variant="destructive" className="w-full">Error (persiste)</Button>
            <Button onClick={infoToast} variant="outline" className="w-full">Info</Button>
            <Button onClick={warningToast} variant="outline" className="w-full">Warning</Button>
            <Button onClick={loadingToast} variant="outline" className="w-full">Loading → resolve</Button>
            <Button onClick={undoToast} variant="outline" className="w-full">Undo (Deshacer)</Button>
            <Button onClick={viewToast} variant="outline" className="w-full">View (Ver)</Button>
            <Button onClick={stackToast} variant="outline" className="w-full">Apilar 6 (cap 4)</Button>
            <Button onClick={legacyToast} variant="outline" className="w-full">Back-compat</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Como usar</h3>
          <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
            <code>{`import { toast } from "@/hooks/useToast"

toast.success("Titulo", "Descripcion opcional")
toast.error("Algo salio mal")            // persistente
toast.loading("Procesando…").resolve("success", "Listo")
toast.undo("Eliminado", "X", onUndo)     // boton Deshacer
toast.view("Creado", "X", "Ver", onView) // boton Ver`}</code>
          </pre>
        </Card>
      </div>
    </Layout>
  );
}

import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function ClientsPage() {
  return (
    <Layout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <p>No hay resultados para tus filtros</p>
                <p className="text-sm">Aquí se mostrarán todos tus clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

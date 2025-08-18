import { Layout } from '@/components/layout';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';

export default function ProductsPage() {
  return (
    <Layout>
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Productos</h2>
              <div className="flex gap-2">
                <Button>+ Agregar Producto</Button>
                <Button variant="outline">Filtros</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Lista de Productos
              </h3>
              <p className="text-gray-500 mb-4">
                Aquí se mostrarán todos tus productos
              </p>

              {/* Productos de ejemplo simples */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                <div className="border rounded-lg p-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    TA
                  </div>
                  <h4 className="font-medium">Tanque Acme</h4>
                  <p className="text-sm text-gray-500">$1,250.00</p>
                  <p className="text-xs text-green-600">15 en stock</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    CC
                  </div>
                  <h4 className="font-medium">Coca Cola 600ml</h4>
                  <p className="text-sm text-gray-500">$18.50</p>
                  <p className="text-xs text-green-600">120 en stock</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    SA
                  </div>
                  <h4 className="font-medium">Sabritas Original</h4>
                  <p className="text-sm text-gray-500">$12.00</p>
                  <p className="text-xs text-red-600">2 en stock</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                    LE
                  </div>
                  <h4 className="font-medium">Leche Lala 1L</h4>
                  <p className="text-sm text-gray-500">$24.50</p>
                  <p className="text-xs text-green-600">48 en stock</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

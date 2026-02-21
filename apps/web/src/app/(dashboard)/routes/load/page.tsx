'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, Button, Input } from '@/components/ui';
import { UserAssignment } from '@/components/routes/UserAssignment';
import { InventoryLoader } from '@/components/routes/InventoryLoader';
import { User, Product, RouteProduct, UserRole } from '@/types';

export default function RouteLoadPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [initialCash, setInitialCash] = useState<string>('120000');
  const [comments, setComments] = useState<string>('');
  const [routeProducts, setRouteProducts] = useState<RouteProduct[]>([]);

  // Datos de ejemplo
  const users: User[] = [
    {
      id: '1',
      name: 'Josué Mendoza',
      email: 'josue@handysuites.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria@handysuites.com',
      role: UserRole.VENDEDOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const products: Product[] = [
    {
      id: '1',
      name: 'Tanque Acme',
      code: 'ACM-1001',
      description: 'Tanque de agua 1000L',
      images: [],
      minStock: 10,
      unit: '',
      price: 1250,
      stock: 15,
      category: 'Tanques',
      family: 'Almacenamiento',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Coca Cola 600ml',
      code: 'CC-600',
      description: 'Refresco de cola',
      images: [],
      minStock: 10,
      unit: '',
      price: 18.5,
      stock: 120,
      category: 'Bebidas',
      family: 'Refrescos',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const handleProductAdd = (product: Product, quantity: number) => {
    const newRouteProduct: RouteProduct = {
      id: `rp-${Date.now()}`,
      routeId: '',
      productId: product.id,
      product,
      assignedQuantity: quantity,
      soldQuantity: 0,
      returnedQuantity: 0,
      unitPrice: product.price,
    };
    setRouteProducts([...routeProducts, newRouteProduct]);
  };

  const handleProductRemove = (productId: string) => {
    setRouteProducts(routeProducts.filter(rp => rp.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setRouteProducts(
      routeProducts.map(rp =>
        rp.productId === productId ? { ...rp, assignedQuantity: quantity } : rp
      )
    );
  };

  const handleSaveRoute = () => {
    if (!selectedUser) {
      alert('Por favor selecciona un usuario');
      return;
    }

    const routeData = {
      userId: selectedUser.id,
      initialCash: parseFloat(initialCash),
      comments,
      products: routeProducts,
    };

    console.log('Guardar ruta:', routeData);
    alert('Ruta guardada exitosamente');
  };

  const totalValue = routeProducts.reduce((sum, rp) => sum + rp.assignedQuantity * rp.unitPrice, 0);

  return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Cargar inventario de ruta</h2>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Asignar usuario */}
                <UserAssignment
                  selectedUser={selectedUser}
                  users={users}
                  onUserSelect={setSelectedUser}
                />

                {/* Asignar pedidos */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center">
                      <span className="mr-2">📦</span>
                      Asignar pedidos para entrega
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">0 pedidos</p>
                    <Button variant="outline">Agregar pedido</Button>
                  </CardContent>
                </Card>

                {/* Asignar productos */}
                <InventoryLoader
                  products={products}
                  routeProducts={routeProducts}
                  onProductAdd={handleProductAdd}
                  onProductRemove={handleProductRemove}
                  onQuantityChange={handleQuantityChange}
                />

                {/* Resumen de productos */}
                {routeProducts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold">Total asignado a la ruta</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Producto</th>
                              <th className="px-3 py-2 text-left">Cantidad</th>
                              <th className="px-3 py-2 text-left">Precio Unit.</th>
                              <th className="px-3 py-2 text-left">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {routeProducts.map(rp => (
                              <tr key={rp.id}>
                                <td className="px-3 py-2">
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white text-xs mr-2">
                                      {rp.product.name.charAt(0)}
                                    </div>
                                    {rp.product.name}
                                  </div>
                                </td>
                                <td className="px-3 py-2">{rp.assignedQuantity}</td>
                                <td className="px-3 py-2">${rp.unitPrice}</td>
                                <td className="px-3 py-2">
                                  ${(rp.assignedQuantity * rp.unitPrice).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 font-semibold">
                                Total:
                              </td>
                              <td className="px-3 py-2 font-semibold">${totalValue.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Panel lateral */}
              <div className="space-y-6">
                <Card>
                  <CardContent>
                    <div className="space-y-4">
                      <Input
                        label="Efectivo inicial"
                        type="number"
                        value={initialCash}
                        onChange={e => setInitialCash(e.target.value)}
                        placeholder="120000"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comentarios
                        </label>
                        <textarea
                          value={comments}
                          onChange={e => setComments(e.target.value)}
                          placeholder="Usada para describir y vender la ruta"
                          className="w-full p-2 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div className="pt-4 border-t">
                        <Button
                          onClick={handleSaveRoute}
                          className="w-full"
                          disabled={!selectedUser || routeProducts.length === 0}
                        >
                          Guardar Ruta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumen */}
                <Card>
                  <CardContent>
                    <h4 className="font-semibold mb-3">Resumen</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Productos:</span>
                        <span>{routeProducts.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unidades:</span>
                        <span>
                          {routeProducts.reduce((sum, rp) => sum + rp.assignedQuantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor total:</span>
                        <span>${totalValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo inicial:</span>
                        <span>${parseFloat(initialCash || '0').toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

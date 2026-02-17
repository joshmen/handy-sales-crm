import React, { useState } from "react";
import { Product, RouteProduct } from "@/types";
import { Card, CardHeader, CardContent, Button, Input } from "@/components/ui";

interface InventoryLoaderProps {
  products: Product[];
  routeProducts: RouteProduct[];
  onProductAdd: (product: Product, quantity: number) => void;
  onProductRemove: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export const InventoryLoader: React.FC<InventoryLoaderProps> = ({
  products,
  routeProducts,
  onProductAdd,
  onProductRemove,
  onQuantityChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !routeProducts.some((rp) => rp.productId === product.id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center">
            <span className="mr-2">📦</span>
            Asignar productos para venta
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddProduct(!showAddProduct)}
          >
            {showAddProduct ? "Cancelar" : "Agregar Producto"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Lista de productos asignados */}
        {routeProducts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Productos asignados</h4>
            <div className="space-y-2">
              {routeProducts.map((routeProduct) => (
                <div
                  key={routeProduct.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-sm font-medium mr-3">
                      {routeProduct.product.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{routeProduct.product.name}</p>
                      <p className="text-sm text-gray-500">
                        ${routeProduct.product.price} • Stock:{" "}
                        {routeProduct.product.stock}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={routeProduct.assignedQuantity}
                      onChange={(e) =>
                        onQuantityChange(
                          routeProduct.productId,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20"
                      min="0"
                      max={routeProduct.product.stock}
                    />
                    <button
                      onClick={() => onProductRemove(routeProduct.productId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agregar nuevo producto */}
        {showAddProduct && (
          <div>
            <h4 className="font-medium mb-3">Buscar productos</h4>
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-sm font-medium mr-3">
                      {product.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        ${product.price} • Stock: {product.stock}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onProductAdd(product, 1);
                      setSearchTerm("");
                    }}
                    disabled={product.stock === 0}
                  >
                    Agregar
                  </Button>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No se encontraron productos
                </p>
              )}
            </div>
          </div>
        )}

        {routeProducts.length === 0 && !showAddProduct && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay productos asignados</p>
            <p className="text-sm">
              Haz clic en Agregar Producto para comenzar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

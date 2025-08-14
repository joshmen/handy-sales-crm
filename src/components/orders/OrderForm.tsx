/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
} from "@/components/ui";
import { Order, OrderItem } from "@/types/orders";
import { Client, Product } from "@/types";

interface OrderFormProps {
  order?: Order | null;
  clients: Client[];
  products: Product[];
  onSave: (orderData: Partial<Order>) => void;
  onCancel: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  order,
  clients,
  products,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    clientId: order?.clientId || "",
    deliveryDate: order?.deliveryDate
      ? new Date(order.deliveryDate).toISOString().split("T")[0]
      : "",
    priority: order?.priority || "normal",
    paymentMethod: order?.paymentMethod || "cash",
    notes: order?.notes || "",
    address: order?.address || "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>(order?.items || []);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name} - $${product.price}`,
  }));

  const priorityOptions = [
    { value: "low", label: "Baja" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
  ];

  const paymentOptions = [
    { value: "cash", label: "Efectivo" },
    { value: "credit", label: "Crédito" },
    { value: "transfer", label: "Transferencia" },
    { value: "check", label: "Cheque" },
  ];

  const handleAddProduct = () => {
    if (!selectedProduct || quantity <= 0) {
      alert("Selecciona un producto y cantidad válida");
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existingItem = orderItems.find(
      (item) => item.productId === selectedProduct
    );

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === selectedProduct
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total: (item.quantity + quantity) * item.unitPrice,
              }
            : item
        )
      );
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}`,
        orderId: order?.id || "",
        productId: product.id,
        product,
        quantity,
        unitPrice: product.price,
        discount: 0,
        total: quantity * product.price,
      };
      setOrderItems([...orderItems, newItem]);
    }

    setSelectedProduct("");
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setOrderItems(
      orderItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.unitPrice,
            }
          : item
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.16; // IVA 16%
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleSave = () => {
    if (!formData.clientId || orderItems.length === 0) {
      alert("Selecciona un cliente y agrega al menos un producto");
      return;
    }

    const orderData: Partial<Order> = {
      ...formData,
      deliveryDate: formData.deliveryDate
        ? new Date(formData.deliveryDate)
        : undefined,
      items: orderItems,
      subtotal,
      tax,
      discount: 0,
      total,
      status: order?.status || "draft",
      paymentStatus: "pending",
    };

    onSave(orderData);
  };

  return (
    <div className="space-y-6">
      {/* Información del pedido */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {order ? "Editar Pedido" : "Crear Nuevo Pedido"}
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Cliente *"
              options={[
                { value: "", label: "Seleccionar cliente" },
                ...clientOptions,
              ]}
              value={formData.clientId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientId: e.target.value }))
              }
            />

            <Input
              label="Fecha de entrega"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryDate: e.target.value,
                }))
              }
            />

            <Select
              label="Prioridad"
              options={priorityOptions}
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: e.target.value as any,
                }))
              }
            />

            <Select
              label="Método de pago"
              options={paymentOptions}
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value as any,
                }))
              }
            />
          </div>

          <div className="mt-4">
            <Input
              label="Dirección de entrega"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Dirección donde se entregará el pedido"
            />
          </div>
        </CardContent>
      </Card>

      {/* Agregar productos */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Productos</h3>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select
              options={[
                { value: "", label: "Seleccionar producto" },
                ...productOptions,
              ]}
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-24"
              placeholder="Cant."
            />
            <Button onClick={handleAddProduct}>Agregar</Button>
          </div>

          {/* Lista de productos */}
          {orderItems.length > 0 ? (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        Precio Unit.
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        Total
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.product.code}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="0"
                            className="w-20"
                          />
                        </td>
                        <td className="px-4 py-2">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          ${item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (16%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay productos agregados</p>
              <p className="text-sm">
                Selecciona productos para agregar al pedido
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardContent>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas del pedido
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Comentarios adicionales..."
            className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          {order ? "Actualizar Pedido" : "Crear Pedido"}
        </Button>
      </div>
    </div>
  );
};

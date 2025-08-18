'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { OrderList } from '@/components/orders/OrderList';
import { OrderForm } from '@/components/orders/OrderForm';
import { Modal } from '@/components/ui';
import { Order } from '@/types/orders';
import { Client, ClientType, Product, UserRole } from '@/types';

// Datos de prueba - más adelante esto vendrá de la API
const mockOrders: Order[] = [
  {
    id: '1',
    code: 'ORD-2025-001',
    clientId: 'client-1',
    client: {
      id: 'client-1',
      name: 'Tienda San Miguel',
      email: 'tienda@sanmiguel.com',
      phone: '555-0123',
      address: 'Av. Principal 123, Culiacán',
      type: ClientType.MAYORISTA,
      isActive: true,
      code: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    userId: 'user-1',
    user: {
      id: 'user-1',
      name: 'Juan Pérez',
      email: 'juan@empresa.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: 'pending',
    priority: 'normal',
    orderDate: new Date('2025-01-15'),
    deliveryDate: new Date('2025-01-20'),
    items: [
      {
        id: 'item-1',
        orderId: '1',
        productId: 'prod-1',
        product: {
          id: 'prod-1',
          name: 'Producto A',
          code: 'PA-001',
          description: 'Descripción del producto A',
          price: 150.0,
          stock: 50,
          category: 'Categoría 1',
          isActive: true,
          images: [],
          minStock: 10,
          unit: '0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        quantity: 2,
        unitPrice: 150.0,
        discount: 0,
        total: 300.0,
      },
    ],
    subtotal: 300.0,
    tax: 48.0,
    discount: 0,
    total: 348.0,
    notes: 'Entrega en horario matutino',
    address: 'Av. Principal 123, Culiacán',
    paymentMethod: 'credit',
    paymentStatus: 'pending',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },
  {
    id: '2',
    code: 'ORD-2025-002',
    clientId: 'client-2',
    client: {
      id: 'client-2',
      name: 'Supermercado El Sol',
      email: 'ventas@elsol.com',
      phone: '555-0456',
      address: 'Calle Comercio 456, Mazatlán',
      type: ClientType.MAYORISTA,
      isActive: true,
      code: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    userId: 'user-1',
    user: {
      id: 'user-1',
      name: 'Juan Pérez',
      email: 'juan@empresa.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: 'delivered',
    priority: 'high',
    orderDate: new Date('2025-01-10'),
    deliveryDate: new Date('2025-01-15'),
    completedDate: new Date('2025-01-15'),
    items: [
      {
        id: 'item-2',
        orderId: '2',
        productId: 'prod-2',
        product: {
          id: 'prod-2',
          name: 'Producto B',
          code: 'PB-001',
          description: 'Descripción del producto B',
          price: 75.0,
          stock: 100,
          category: 'Categoría 2',
          isActive: true,
          images: [],
          minStock: 10,
          unit: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        quantity: 5,
        unitPrice: 75.0,
        discount: 0,
        total: 375.0,
      },
    ],
    subtotal: 375.0,
    tax: 60.0,
    discount: 0,
    total: 435.0,
    notes: '',
    address: 'Calle Comercio 456, Mazatlán',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-15'),
  },
];

const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'Tienda San Miguel',
    email: 'tienda@sanmiguel.com',
    phone: '555-0123',
    address: 'Av. Principal 123, Culiacán',
    type: ClientType.MAYORISTA,
    isActive: true,
    code: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'client-2',
    name: 'Supermercado El Sol',
    email: 'ventas@elsol.com',
    phone: '555-0456',
    address: 'Calle Comercio 456, Mazatlán',
    type: ClientType.MAYORISTA,
    isActive: true,
    code: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Producto A',
    code: 'PA-001',
    description: 'Descripción del producto A',
    price: 150.0,
    stock: 50,
    category: 'Categoría 1',
    isActive: true,
    images: [],
    minStock: 10,
    brand: '',
    cost: 10,
    unit: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-2',
    name: 'Producto B',
    code: 'PB-001',
    description: 'Descripción del producto B',
    price: 75.0,
    stock: 100,
    category: 'Categoría 2',
    isActive: true,
    images: [],
    minStock: 10,
    brand: '',
    cost: 10,
    unit: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = () => {
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setEditingOrder(order);
      setShowOrderForm(true);
    }
  };

  const handleViewDetails = (orderId: string) => {
    // Por ahora solo console.log, más adelante se puede implementar una modal de detalles
    console.log('Ver detalles de orden:', orderId);
    // TODO: Implementar modal de detalles o navegación a página de detalles
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      setOrders(orders.filter(o => o.id !== orderId));
    }
  };

  const handleSaveOrder = (orderData: Partial<Order>) => {
    if (editingOrder) {
      // Editar orden existente
      setOrders(
        orders.map(order =>
          order.id === editingOrder.id ? { ...order, ...orderData, updatedAt: new Date() } : order
        )
      );
    } else {
      // Crear nueva orden
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        code: `ORD-2025-${String(orders.length + 1).padStart(3, '0')}`,
        userId: 'user-1',
        user: mockOrders[0].user, // Usuario actual
        orderDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...orderData,
      } as Order;

      setOrders([newOrder, ...orders]);
    }

    setShowOrderForm(false);
    setEditingOrder(null);
  };

  const handleCancelForm = () => {
    setShowOrderForm(false);
    setEditingOrder(null);
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-600">Administra todos los pedidos de tu negocio</p>
        </div>

        <OrderList
          orders={orders}
          loading={loading}
          onCreateOrder={handleCreateOrder}
          onViewDetails={handleViewDetails}
          onEditOrder={handleEditOrder}
          onDeleteOrder={handleDeleteOrder}
        />

        {/* Modal para crear/editar pedidos */}
        {showOrderForm && (
          <Modal
            isOpen={showOrderForm}
            onClose={handleCancelForm}
            title={editingOrder ? 'Editar Pedido' : 'Crear Nuevo Pedido'}
            size="lg"
          >
            <OrderForm
              order={editingOrder}
              clients={mockClients}
              products={mockProducts}
              onSave={handleSaveOrder}
              onCancel={handleCancelForm}
            />
          </Modal>
        )}
      </div>
    </Layout>
  );
}

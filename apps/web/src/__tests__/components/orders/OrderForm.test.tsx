/// <reference path="../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderForm } from '@/components/orders/OrderForm';
import { Client, Product } from '@/types';
import { Order, OrderItem } from '@/types/orders';

// Mock UI components
jest.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
  Input: ({
    label,
    value,
    onChange,
    type,
    placeholder,
    min,
    className,
  }: {
    label?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    min?: string;
    className?: string;
  }) => (
    <div>
      {label && <label>{label}</label>}
      <input
        type={type || 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className={className}
        data-testid={label ? `input-${label.toLowerCase().replace(/\s+/g, '-').replace('*', '').trim()}` : undefined}
      />
    </div>
  ),
}));

jest.mock('@/components/ui/SelectCompat', () => ({
  SelectCompat: ({
    children,
    label,
    value,
    onChange,
    className,
  }: {
    children: React.ReactNode;
    label?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    className?: string;
  }) => {
    const cleanLabel = label
      ? label.toLowerCase().replace(/\*/g, '').trim().replace(/\s+/g, '-')
      : null;
    return (
      <div>
        {label && <label>{label}</label>}
        <select
          value={value}
          onChange={onChange}
          className={className}
          data-testid={cleanLabel ? `select-${cleanLabel}` : 'select-product'}
        >
          {children}
        </select>
      </div>
    );
  },
}));

// Mock window.alert
const mockAlert = jest.fn();
window.alert = mockAlert;

// Test data
const mockClients: Client[] = [
  {
    id: 'client-1',
    tenantId: 'tenant-1',
    name: 'Cliente Test 1',
    email: 'cliente1@test.com',
    phone: '1234567890',
    rfc: 'RFC123456789',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    notes: '',
    categoryId: '',
    zoneId: '',
    priceListId: '',
    creditLimit: 0,
    creditDays: 0,
    balance: 0,
  },
  {
    id: 'client-2',
    tenantId: 'tenant-1',
    name: 'Cliente Test 2',
    email: 'cliente2@test.com',
    phone: '0987654321',
    rfc: 'RFC987654321',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    notes: '',
    categoryId: '',
    zoneId: '',
    priceListId: '',
    creditLimit: 0,
    creditDays: 0,
    balance: 0,
  },
];

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    tenantId: 'tenant-1',
    code: 'PROD001',
    name: 'Producto Test 1',
    description: 'Descripción producto 1',
    price: 100.0,
    cost: 50.0,
    stock: 100,
    minStock: 10,
    categoryId: 'cat-1',
    familyId: 'fam-1',
    unitId: 'unit-1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'prod-2',
    tenantId: 'tenant-1',
    code: 'PROD002',
    name: 'Producto Test 2',
    description: 'Descripción producto 2',
    price: 200.0,
    cost: 100.0,
    stock: 50,
    minStock: 5,
    categoryId: 'cat-1',
    familyId: 'fam-1',
    unitId: 'unit-1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockOrderItem: OrderItem = {
  id: 'item-1',
  orderId: 'order-1',
  productId: 'prod-1',
  product: mockProducts[0],
  quantity: 2,
  unitPrice: 100.0,
  discount: 0,
  total: 200.0,
};

const mockOrder: Order = {
  id: 'order-1',
  tenantId: 'tenant-1',
  orderNumber: 'ORD-001',
  clientId: 'client-1',
  userId: 'user-1',
  status: 'draft',
  priority: 'normal',
  paymentMethod: 'cash',
  paymentStatus: 'pending',
  deliveryDate: new Date('2024-02-15'),
  items: [mockOrderItem],
  subtotal: 200.0,
  tax: 32.0,
  discount: 0,
  total: 232.0,
  notes: 'Notas del pedido',
  address: 'Dirección de entrega',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('OrderForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render create mode title when no order provided', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Crear Nuevo Pedido')).toBeInTheDocument();
    });

    it('should render edit mode title when order provided', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Editar Pedido')).toBeInTheDocument();
    });

    it('should render client options', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cliente Test 1')).toBeInTheDocument();
      expect(screen.getByText('Cliente Test 2')).toBeInTheDocument();
    });

    it('should render product options with prices', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Producto Test 1 - $100')).toBeInTheDocument();
      expect(screen.getByText('Producto Test 2 - $200')).toBeInTheDocument();
    });

    it('should render priority options', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Baja')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Alta')).toBeInTheDocument();
      expect(screen.getByText('Urgente')).toBeInTheDocument();
    });

    it('should render payment method options', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Efectivo')).toBeInTheDocument();
      expect(screen.getByText('Crédito')).toBeInTheDocument();
      expect(screen.getByText('Transferencia')).toBeInTheDocument();
      expect(screen.getByText('Cheque')).toBeInTheDocument();
    });

    it('should show empty products message when no items', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('No hay productos agregados')).toBeInTheDocument();
      expect(screen.getByText('Selecciona productos para agregar al pedido')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Crear Pedido')).toBeInTheDocument();
    });

    it('should render "Actualizar Pedido" button in edit mode', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Actualizar Pedido')).toBeInTheDocument();
    });
  });

  describe('edit mode initialization', () => {
    it('should populate form with existing order data', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const clientSelect = screen.getByTestId('select-cliente') as HTMLSelectElement;
      expect(clientSelect.value).toBe('client-1');
    });

    it('should display existing order items', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Producto Test 1')).toBeInTheDocument();
      expect(screen.getByText('PROD001')).toBeInTheDocument();
    });

    it('should show totals from existing order items', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Subtotal: 200, IVA: 32 (16%), Total: 232
      // Note: $200.00 appears twice (item total and subtotal)
      expect(screen.getAllByText('$200.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('$32.00')).toBeInTheDocument();
      expect(screen.getByText('$232.00')).toBeInTheDocument();
    });
  });

  describe('add product', () => {
    it('should show alert when no product selected', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Agregar'));

      expect(mockAlert).toHaveBeenCalledWith('Selecciona un producto y cantidad válida');
    });

    it('should add product to order items', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select product
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });

      // Click add
      fireEvent.click(screen.getByText('Agregar'));

      // Product should appear in list
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument();
      expect(screen.queryByText('No hay productos agregados')).not.toBeInTheDocument();
    });

    it('should increase quantity when adding existing product', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Add product first time
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Add same product again
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Should show quantity 2 (1+1) and total 200 (2*100)
      const quantityInputs = screen.getAllByDisplayValue('2');
      expect(quantityInputs.length).toBeGreaterThan(0);
    });

    it('should reset product selection after adding', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      expect(productSelect.value).toBe('');
    });
  });

  describe('remove product', () => {
    it('should remove product when clicking Eliminar', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Item should exist
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument();

      // Click delete
      fireEvent.click(screen.getByText('Eliminar'));

      // Item should be gone
      expect(screen.queryByText('PROD001')).not.toBeInTheDocument();
      expect(screen.getByText('No hay productos agregados')).toBeInTheDocument();
    });
  });

  describe('quantity change', () => {
    it('should update item quantity and total', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Find quantity input (initial value is 2)
      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;

      // Change to 5
      fireEvent.change(quantityInput, { target: { value: '5' } });

      // New total should be 5 * 100 = 500
      // Subtotal: 500, IVA: 80, Total: 580
      // Note: $500.00 appears twice (item total and subtotal)
      expect(screen.getAllByText('$500.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('$80.00')).toBeInTheDocument();
      expect(screen.getByText('$580.00')).toBeInTheDocument();
    });

    it('should remove item when quantity changed to 0', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '0' } });

      expect(screen.queryByText('PROD001')).not.toBeInTheDocument();
      expect(screen.getByText('No hay productos agregados')).toBeInTheDocument();
    });
  });

  describe('totals calculation', () => {
    it('should calculate correct subtotal', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Add product 1 (100)
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Add product 2 (200)
      fireEvent.change(productSelect, { target: { value: 'prod-2' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Subtotal should be 300
      expect(screen.getByText('$300.00')).toBeInTheDocument();
    });

    it('should calculate 16% IVA correctly', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Add product 1 (100)
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // IVA should be 16 (100 * 0.16)
      expect(screen.getByText('$16.00')).toBeInTheDocument();
    });

    it('should calculate correct total with IVA', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Add product 1 (100)
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Total should be 116 (100 + 16)
      expect(screen.getByText('$116.00')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show alert when saving without client', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Add a product but no client
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Try to save
      fireEvent.click(screen.getByText('Crear Pedido'));

      expect(mockAlert).toHaveBeenCalledWith('Selecciona un cliente y agrega al menos un producto');
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show alert when saving without products', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select client but no products
      const clientSelect = screen.getByTestId('select-cliente') as HTMLSelectElement;
      fireEvent.change(clientSelect, { target: { value: 'client-1' } });

      // Try to save
      fireEvent.click(screen.getByText('Crear Pedido'));

      expect(mockAlert).toHaveBeenCalledWith('Selecciona un cliente y agrega al menos un producto');
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('should call onSave with correct data', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Select client
      const clientSelect = screen.getByTestId('select-cliente') as HTMLSelectElement;
      fireEvent.change(clientSelect, { target: { value: 'client-1' } });

      // Add product
      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Save
      fireEvent.click(screen.getByText('Crear Pedido'));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: 'prod-1',
              quantity: 1,
              unitPrice: 100,
            }),
          ]),
          subtotal: 100,
          tax: 16,
          total: 116,
          status: 'draft',
          paymentStatus: 'pending',
        })
      );
    });

    it('should call onCancel when clicking cancel button', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Cancelar'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should preserve existing order status in edit mode', () => {
      const orderWithStatus: Order = {
        ...mockOrder,
        status: 'confirmed',
      };

      render(
        <OrderForm
          order={orderWithStatus}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Actualizar Pedido'));

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
        })
      );
    });
  });

  describe('form field changes', () => {
    it('should update priority', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const prioritySelect = screen.getByTestId('select-prioridad') as HTMLSelectElement;
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } });

      expect(prioritySelect.value).toBe('urgent');
    });

    it('should update payment method', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const paymentSelect = screen.getByTestId('select-método-de-pago') as HTMLSelectElement;
      fireEvent.change(paymentSelect, { target: { value: 'credit' } });

      expect(paymentSelect.value).toBe('credit');
    });

    it('should update notes', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const notesTextarea = screen.getByPlaceholderText('Comentarios adicionales...');
      fireEvent.change(notesTextarea, { target: { value: 'Nota de prueba' } });

      expect(notesTextarea).toHaveValue('Nota de prueba');
    });
  });

  describe('table rendering', () => {
    it('should render table headers when items exist', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Producto')).toBeInTheDocument();
      expect(screen.getByText('Cantidad')).toBeInTheDocument();
      expect(screen.getByText('Precio Unit.')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('should display unit price correctly', () => {
      render(
        <OrderForm
          order={mockOrder}
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });
  });

  describe('multiple products', () => {
    it('should handle adding multiple different products', () => {
      render(
        <OrderForm
          clients={mockClients}
          products={mockProducts}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const productSelect = screen.getByTestId('select-product') as HTMLSelectElement;

      // Add first product
      fireEvent.change(productSelect, { target: { value: 'prod-1' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Add second product
      fireEvent.change(productSelect, { target: { value: 'prod-2' } });
      fireEvent.click(screen.getByText('Agregar'));

      // Both should appear
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument();
      expect(screen.getByText('Producto Test 2')).toBeInTheDocument();

      // Totals: 100 + 200 = 300, IVA: 48, Total: 348
      expect(screen.getByText('$300.00')).toBeInTheDocument();
      expect(screen.getByText('$48.00')).toBeInTheDocument();
      expect(screen.getByText('$348.00')).toBeInTheDocument();
    });
  });
});

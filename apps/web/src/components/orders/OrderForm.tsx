/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Order, OrderItem } from '@/types/orders';
import { Client, Product } from '@/types';
import { Trash2, Package, ShoppingCart } from 'lucide-react';

// Schema de validación para pedidos
const orderFormSchema = z.object({
  clientId: z.string().min(1, 'Debe seleccionar un cliente'),
  deliveryDate: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  paymentMethod: z.enum(['cash', 'credit', 'transfer', 'check']).default('cash'),
  notes: z.string().max(2000, 'Las notas no pueden exceder 2000 caracteres').optional(),
  address: z.string().max(500, 'La dirección no puede exceder 500 caracteres').optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;
type OrderFormInput = z.input<typeof orderFormSchema>;

export interface OrderFormHandle {
  submit: () => void;
  isDirty: boolean;
}

interface OrderFormProps {
  order?: Order | null;
  clients: Client[];
  products: Product[];
  onSave: (orderData: Partial<Order>) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const OrderForm = forwardRef<OrderFormHandle, OrderFormProps>(({
  order,
  clients,
  products,
  onSave,
  onCancel,
  onDirtyChange,
}, ref) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formIsDirty },
    watch,
    setValue,
  } = useForm<OrderFormInput>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: order?.clientId || '',
      deliveryDate: order?.deliveryDate
        ? new Date(order.deliveryDate).toISOString().split('T')[0]
        : '',
      priority: order?.priority || 'normal',
      paymentMethod: order?.paymentMethod || 'cash',
      notes: order?.notes || '',
      address: order?.address || '',
    },
  });

  const formRef = useRef<HTMLFormElement>(null);
  const initialItemCount = order?.items?.length || 0;
  const [orderItems, setOrderItems] = useState<OrderItem[]>(order?.items || []);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const itemsChanged = orderItems.length !== initialItemCount;
  const isDirty = formIsDirty || itemsChanged;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useImperativeHandle(ref, () => ({
    submit: () => formRef.current?.requestSubmit(),
    get isDirty() { return isDirty; },
  }));

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name,
  }));

  const productOptions = products.map(product => ({
    value: product.id,
    label: `${product.name} - $${product.price}`,
    imageUrl: product.images?.[0] || '',
  }));

  const priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'credit', label: 'Crédito' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'check', label: 'Cheque' },
  ];

  const handleAddProduct = () => {
    if (!selectedProduct || quantity <= 0) {
      alert('Selecciona un producto y cantidad válida');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingItem = orderItems.find(item => item.productId === selectedProduct);

    if (existingItem) {
      setOrderItems(
        orderItems.map(item =>
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
        orderId: order?.id || '',
        productId: product.id,
        product,
        quantity,
        unitPrice: product.price,
        discount: 0,
        total: quantity * product.price,
      };
      setOrderItems([...orderItems, newItem]);
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setOrderItems(
      orderItems.map(item =>
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

  const onFormSubmit = (formData: OrderFormInput) => {
    const data = formData as OrderFormData;
    if (orderItems.length === 0) {
      setItemsError('Debe agregar al menos un producto');
      return;
    }
    setItemsError(null);

    const orderData: Partial<Order> = {
      ...data,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      items: orderItems,
      subtotal,
      tax,
      discount: 0,
      total,
      status: order?.status || 'draft',
      paymentStatus: 'pending',
    };

    onSave(orderData);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-5 p-6" data-tour="order-form">
      {/* Información del pedido */}
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={clientOptions}
            value={watch('clientId') || null}
            onChange={(val) => setValue('clientId', val ? String(val) : '', { shouldValidate: true })}
            placeholder="Seleccionar cliente"
            searchPlaceholder="Buscar cliente..."
            error={!!errors.clientId}
          />
          {errors.clientId && (
            <p className="mt-1 text-[13px] text-red-500">{errors.clientId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Fecha de entrega
            </label>
            <input
              type="date"
              {...register('deliveryDate')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Prioridad
            </label>
            <SearchableSelect
              options={priorityOptions}
              value={watch('priority') || null}
              onChange={(val) => setValue('priority', val ? String(val) as 'low' | 'normal' | 'high' | 'urgent' : 'normal', { shouldValidate: true })}
              placeholder="Seleccionar prioridad"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <SearchableSelect
              options={paymentOptions}
              value={watch('paymentMethod') || null}
              onChange={(val) => setValue('paymentMethod', val ? String(val) as 'cash' | 'credit' | 'transfer' | 'check' : 'cash', { shouldValidate: true })}
              placeholder="Seleccionar método de pago"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Dirección de entrega
            </label>
            <input
              type="text"
              {...register('address')}
              placeholder="Dirección de entrega"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.address && (
              <p className="mt-1 text-[13px] text-red-500">{errors.address.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200" />

      {/* Agregar productos */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Agregar Producto</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchableSelect
              options={productOptions}
              value={selectedProduct || null}
              onChange={(val) => setSelectedProduct(val ? String(val) : '')}
              placeholder="Buscar producto..."
              searchPlaceholder="Buscar producto..."
            />
          </div>
          <Input
            type="number"
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
            min="1"
            className="w-[70px] text-center"
            placeholder="Cant."
          />
          <Button type="button" onClick={handleAddProduct} className="bg-green-600 hover:bg-green-700 text-white px-4">
            Agregar
          </Button>
        </div>
      </div>

      {/* Products table */}
      {orderItems.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="flex items-center bg-gray-50 px-3 h-9 border-b border-gray-200">
            <div className="flex-1 text-xs font-semibold text-gray-600">Producto</div>
            <div className="w-[60px] text-xs font-semibold text-gray-600 text-center">Cant.</div>
            <div className="w-[80px] text-xs font-semibold text-gray-600 text-right">P. Unit.</div>
            <div className="w-[90px] text-xs font-semibold text-gray-600 text-right">Total</div>
            <div className="w-[36px]" />
          </div>

          {/* Table rows (scrollable when many products) */}
          <div className="max-h-[300px] overflow-y-auto">
            {orderItems.map(item => (
              <div key={item.id} className="flex items-center px-3 py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-gray-400">{item.product.code}</p>
                  </div>
                </div>
                <div className="w-[60px] flex justify-center">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-14 text-center text-[13px] border border-gray-300 rounded py-1 focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="w-[80px] text-[13px] text-gray-700 text-right">
                  ${item.unitPrice.toFixed(2)}
                </div>
                <div className="w-[90px] text-[13px] font-semibold text-gray-900 text-right">
                  ${item.total.toFixed(2)}
                </div>
                <div className="w-[36px] flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 px-3 py-3 space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Subtotal:</span>
              <span className="text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">IVA (16%):</span>
              <span className="text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
          <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay productos agregados</p>
          <p className="text-xs text-gray-400">Selecciona productos para agregar al pedido</p>
        </div>
      )}
      {itemsError && (
        <p className="text-[13px] text-red-500">{itemsError}</p>
      )}

      {/* Notas */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">Notas del pedido</label>
        <textarea
          {...register('notes')}
          placeholder="Comentarios adicionales..."
          rows={3}
          className={`w-full p-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors.notes ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.notes && (
          <p className="mt-1 text-[13px] text-red-500">{errors.notes.message}</p>
        )}
      </div>
    </form>
  );
});

OrderForm.displayName = 'OrderForm';

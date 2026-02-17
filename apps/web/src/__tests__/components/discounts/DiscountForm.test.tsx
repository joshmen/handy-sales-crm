/// <reference path="../../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscountForm } from '@/components/discounts/DiscountForm';
import { DiscountType, DiscountMethod, CreateDiscountDto } from '@/types/discounts';

// Mock UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Input', () => ({
  Input: ({
    id,
    value,
    onChange,
    type,
    placeholder,
    min,
    step,
    className,
    onFocus,
  }: {
    id?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    min?: string;
    step?: string;
    className?: string;
    onFocus?: () => void;
  }) => (
    <input
      id={id}
      type={type || 'text'}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      step={step}
      className={className}
      onFocus={onFocus}
      data-testid={id ? `input-${id}` : undefined}
    />
  ),
}));

jest.mock('@/components/ui/Label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/SelectCompat', () => ({
  SelectCompat: ({
    children,
    value,
    onChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <select value={value} onChange={onChange} data-testid="select-method">
      {children}
    </select>
  ),
}));

jest.mock('@/components/ui/Badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
  Search: () => <span data-testid="icon-search">🔍</span>,
}));

// Test data
const mockProducts = [
  { id: 'prod-1', name: 'Producto Test 1', code: 'PROD001' },
  { id: 'prod-2', name: 'Producto Test 2', code: 'PROD002' },
  { id: 'prod-3', name: 'Otro Item', code: 'ITEM003' },
];

const createDefaultFormData = (): CreateDiscountDto => ({
  name: '',
  description: '',
  type: DiscountType.GLOBAL,
  method: DiscountMethod.PERCENTAGE,
  isPermanent: true,
  isStackable: false,
  quantityRanges: [
    {
      minQuantity: 1,
      maxQuantity: undefined,
      discountValue: 0,
      description: '',
    },
  ],
});

describe('DiscountForm', () => {
  const mockOnFormChange = jest.fn();
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all card sections', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Tipo de descuento')).toBeInTheDocument();
      expect(screen.getByText('Información básica')).toBeInTheDocument();
      expect(screen.getByText('Rangos de descuento')).toBeInTheDocument();
      expect(screen.getByText('Configuraciones avanzadas')).toBeInTheDocument();
      expect(screen.getByText('Vigencia del descuento')).toBeInTheDocument();
    });

    it('should render discount type buttons', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Descuento global')).toBeInTheDocument();
      expect(screen.getByText('Descuento por producto')).toBeInTheDocument();
    });

    it('should render basic info fields', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Nombre del descuento')).toBeInTheDocument();
      expect(screen.getByText('Descripción (opcional)')).toBeInTheDocument();
      expect(screen.getByText('Método de descuento')).toBeInTheDocument();
    });

    it('should render method options', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Porcentaje (%)')).toBeInTheDocument();
      expect(screen.getByText('Monto fijo ($)')).toBeInTheDocument();
    });

    it('should render stackable checkbox', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Combinable con otros descuentos')).toBeInTheDocument();
    });

    it('should render permanent checkbox', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Descuento permanente')).toBeInTheDocument();
    });

    it('should render add range button', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Agregar rango')).toBeInTheDocument();
    });
  });

  describe('discount type selection', () => {
    it('should highlight GLOBAL type when selected', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.GLOBAL,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const globalButton = screen.getByText('Descuento global').closest('button');
      expect(globalButton).toHaveClass('border-blue-500');
    });

    it('should highlight PRODUCT_SPECIFIC type when selected', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const productButton = screen.getByText('Descuento por producto').closest('button');
      expect(productButton).toHaveClass('border-blue-500');
    });

    it('should call onFormChange when type changes to PRODUCT_SPECIFIC', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
          onTypeChange={mockOnTypeChange}
        />
      );

      const productButton = screen.getByText('Descuento por producto').closest('button');
      fireEvent.click(productButton!);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DiscountType.PRODUCT_SPECIFIC,
          productId: undefined,
        })
      );
    });

    it('should call onTypeChange callback when type changes', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
          onTypeChange={mockOnTypeChange}
        />
      );

      const productButton = screen.getByText('Descuento por producto').closest('button');
      fireEvent.click(productButton!);

      expect(mockOnTypeChange).toHaveBeenCalledWith(DiscountType.PRODUCT_SPECIFIC);
    });

    it('should show product search when PRODUCT_SPECIFIC is selected', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      expect(screen.getByPlaceholderText('Buscar producto por nombre o código...')).toBeInTheDocument();
    });

    it('should not show product search for GLOBAL type', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      expect(screen.queryByPlaceholderText('Buscar producto por nombre o código...')).not.toBeInTheDocument();
    });
  });

  describe('basic info fields', () => {
    it('should call onFormChange when name changes', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'Descuento Test' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Descuento Test',
        })
      );
    });

    it('should call onFormChange when description changes', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const descInput = screen.getByTestId('input-description');
      fireEvent.change(descInput, { target: { value: 'Descripción test' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Descripción test',
        })
      );
    });

    it('should call onFormChange when method changes', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const methodSelect = screen.getByTestId('select-method');
      fireEvent.change(methodSelect, { target: { value: DiscountMethod.FIXED_AMOUNT } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          method: DiscountMethod.FIXED_AMOUNT,
        })
      );
    });

    it('should call onFormChange when isStackable changes', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const stackableCheckbox = screen.getByText('Combinable con otros descuentos')
        .previousElementSibling as HTMLInputElement;
      fireEvent.click(stackableCheckbox);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isStackable: true,
        })
      );
    });
  });

  describe('product search', () => {
    it('should filter products by name', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o código...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });
      fireEvent.focus(searchInput);

      // Should show Producto Test 1 and Producto Test 2
      expect(screen.getByText('Producto Test 1')).toBeInTheDocument();
      expect(screen.getByText('Producto Test 2')).toBeInTheDocument();
      // Should NOT show Otro Item
      expect(screen.queryByText('Otro Item')).not.toBeInTheDocument();
    });

    it('should filter products by code', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o código...');
      fireEvent.change(searchInput, { target: { value: 'ITEM003' } });
      fireEvent.focus(searchInput);

      expect(screen.getByText('Otro Item')).toBeInTheDocument();
      expect(screen.queryByText('Producto Test 1')).not.toBeInTheDocument();
    });

    it('should select product and call onFormChange', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o código...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });
      fireEvent.focus(searchInput);

      // Click on a product
      const productButton = screen.getByText('Producto Test 1').closest('button');
      fireEvent.click(productButton!);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-1',
        })
      );
    });

    it('should show selected product badge', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
        productId: 'prod-1',
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={mockProducts}
        />
      );

      expect(screen.getByText('Producto seleccionado: Producto Test 1')).toBeInTheDocument();
    });
  });

  describe('quantity ranges', () => {
    it('should render initial quantity range', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Cantidad mínima')).toBeInTheDocument();
      expect(screen.getByText('Cantidad máxima')).toBeInTheDocument();
    });

    it('should add new range when clicking add button', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const addButton = screen.getByText('Agregar rango');
      fireEvent.click(addButton);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityRanges: expect.arrayContaining([
            expect.objectContaining({ minQuantity: 1 }),
            expect.objectContaining({ minQuantity: 2 }), // starts from last min + 1
          ]),
        })
      );
    });

    it('should calculate new range min based on previous max', () => {
      const formData = {
        ...createDefaultFormData(),
        quantityRanges: [
          { minQuantity: 1, maxQuantity: 10, discountValue: 5, description: '' },
        ],
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const addButton = screen.getByText('Agregar rango');
      fireEvent.click(addButton);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityRanges: expect.arrayContaining([
            expect.objectContaining({ minQuantity: 1, maxQuantity: 10 }),
            expect.objectContaining({ minQuantity: 11 }), // previous max + 1
          ]),
        })
      );
    });

    it('should update range minQuantity', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      // Find the minQuantity input (has value 1)
      const minInput = screen.getByDisplayValue('1') as HTMLInputElement;
      fireEvent.change(minInput, { target: { value: '5' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityRanges: [
            expect.objectContaining({ minQuantity: 5 }),
          ],
        })
      );
    });

    it('should update range discountValue', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      // Find the discount value input (has value 0)
      const discountInput = screen.getByDisplayValue('0') as HTMLInputElement;
      fireEvent.change(discountInput, { target: { value: '10' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityRanges: [
            expect.objectContaining({ discountValue: 10 }),
          ],
        })
      );
    });

    it('should not allow removing last range', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      // Only one range, delete button should be disabled
      const deleteButton = screen.getByTestId('icon-trash').closest('button');
      expect(deleteButton).toBeDisabled();
    });

    it('should allow removing range when more than one', () => {
      const formData = {
        ...createDefaultFormData(),
        quantityRanges: [
          { minQuantity: 1, maxQuantity: 10, discountValue: 5, description: '' },
          { minQuantity: 11, maxQuantity: 20, discountValue: 10, description: '' },
        ],
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      // Both delete buttons should be enabled
      const deleteButtons = screen.getAllByTestId('icon-trash');
      expect(deleteButtons.length).toBe(2);

      // Click first delete
      fireEvent.click(deleteButtons[0].closest('button')!);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityRanges: [
            expect.objectContaining({ minQuantity: 11, maxQuantity: 20 }),
          ],
        })
      );
    });
  });

  describe('advanced settings', () => {
    it('should update minimumAmount', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const minAmountInput = screen.getByTestId('input-minimumAmount');
      fireEvent.change(minAmountInput, { target: { value: '100' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumAmount: 100,
        })
      );
    });

    it('should update maximumDiscount', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const maxDiscountInput = screen.getByTestId('input-maximumDiscount');
      fireEvent.change(maxDiscountInput, { target: { value: '500' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          maximumDiscount: 500,
        })
      );
    });

    it('should clear minimumAmount when empty', () => {
      const formData = {
        ...createDefaultFormData(),
        minimumAmount: 100,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const minAmountInput = screen.getByTestId('input-minimumAmount');
      fireEvent.change(minAmountInput, { target: { value: '' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumAmount: undefined,
        })
      );
    });
  });

  describe('validity settings', () => {
    it('should toggle isPermanent', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      const permanentCheckbox = screen.getByText('Descuento permanente')
        .previousElementSibling as HTMLInputElement;
      fireEvent.click(permanentCheckbox);

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isPermanent: false,
        })
      );
    });

    it('should show date inputs when not permanent', () => {
      const formData = {
        ...createDefaultFormData(),
        isPermanent: false,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Fecha de inicio')).toBeInTheDocument();
      expect(screen.getByText('Fecha de fin')).toBeInTheDocument();
    });

    it('should not show date inputs when permanent', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.queryByText('Fecha de inicio')).not.toBeInTheDocument();
      expect(screen.queryByText('Fecha de fin')).not.toBeInTheDocument();
    });

    it('should update validFrom date', () => {
      const formData = {
        ...createDefaultFormData(),
        isPermanent: false,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const validFromInput = screen.getByTestId('input-validFrom');
      fireEvent.change(validFromInput, { target: { value: '2024-01-15' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          validFrom: expect.any(Date),
        })
      );
    });

    it('should update validTo date', () => {
      const formData = {
        ...createDefaultFormData(),
        isPermanent: false,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      const validToInput = screen.getByTestId('input-validTo');
      fireEvent.change(validToInput, { target: { value: '2024-12-31' } });

      expect(mockOnFormChange).toHaveBeenCalledWith(
        expect.objectContaining({
          validTo: expect.any(Date),
        })
      );
    });
  });

  describe('display values', () => {
    it('should display existing form values', () => {
      const formData = {
        ...createDefaultFormData(),
        name: 'Descuento Especial',
        description: 'Descripción del descuento',
        method: DiscountMethod.FIXED_AMOUNT,
        isStackable: true,
        minimumAmount: 250,
        maximumDiscount: 1000,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByTestId('input-name')).toHaveValue('Descuento Especial');
      expect(screen.getByTestId('input-description')).toHaveValue('Descripción del descuento');
      expect(screen.getByTestId('input-minimumAmount')).toHaveValue(250);
      expect(screen.getByTestId('input-maximumDiscount')).toHaveValue(1000);
    });

    it('should display multiple quantity ranges', () => {
      const formData = {
        ...createDefaultFormData(),
        quantityRanges: [
          { minQuantity: 1, maxQuantity: 10, discountValue: 5, description: '' },
          { minQuantity: 11, maxQuantity: 50, discountValue: 10, description: '' },
          { minQuantity: 51, maxQuantity: undefined, discountValue: 15, description: '' },
        ],
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      // Should have 3 ranges
      const deleteButtons = screen.getAllByTestId('icon-trash');
      expect(deleteButtons.length).toBe(3);
    });

    it('should display correct discount label based on method', () => {
      const formData = {
        ...createDefaultFormData(),
        method: DiscountMethod.PERCENTAGE,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Descuento (%)')).toBeInTheDocument();
    });

    it('should display dollar sign for fixed amount method', () => {
      const formData = {
        ...createDefaultFormData(),
        method: DiscountMethod.FIXED_AMOUNT,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      expect(screen.getByText('Descuento ($)')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty products array', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
          products={[]}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar producto por nombre o código...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.focus(searchInput);

      // No products should show
      expect(screen.queryByText('Producto Test 1')).not.toBeInTheDocument();
    });

    it('should handle products prop being undefined', () => {
      const formData = {
        ...createDefaultFormData(),
        type: DiscountType.PRODUCT_SPECIFIC,
      };

      render(
        <DiscountForm
          formData={formData}
          onFormChange={mockOnFormChange}
        />
      );

      // Should not crash
      expect(screen.getByPlaceholderText('Buscar producto por nombre o código...')).toBeInTheDocument();
    });

    it('should handle undefined onTypeChange', () => {
      render(
        <DiscountForm
          formData={createDefaultFormData()}
          onFormChange={mockOnFormChange}
          // onTypeChange is not provided
        />
      );

      const productButton = screen.getByText('Descuento por producto').closest('button');

      // Should not throw
      expect(() => fireEvent.click(productButton!)).not.toThrow();
    });
  });
});

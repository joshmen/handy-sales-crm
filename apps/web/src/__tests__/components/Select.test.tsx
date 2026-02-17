/// <reference path="../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '@/components/ui/Select';

// Mock ResizeObserver for Radix UI
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = jest.fn();

  // Mock pointer events
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
  window.HTMLElement.prototype.setPointerCapture = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
});

describe('Select Components', () => {
  describe('SelectTrigger', () => {
    it('renders trigger button', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows placeholder text', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByText('Selecciona una opción')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Select>
          <SelectTrigger ref={ref}>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('shows chevron icon', () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      // Lucide ChevronDown icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('can be disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toBeDisabled();
    });
  });

  describe('SelectContent', () => {
    it('opens content when trigger is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });
  });

  describe('SelectItem', () => {
    it('renders option items', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Manzana</SelectItem>
            <SelectItem value="banana">Plátano</SelectItem>
            <SelectItem value="orange">Naranja</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Manzana')).toBeInTheDocument();
        expect(screen.getByText('Plátano')).toBeInTheDocument();
        expect(screen.getByText('Naranja')).toBeInTheDocument();
      });
    });

    it('selects item on click', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar fruta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Manzana</SelectItem>
            <SelectItem value="banana">Plátano</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Manzana')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manzana'));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveTextContent('Manzana');
      });
    });

    it('can be disabled', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled" disabled>Disabled</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const disabledItem = screen.getByText('Disabled').closest('[role="option"]');
        expect(disabledItem).toHaveAttribute('data-disabled');
      });
    });
  });

  describe('SelectGroup and SelectLabel', () => {
    it('renders grouped options with labels', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Frutas</SelectLabel>
              <SelectItem value="apple">Manzana</SelectItem>
              <SelectItem value="banana">Plátano</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Verduras</SelectLabel>
              <SelectItem value="carrot">Zanahoria</SelectItem>
              <SelectItem value="lettuce">Lechuga</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Frutas')).toBeInTheDocument();
        expect(screen.getByText('Verduras')).toBeInTheDocument();
        expect(screen.getByText('Manzana')).toBeInTheDocument();
        expect(screen.getByText('Zanahoria')).toBeInTheDocument();
      });
    });
  });

  describe('SelectSeparator', () => {
    it('renders separator between groups', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="b">Option B</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const separator = screen.getByTestId('separator');
        expect(separator).toBeInTheDocument();
      });
    });
  });

  describe('Controlled Select', () => {
    it('supports controlled value', () => {
      const handleValueChange = jest.fn();

      render(
        <Select value="banana" onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Manzana</SelectItem>
            <SelectItem value="banana">Plátano</SelectItem>
          </SelectContent>
        </Select>
      );

      // Should show the controlled value
      expect(screen.getByRole('combobox')).toHaveTextContent('Plátano');
    });

    it('calls onValueChange when selection changes', async () => {
      const user = userEvent.setup();
      const handleValueChange = jest.fn();

      render(
        <Select onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Manzana</SelectItem>
            <SelectItem value="banana">Plátano</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Manzana')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Manzana'));

      expect(handleValueChange).toHaveBeenCalledWith('apple');
    });
  });

  describe('Default Value', () => {
    it('shows default value on initial render', () => {
      render(
        <Select defaultValue="orange">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Manzana</SelectItem>
            <SelectItem value="orange">Naranja</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toHaveTextContent('Naranja');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Select>
          <SelectTrigger aria-label="Fruit selector">
            <SelectValue placeholder="Select fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-label', 'Fruit selector');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands aria-expanded when open', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Real-world Usage', () => {
    it('works as form field for client type selection', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      const TestForm = () => {
        const [clientType, setClientType] = React.useState('');

        return (
          <form onSubmit={(e) => { e.preventDefault(); onSubmit({ clientType }); }}>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mayorista">Mayorista</SelectItem>
                <SelectItem value="minorista">Minorista</SelectItem>
                <SelectItem value="distribuidor">Distribuidor</SelectItem>
              </SelectContent>
            </Select>
            <button type="submit">Submit</button>
          </form>
        );
      };

      render(<TestForm />);

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Mayorista')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Mayorista'));

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit).toHaveBeenCalledWith({ clientType: 'mayorista' });
    });

    it('works for zone selection', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();

      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="norte">Norte</SelectItem>
            <SelectItem value="sur">Sur</SelectItem>
            <SelectItem value="este">Este</SelectItem>
            <SelectItem value="oeste">Oeste</SelectItem>
            <SelectItem value="centro">Centro</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Norte')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Centro'));

      expect(handleChange).toHaveBeenCalledWith('centro');
    });
  });
});

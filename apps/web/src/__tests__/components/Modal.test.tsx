/// <reference path="../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <Modal {...defaultProps}>
          <p>Custom content</p>
          <button>Action</button>
        </Modal>
      );

      expect(screen.getByText('Custom content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      render(<Modal {...defaultProps} title="Modal Title" />);

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('does not render title section when not provided', () => {
      render(<Modal {...defaultProps} />);

      // Only content should be present, no header section
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders title as heading', () => {
      render(<Modal {...defaultProps} title="Test Heading" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Heading');
    });
  });

  describe('Close Button', () => {
    it('shows close button by default', () => {
      render(<Modal {...defaultProps} title="Title" />);

      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} title="Title" showCloseButton={false} />);

      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} title="Title" onClose={onClose} />);

      fireEvent.click(screen.getByText('✕'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn();
      const { container } = render(<Modal {...defaultProps} onClose={onClose} />);

      // Find the backdrop overlay
      const backdrop = container.querySelector('.bg-black.bg-opacity-50');
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside modal content', () => {
      const onClose = jest.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Modal content'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('applies small size', () => {
      const { container } = render(<Modal {...defaultProps} size="sm" />);

      const modalContent = container.querySelector('.max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies medium size by default', () => {
      const { container } = render(<Modal {...defaultProps} />);

      const modalContent = container.querySelector('.max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies large size', () => {
      const { container } = render(<Modal {...defaultProps} size="lg" />);

      const modalContent = container.querySelector('.max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('applies extra large size', () => {
      const { container } = render(<Modal {...defaultProps} size="xl" />);

      const modalContent = container.querySelector('.max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      render(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Accessibility', () => {
    it('has proper z-index for overlay', () => {
      const { container } = render(<Modal {...defaultProps} />);

      const overlay = container.querySelector('.z-50');
      expect(overlay).toBeInTheDocument();
    });

    it('centers modal content vertically and horizontally', () => {
      const { container } = render(<Modal {...defaultProps} />);

      const centeringContainer = container.querySelector('.flex.min-h-screen.items-center.justify-center');
      expect(centeringContainer).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('renders form inside modal', () => {
      render(
        <Modal {...defaultProps} title="Crear Cliente">
          <form>
            <label htmlFor="name">Nombre</label>
            <input id="name" type="text" />
            <button type="submit">Guardar</button>
          </form>
        </Modal>
      );

      expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    });

    it('renders confirmation dialog', () => {
      const onConfirm = jest.fn();
      const onClose = jest.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Confirmar Eliminación">
          <p>¿Está seguro que desea eliminar este elemento?</p>
          <div>
            <button onClick={onClose}>Cancelar</button>
            <button onClick={onConfirm}>Eliminar</button>
          </div>
        </Modal>
      );

      expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();
      expect(screen.getByText(/¿Está seguro/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(onClose).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid open/close transitions', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);

      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();

      rerender(<Modal {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      render(<Modal isOpen={true} onClose={jest.fn()} title="Empty Modal">{null}</Modal>);

      expect(screen.getByText('Empty Modal')).toBeInTheDocument();
    });
  });
});

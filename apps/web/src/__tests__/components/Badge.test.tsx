import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  describe('rendering', () => {
    it('should render with children', () => {
      render(<Badge>Badge Text</Badge>);
      expect(screen.getByText('Badge Text')).toBeInTheDocument();
    });

    it('should render as a div', () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('DIV');
    });

    it('should apply base classes', () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-semibold');
    });
  });

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('text-primary-foreground');
    });

    it('should apply secondary variant styles', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
    });

    it('should apply destructive variant styles', () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('text-destructive-foreground');
    });

    it('should apply outline variant styles', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('text-foreground');
    });

    it('should apply success variant styles', () => {
      render(<Badge variant="success" data-testid="badge">Success</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-green-500');
      expect(badge).toHaveClass('text-white');
    });

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-yellow-500');
      expect(badge).toHaveClass('text-white');
    });

    it('should apply info variant styles', () => {
      render(<Badge variant="info" data-testid="badge">Info</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-blue-500');
      expect(badge).toHaveClass('text-white');
    });
  });

  describe('className prop', () => {
    it('should merge custom className with default styles', () => {
      render(<Badge className="custom-class" data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('inline-flex');
    });

    it('should allow overriding specific styles', () => {
      render(<Badge className="text-lg" data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('text-lg');
    });
  });

  describe('props forwarding', () => {
    it('should forward id prop', () => {
      render(<Badge id="my-badge" data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('id', 'my-badge');
    });

    it('should forward aria attributes', () => {
      render(<Badge aria-label="Status badge" data-testid="badge">Active</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('aria-label', 'Status badge');
    });

    it('should forward data attributes', () => {
      render(<Badge data-status="active" data-testid="badge">Active</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-status', 'active');
    });

    it('should forward onClick handler', () => {
      const handleClick = jest.fn();
      render(<Badge onClick={handleClick} data-testid="badge">Clickable</Badge>);
      const badge = screen.getByTestId('badge');
      badge.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('use cases', () => {
    it('should render status badge', () => {
      render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render notification count badge', () => {
      render(<Badge variant="destructive">5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render category tag', () => {
      render(<Badge variant="secondary">Electronics</Badge>);
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <Badge data-testid="badge">
          <span className="mr-1">*</span>
          New
        </Badge>
      );
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });
});

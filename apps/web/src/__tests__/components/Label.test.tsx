import React from 'react';
import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/Label';

describe('Label', () => {
  describe('rendering', () => {
    it('should render with children', () => {
      render(<Label>Field Label</Label>);
      expect(screen.getByText('Field Label')).toBeInTheDocument();
    });

    it('should render as a label element', () => {
      render(<Label data-testid="label">Label Text</Label>);
      const label = screen.getByTestId('label');
      expect(label.tagName).toBe('LABEL');
    });

    it('should apply base classes', () => {
      render(<Label data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
      expect(label).toHaveClass('leading-none');
    });
  });

  describe('htmlFor prop', () => {
    it('should associate label with input via htmlFor', () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>
      );

      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email');
    });

    it('should make input accessible via label', () => {
      render(
        <>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </>
      );

      // The input should be findable by its label
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should merge custom className with default styles', () => {
      render(<Label className="custom-label" data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('custom-label');
      expect(label).toHaveClass('text-sm');
    });

    it('should allow extending styles', () => {
      render(<Label className="text-red-500" data-testid="label">Required</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('text-red-500');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to label element', () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('props forwarding', () => {
    it('should forward id prop', () => {
      render(<Label id="my-label" data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveAttribute('id', 'my-label');
    });

    it('should forward aria attributes', () => {
      render(<Label aria-describedby="help-text" data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should forward data attributes', () => {
      render(<Label data-required="true" data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveAttribute('data-required', 'true');
    });

    it('should forward onClick handler', () => {
      const handleClick = jest.fn();
      render(<Label onClick={handleClick} data-testid="label">Clickable Label</Label>);
      const label = screen.getByTestId('label');
      label.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('peer-disabled styles', () => {
    it('should have peer-disabled styles in class', () => {
      render(<Label data-testid="label">Label</Label>);
      const label = screen.getByTestId('label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('use cases', () => {
    it('should render form field label', () => {
      render(
        <div>
          <Label htmlFor="name">Full Name</Label>
          <input id="name" type="text" />
        </div>
      );

      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    it('should render required field indicator', () => {
      render(
        <Label htmlFor="required-field" className="flex items-center gap-1">
          Email Address
          <span className="text-red-500">*</span>
        </Label>
      );

      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveClass('text-red-500');
    });

    it('should render with help text', () => {
      render(
        <div>
          <Label htmlFor="password">Password</Label>
          <span id="password-help" className="text-xs text-gray-500">
            Must be at least 8 characters
          </span>
          <input id="password" type="password" aria-describedby="password-help" />
        </div>
      );

      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('should render checkbox label', () => {
      render(
        <div className="flex items-center gap-2">
          <input id="agree" type="checkbox" className="peer" />
          <Label htmlFor="agree">I agree to the terms</Label>
        </div>
      );

      expect(screen.getByLabelText('I agree to the terms')).toBeInTheDocument();
    });
  });
});

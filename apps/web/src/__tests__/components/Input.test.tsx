/// <reference path="../jest.d.ts" />

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with default styles', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('flex');
      expect(input).toHaveClass('h-10');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('border');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('label', () => {
    it('should render label when provided', () => {
      render(<Input label="Email" id="email" />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should associate label with input via id', () => {
      render(<Input label="Username" id="username" />);

      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('for', 'username');
    });

    it('should not render label when not provided', () => {
      render(<Input id="test" />);

      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('should support React nodes as label', () => {
      render(
        <Input
          label={
            <span>
              Email <span className="text-red-500">*</span>
            </span>
          }
          id="email"
        />
      );

      expect(screen.getByText('*')).toHaveClass('text-red-500');
    });
  });

  describe('hint text', () => {
    it('should render hint when provided', () => {
      render(<Input hint="Enter your email address" id="email" />);

      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should associate hint with input via aria-describedby', () => {
      render(<Input hint="Hint text" id="field" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-hint');
    });

    it('should not show hint when error is present', () => {
      render(<Input hint="Hint text" error="Error message" id="field" />);

      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should have correct styling for hint', () => {
      render(<Input hint="Help text" id="help" />);

      const hint = screen.getByText('Help text');
      expect(hint).toHaveClass('text-xs');
      expect(hint).toHaveClass('text-muted-foreground');
    });
  });

  describe('error state', () => {
    it('should render error message when provided', () => {
      render(<Input error="This field is required" id="required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styles on input', () => {
      render(<Input error="Error" id="error" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
      expect(input).toHaveClass('focus-visible:ring-red-500');
    });

    it('should associate error with input via aria-describedby', () => {
      render(<Input error="Error message" id="field" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-error');
    });

    it('should have correct styling for error message', () => {
      render(<Input error="Error text" id="error" />);

      const error = screen.getByText('Error text');
      expect(error).toHaveClass('text-xs');
      expect(error).toHaveClass('text-red-600');
    });
  });

  describe('input types', () => {
    it('should render text type by default', () => {
      render(<Input />);

      // default type is text (or undefined which browsers treat as text)
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render password type', () => {
      render(<Input type="password" data-testid="password-input" />);

      const input = screen.getByTestId('password-input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render email type', () => {
      render(<Input type="email" data-testid="email-input" />);

      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render number type', () => {
      render(<Input type="number" data-testid="number-input" />);

      const input = screen.getByTestId('number-input');
      expect(input).toHaveAttribute('type', 'number');
    });
  });

  describe('interactions', () => {
    it('should handle onChange', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should handle onFocus', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should update value on type', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hello' } });

      expect(input).toHaveValue('hello');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styles', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
      expect(input).toHaveClass('disabled:opacity-50');
    });

    it('should not be editable when disabled', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      // Disabled inputs have cursor-not-allowed style
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('placeholder', () => {
    it('should render placeholder', () => {
      render(<Input placeholder="Enter text..." />);

      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('should have placeholder styles', () => {
      render(<Input placeholder="Placeholder" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('placeholder:text-muted-foreground');
    });
  });

  describe('custom props', () => {
    it('should apply custom className to input', () => {
      render(<Input className="custom-input" />);

      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });

    it('should apply wrapperClassName to container', () => {
      render(<Input wrapperClassName="wrapper-class" />);

      const wrapper = screen.getByRole('textbox').parentElement;
      expect(wrapper).toHaveClass('wrapper-class');
    });

    it('should pass through HTML input attributes', () => {
      render(
        <Input
          name="email"
          maxLength={50}
          minLength={5}
          required
          autoComplete="email"
          data-testid="custom-input"
        />
      );

      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('name', 'email');
      expect(input).toHaveAttribute('maxLength', '50');
      expect(input).toHaveAttribute('minLength', '5');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      input.focus();

      expect(document.activeElement).toBe(input);
    });

    it('should have focus visible styles', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:outline-none');
      expect(input).toHaveClass('focus-visible:ring-2');
    });

    it('should have proper aria-describedby with both hint and error', () => {
      // When both provided, error takes precedence but describedby includes both
      render(<Input hint="Hint" error="Error" id="field" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'field-hint field-error');
    });

    it('should not have aria-describedby when no hint or error', () => {
      render(<Input id="field" />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('complete form field', () => {
    it('should render complete field with label, hint, and input', () => {
      render(
        <Input
          id="email"
          label="Email Address"
          hint="We'll never share your email"
          placeholder="you@example.com"
        />
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    it('should render complete error state', () => {
      render(
        <Input
          id="email"
          label="Email Address"
          error="Please enter a valid email"
          placeholder="you@example.com"
        />
      );

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });
  });
});

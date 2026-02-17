'use client';

import React, { Children, isValidElement } from 'react';
import {
  Select as ShSelect,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select';

type OptionEl = React.ReactElement<{
  value: string | number;
  disabled?: boolean;
  children?: React.ReactNode;
}>;

type Props = {
  id?: string;
  label?: string;
  className?: string;
  placeholder?: string;
  value: string; // seguimos mimetizando <select>
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode; // <option>...</option>...
};

export function SelectCompat({
  value,
  onChange,
  className,
  placeholder,
  label,
  id,
  children,
}: Props) {
  const allOptions = Children.toArray(children).filter(isValidElement) as OptionEl[];

  // Detecta opción "vacía" para usar su texto como placeholder
  const emptyOption = allOptions.find(o => String(o.props.value) === '');
  const options = allOptions.filter(o => String(o.props.value) !== '');

  // Etiqueta de la opción seleccionada (solo informativa)
  const selectedLabel =
    allOptions.find(o => String(o.props.value) === String(value))?.props.children ?? undefined;

  const computedPlaceholder = placeholder ?? (emptyOption ? emptyOption.props.children : undefined);

  const emitChange = (v: string) => onChange({ target: { value: v } });

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      ) : null}

      {/* value: si está vacío, pásalo como undefined para que Radix muestre el placeholder */}
      <ShSelect value={value || undefined} onValueChange={v => emitChange(String(v))}>
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder={computedPlaceholder ?? selectedLabel} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem
              key={String(opt.props.value)}
              value={String(opt.props.value)}
              disabled={opt.props.disabled}
            >
              {opt.props.children}
            </SelectItem>
          ))}
        </SelectContent>
      </ShSelect>
    </div>
  );
}

export default SelectCompat;

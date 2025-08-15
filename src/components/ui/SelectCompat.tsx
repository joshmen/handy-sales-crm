'use client';

import React, { Children, isValidElement } from 'react';
import {
  Select as ShSelect,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select';

// Opciones nativas <option>
type OptionEl = React.ReactElement<{
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
}>;

type Props = {
  value: string;
  onChange: (e: { target: { value: string } }) => void; // misma firma que <select>
  className?: string; // se aplica al Trigger
  placeholder?: React.ReactNode; // texto dentro del trigger
  label?: React.ReactNode; // ← NUEVO: etiqueta visible arriba
  id?: string; // ← NUEVO: para asociar label con el trigger
  children: React.ReactNode; // tus <option>...</option>
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
  const options = Children.toArray(children).filter(isValidElement) as OptionEl[];

  // etiqueta del valor seleccionado (fallback del placeholder)
  const selectedLabel: React.ReactNode =
    options.find(o => String(o.props.value) === String(value))?.props.children ?? undefined;

  const emitChange = (v: string) => onChange({ target: { value: v } });

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      ) : null}

      <ShSelect value={value} onValueChange={v => emitChange(String(v))}>
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder={placeholder ?? selectedLabel} />
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

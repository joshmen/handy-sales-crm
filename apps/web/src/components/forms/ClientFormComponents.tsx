'use client';

import React from 'react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Check, AlertCircle, HelpCircle } from 'lucide-react';
import type { ClientFormData } from '@/lib/validations/client';

// === Checkbox con tooltip ===

export function Checkbox({
  name,
  control,
  label,
  tooltip,
}: {
  name: keyof ClientFormData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  label: string;
  tooltip?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.preventDefault(); field.onChange(!field.value); }}>
          <div
            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
              field.value ? 'bg-[#16A34A]' : 'border border-gray-300 bg-white'
            }`}
          >
            {field.value && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <span className="text-[13px] text-gray-700">{label}</span>
          {tooltip && (
            <div className="relative group" onClick={(e) => e.stopPropagation()}>
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-[11px] rounded-lg w-56 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </label>
      )}
    />
  );
}

// === FormField wrapper ===

export function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// === Input class helper ===

export function inputClass(error?: { message?: string }) {
  return `w-full h-9 px-3 text-[13px] border rounded focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent ${
    error ? 'border-red-500' : 'border-gray-300'
  }`;
}

// === Section title ===

export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-[15px] font-bold text-gray-900">
        {children}
      </h2>
      {subtitle && <span className="text-xs text-gray-400">({subtitle})</span>}
    </div>
  );
}

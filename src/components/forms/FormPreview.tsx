'use client';

import React from 'react';
import { FormComponent } from '@/types/forms';
import { Card, Input, Button } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui';

interface FormPreviewProps {
  components: FormComponent[];
  onComponentEdit: (component: FormComponent) => void;
  onComponentDelete: (componentId: string) => void;
  onComponentMove: (componentId: string, direction: 'up' | 'down') => void;
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  components,
  onComponentEdit,
  onComponentDelete,
  onComponentMove,
}) => {
  const renderComponent = (component: FormComponent) => {
    const baseClasses =
      'border border-gray-300 rounded p-3 bg-white hover:border-teal-500 cursor-pointer transition-colors';

    switch (component.type) {
      case 'text':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              placeholder={component.placeholder || 'Escribe aquí...'}
              className="w-full p-2 border border-gray-300 rounded"
              disabled
            />
          </div>
        );

      case 'textarea':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              placeholder={component.placeholder || 'Escribe aquí...'}
              className="w-full p-2 border border-gray-300 rounded h-20"
              disabled
            />
          </div>
        );

      case 'select':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <select className="w-full p-2 border border-gray-300 rounded" disabled>
              <option>Selecciona una opción</option>
              {component.options?.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {component.options?.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input type="radio" name={component.id} className="mr-2" disabled />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {component.options?.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input type="checkbox" className="mr-2" disabled />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        );

      case 'signature':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center bg-gray-50">
              <div className="text-4xl mb-2">✍️</div>
              <p className="text-sm text-gray-600">Zona para dibujar</p>
            </div>
          </div>
        );

      case 'photo':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center bg-gray-50">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm text-gray-600">Subir fotografía</p>
            </div>
          </div>
        );

      case 'number':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              placeholder={component.placeholder || '0'}
              className="w-full p-2 border border-gray-300 rounded"
              disabled
            />
          </div>
        );

      case 'date':
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {component.label} {component.required && <span className="text-red-500">*</span>}
            </label>
            <input type="date" className="w-full p-2 border border-gray-300 rounded" disabled />
          </div>
        );

      default:
        return (
          <div className={baseClasses} onClick={() => onComponentEdit(component)}>
            <p className="text-gray-500">Componente: {component.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {components.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Construye tu formulario</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Selecciona un componente de la derecha y agrégalo al formulario. Haz clic sobre un
            componente en el formulario para modificarlo.
          </p>
        </div>
      ) : (
        components
          .sort((a, b) => a.order - b.order)
          .map((component, index) => (
            <div key={component.id} className="relative group">
              {renderComponent(component)}

              {/* Controles de componente */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  {index > 0 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onComponentMove(component.id, 'up');
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                      title="Mover arriba"
                    >
                      ↑
                    </button>
                  )}
                  {index < components.length - 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onComponentMove(component.id, 'down');
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                      title="Mover abajo"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onComponentDelete(component.id);
                    }}
                    className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50 text-red-600"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
};

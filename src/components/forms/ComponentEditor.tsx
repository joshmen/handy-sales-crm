/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { FormComponent, FormOption } from '@/types/forms';
import { Modal, Button, Input } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui';

interface ComponentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  component: FormComponent | null;
  onSave: (component: FormComponent) => void;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
  isOpen,
  onClose,
  component,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    label: '',
    placeholder: '',
    required: false,
    options: [] as FormOption[],
    validation: {
      min: undefined as number | undefined,
      max: undefined as number | undefined,
      pattern: undefined as string | undefined, // ← Cambiar a undefined
      message: undefined as string | undefined, // ← Cambiar a undefined
    },
    width: 'full' as 'full' | 'half' | 'third',
  });

  useEffect(() => {
    if (component) {
      setFormData({
        label: component.label || '',
        placeholder: component.placeholder || '',
        required: component.required || false,
        options: component.options || [],
        validation: {
          min: component.validation?.min,
          max: component.validation?.max,
          pattern: component.validation?.pattern,
          message: component.validation?.message,
        },
        width: component.width || 'full',
      });
    } else {
      setFormData({
        label: '',
        placeholder: '',
        required: false,
        options: [],
        validation: {
          min: undefined,
          max: undefined,
          pattern: undefined,
          message: undefined,
        },
        width: 'full',
      });
    }
  }, [component]);

  const widthOptions = [
    { value: 'full', label: 'Ancho completo' },
    { value: 'half', label: 'Medio ancho' },
    { value: 'third', label: 'Un tercio' },
  ];

  const needsOptions =
    component?.type === 'select' || component?.type === 'radio' || component?.type === 'checkbox';

  const handleSave = () => {
    if (!component || !formData.label.trim()) {
      alert('El campo etiqueta es requerido');
      return;
    }

    const updatedComponent: FormComponent = {
      ...component,
      label: formData.label,
      placeholder: formData.placeholder,
      required: formData.required,
      options: needsOptions ? formData.options : undefined,
      validation: formData.validation,
      width: formData.width,
    };

    onSave(updatedComponent);
    onClose();
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }],
    }));
  };

  const handleUpdateOption = (index: number, field: 'value' | 'label', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Campo de Texto',
      textarea: 'Área de Texto',
      select: 'Lista Desplegable',
      radio: 'Botones de Radio',
      checkbox: 'Casillas de Verificación',
      signature: 'Firma Digital',
      photo: 'Captura de Foto',
      number: 'Campo Numérico',
      date: 'Selector de Fecha',
      products: 'Selector de Productos',
    };
    return labels[type] || type;
  };

  if (!component) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar ${getTypeLabel(component.type)}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Información del tipo */}
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">
            Tipo de componente: <span className="font-medium">{getTypeLabel(component.type)}</span>
          </p>
        </div>

        {/* Configuración básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Etiqueta *"
            value={formData.label}
            onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Ej: Nombre completo"
          />

          {(component.type === 'text' ||
            component.type === 'textarea' ||
            component.type === 'number') && (
            <Input
              label="Placeholder"
              value={formData.placeholder}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  placeholder: e.target.value,
                }))
              }
              placeholder="Texto de ayuda"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={e => setFormData(prev => ({ ...prev, required: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="required" className="text-sm font-medium">
              Campo requerido
            </label>
          </div>

          <Select
            label="Ancho del componente"
            //options={widthOptions}
            value={formData.width}
            onChange={e => setFormData(prev => ({ ...prev, width: e.target.value as any }))}
          >
            <option value="">Ancho del componente</option>
            {widthOptions.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Opciones para select, radio, checkbox */}
        {needsOptions && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                Opciones {formData.required && <span className="text-red-500">*</span>}
              </label>
              <Button size="sm" onClick={handleAddOption}>
                + Agregar Opción
              </Button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Valor"
                    value={option.value}
                    onChange={e => handleUpdateOption(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Etiqueta"
                    value={option.label}
                    onChange={e => handleUpdateOption(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {formData.options.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay opciones. Haz clic en &quot;Agregar Opción&quot; para comenzar.
              </p>
            )}
          </div>
        )}

        {/* Validaciones para campos numéricos */}
        {(component.type === 'number' || component.type === 'text') && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Validaciones</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {component.type === 'number' && (
                <>
                  <Input
                    label="Valor mínimo"
                    type="number"
                    value={formData.validation.min || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        validation: {
                          ...prev.validation,
                          min: parseInt(e.target.value) || undefined,
                        },
                      }))
                    }
                  />
                  <Input
                    label="Valor máximo"
                    type="number"
                    value={formData.validation.max || ''}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        validation: {
                          ...prev.validation,
                          max: parseInt(e.target.value) || undefined,
                        },
                      }))
                    }
                  />
                </>
              )}

              {component.type === 'text' && (
                <Input
                  label="Patrón (regex)"
                  value={formData.validation.pattern || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      validation: {
                        ...prev.validation,
                        pattern: e.target.value || undefined,
                      },
                    }))
                  }
                  placeholder="^[a-zA-Z]+$"
                />
              )}

              <Input
                label="Mensaje de error personalizado"
                value={formData.validation.message || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    validation: {
                      ...prev.validation,
                      message: e.target.value || undefined,
                    },
                  }))
                }
                placeholder="Este campo es inválido"
              />
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar Componente</Button>
        </div>
      </div>
    </Modal>
  );
};

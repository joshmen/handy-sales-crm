import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { Zone, ZoneForm, ZONE_COLORS } from '@/types/zones';
import { User } from '@/types/users';

interface ZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  zone?: Zone;
  availableUsers: User[];
  usedColors: string[];
  onSubmit: (data: ZoneForm) => void;
  loading?: boolean;
}

export function ZoneModal({
  open,
  onOpenChange,
  mode,
  zone,
  availableUsers,
  usedColors,
  onSubmit,
  loading = false,
}: ZoneModalProps) {
  const [formData, setFormData] = useState<ZoneForm>({
    name: '',
    description: '',
    color: ZONE_COLORS[0],
    isEnabled: true,
    userIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or zone changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && zone) {
        setFormData({
          name: zone.name,
          description: zone.description || '',
          color: zone.color,
          isEnabled: zone.isEnabled,
          userIds: zone.userIds,
        });
      } else {
        // Para crear nueva zona, usar el primer color disponible
        const availableColors = ZONE_COLORS.filter(color => 
          !usedColors.includes(color) || (zone && color === zone.color)
        );
        
        setFormData({
          name: '',
          description: '',
          color: availableColors[0] || ZONE_COLORS[0],
          isEnabled: true,
          userIds: [],
        });
      }
      setErrors({});
    }
  }, [open, mode, zone, usedColors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!formData.color) {
      newErrors.color = 'Selecciona un color';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const updateFormData = (updates: Partial<ZoneForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const getModalTitle = () => {
    return mode === 'edit' ? 'Editar zona' : 'Crear zona';
  };

  // Filtrar colores disponibles
  const availableColors = ZONE_COLORS.filter(color => 
    !usedColors.includes(color) || (zone && color === zone.color)
  );

  // Preparar opciones de usuarios
  const userOptions = availableUsers.map(user => ({
    value: user.id,
    label: `${user.name} (${user.email})`,
    description: user.role,
  }));

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={getModalTitle()}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la zona *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              error={errors.name}
              placeholder="Ej: Zona Norte, Centro Comercial, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Describe la zona geográfica o comercial..."
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Color de la zona */}
        <div className="space-y-3">
          <Label>Color de identificación *</Label>
          <p className="text-sm text-muted-foreground">
            Este color se usará para identificar la zona en el mapa
          </p>
          
          <div className="grid grid-cols-5 gap-3">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateFormData({ color })}
                className={`h-12 w-full rounded-lg border-2 transition-all hover:scale-105 ${
                  formData.color === color 
                    ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {formData.color === color && (
                  <div className="flex items-center justify-center h-full text-white text-xl font-bold">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {availableColors.length === 0 && (
            <p className="text-sm text-amber-600">
              Todos los colores están en uso. Considera editar o eliminar zonas existentes.
            </p>
          )}
          
          {errors.color && (
            <p className="text-xs text-red-600">{errors.color}</p>
          )}
        </div>

        <Separator />

        {/* Usuarios asignados */}
        <div className="space-y-3">
          <Label>Usuarios asignados</Label>
          <p className="text-sm text-muted-foreground">
            Selecciona los usuarios que trabajarán en esta zona
          </p>
          
          <div className="space-y-2">
            {userOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`user-${option.value}`}
                  checked={formData.userIds.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFormData({ 
                        userIds: [...formData.userIds, option.value] 
                      });
                    } else {
                      updateFormData({ 
                        userIds: formData.userIds.filter(id => id !== option.value) 
                      });
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor={`user-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {userOptions.length === 0 && (
            <p className="text-sm text-gray-500">
              No hay usuarios disponibles para asignar
            </p>
          )}
        </div>

        <Separator />

        {/* Estado de la zona */}
        <div className="space-y-3">
          <Label>Estado de la zona</Label>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => updateFormData({ isEnabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <Label htmlFor="isEnabled" className="text-sm font-normal cursor-pointer">
                Zona activa
              </Label>
              <p className="text-xs text-muted-foreground">
                Las zonas inactivas no aparecerán en las asignaciones
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.name.trim() || !formData.color}
          >
            {mode === 'edit' ? 'Actualizar' : 'Crear'} Zona
          </Button>
        </div>
      </form>
    </Modal>
  );
}

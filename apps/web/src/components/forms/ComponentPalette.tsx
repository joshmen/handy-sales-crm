"use client";

import React from "react";
import { FormComponent } from "@/types/forms";
import { Card, CardHeader, CardContent } from "@/components/ui";

interface ComponentPaletteProps {
  onComponentAdd: (type: FormComponent["type"]) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onComponentAdd,
}) => {
  const basicComponents = [
    {
      type: "text" as const,
      label: "Campo de texto *",
      icon: "📝",
      description: "Input de texto simple",
    },
    {
      type: "textarea" as const,
      label: "Descripción texto (marca opcional)",
      icon: "📄",
      description: "Área de texto largo",
    },
    {
      type: "select" as const,
      label: "Opción múltiple, múltiple selección *",
      icon: "📋",
      description: "Lista desplegable",
    },
    {
      type: "radio" as const,
      label: "Opción múltiple, selección única *",
      icon: "🔘",
      description: "Botones de radio",
    },
    {
      type: "checkbox" as const,
      label: "Casillas de verificación",
      icon: "☑️",
      description: "Múltiples selecciones",
    },
    {
      type: "photo" as const,
      label: "Capturar fotografía",
      icon: "📷",
      description: "Subir imagen",
    },
    {
      type: "signature" as const,
      label: "Firma",
      icon: "✍️",
      description: "Captura de firma digital",
    },
    {
      type: "number" as const,
      label: "Número",
      icon: "🔢",
      description: "Campo numérico",
    },
    {
      type: "date" as const,
      label: "Fecha",
      icon: "📅",
      description: "Selector de fecha",
    },
    {
      type: "products" as const,
      label: "Productos",
      icon: "📦",
      description: "Selector de productos",
    },
  ];

  return (
    <Card className="h-fit">
      <CardHeader>
        <h3 className="font-semibold">Componentes</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-sm text-gray-600">Básicos</h4>
            <div className="space-y-2">
              {basicComponents.map((component) => (
                <div
                  key={component.type}
                  className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  onClick={() => onComponentAdd(component.type)}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{component.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {component.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {component.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

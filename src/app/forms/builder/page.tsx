/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardContent, Button, Input } from "@/components/ui";
import { ComponentPalette } from "@/components/forms/ComponentPalette";
import { FormPreview } from "@/components/forms/FormPreview";
import { ComponentEditor } from "@/components/forms/ComponentEditor";
import { FormComponent, Form } from "@/types/forms";

export default function FormBuilderPage() {
  const [formName, setFormName] = useState("test");
  const [formType, setFormType] = useState("sales");
  const [components, setComponents] = useState<FormComponent[]>([
    {
      id: "comp-1",
      type: "radio",
      label: "Opción múltiple, múltiple selección",
      required: true,
      options: [
        { value: "valor1", label: "valor uno" },
        { value: "valor2", label: "valor dos" },
      ],
      order: 1,
    },
    {
      id: "comp-2",
      type: "radio",
      label: "Opción múltiple, múltiple selección",
      required: true,
      options: [
        { value: "valor1", label: "valor uno" },
        { value: "valor2", label: "valor dos" },
      ],
      order: 2,
    },
    {
      id: "comp-3",
      type: "signature",
      label: "Nombre y firma del encargado",
      required: false,
      order: 3,
    },
    {
      id: "comp-4",
      type: "radio",
      label: "Tipo de cliente",
      required: true,
      options: [
        { value: "mayorista", label: "Mayorista" },
        { value: "medio-mayorista", label: "Medio-mayorista" },
        { value: "minorista", label: "Minorista / venta al detalle" },
        { value: "vip", label: "VIP" },
      ],
      order: 4,
    },
  ]);

  const [editingComponent, setEditingComponent] =
    useState<FormComponent | null>(null);
  const [showComponentEditor, setShowComponentEditor] = useState(false);

  const handleComponentAdd = (type: FormComponent["type"]) => {
    const newComponent: FormComponent = {
      id: `comp-${Date.now()}`,
      type,
      label: `Nuevo ${type}`,
      required: false,
      order: components.length + 1,
      options: ["select", "radio", "checkbox"].includes(type)
        ? [{ value: "opcion1", label: "Opción 1" }]
        : undefined,
    };

    setComponents([...components, newComponent]);
    setEditingComponent(newComponent);
    setShowComponentEditor(true);
  };

  const handleComponentEdit = (component: FormComponent) => {
    setEditingComponent(component);
    setShowComponentEditor(true);
  };

  const handleComponentSave = (updatedComponent: FormComponent) => {
    setComponents(
      components.map((comp) =>
        comp.id === updatedComponent.id ? updatedComponent : comp
      )
    );
  };

  const handleComponentDelete = (componentId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este componente?")) {
      setComponents(components.filter((comp) => comp.id !== componentId));
    }
  };

  const handleComponentMove = (
    componentId: string,
    direction: "up" | "down"
  ) => {
    const currentIndex = components.findIndex(
      (comp) => comp.id === componentId
    );
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= components.length) return;

    const newComponents = [...components];
    [newComponents[currentIndex], newComponents[newIndex]] = [
      newComponents[newIndex],
      newComponents[currentIndex],
    ];

    // Actualizar el orden
    newComponents.forEach((comp, index) => {
      comp.order = index + 1;
    });

    setComponents(newComponents);
  };

  const handleSaveForm = () => {
    if (!formName.trim()) {
      alert("Por favor ingresa un nombre para el formulario");
      return;
    }

    const formData: Partial<Form> = {
      name: formName,
      type: formType as any,
      components,
      version: 1,
      isActive: true,
    };

    console.log("Guardar formulario:", formData);
    alert("Formulario guardado exitosamente");
  };

  const handlePreviewForm = () => {
    console.log("Vista previa del formulario:", {
      formName,
      formType,
      components,
    });
    alert("Abriendo vista previa del formulario");
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Constructor principal */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Construye tu formulario
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePreviewForm}>
                      👁️ Vista Previa
                    </Button>
                    <Button onClick={handleSaveForm}>💾 Guardar</Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Configuración del formulario */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-3">
                    Tipo de formulario - Presente a venta en ruta
                  </h3>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nombre del formulario"
                  />
                </div>

                {/* Instrucciones */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
                  <p className="text-gray-700 text-sm">
                    Selecciona un componente de la derecha y arrástralo al
                    formulario sin poder así. Haz clic sobre un componente en el
                    formulario para modificarlo.
                  </p>
                </div>

                {/* Preview del formulario */}
                <FormPreview
                  components={components}
                  onComponentEdit={handleComponentEdit}
                  onComponentDelete={handleComponentDelete}
                  onComponentMove={handleComponentMove}
                />

                {/* Botones de acción */}
                <div className="flex gap-4 mt-6 pt-6 border-t">
                  <Button variant="outline">Cancelar</Button>
                  <Button onClick={handleSaveForm}>Actualizar</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Paleta de componentes */}
          <div>
            <ComponentPalette onComponentAdd={handleComponentAdd} />
          </div>
        </div>

        {/* Modal de edición */}
        <ComponentEditor
          isOpen={showComponentEditor}
          onClose={() => {
            setShowComponentEditor(false);
            setEditingComponent(null);
          }}
          component={editingComponent}
          onSave={handleComponentSave}
        />
      </div>
    </Layout>
  );
}

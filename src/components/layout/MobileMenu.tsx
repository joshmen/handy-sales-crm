"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  Users,
  Package,
  ShoppingCart,
  MapPin,
  Calendar,
  FileText,
  Truck,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Clientes", href: "/clients", icon: Users },
  { title: "Productos", href: "/products", icon: Package },
  { title: "Pedidos", href: "/orders", icon: ShoppingCart },
  { title: "Rutas", href: "/routes", icon: MapPin },
  { title: "Visitas", href: "/visits", icon: Calendar },
  { title: "Entregas", href: "/deliveries", icon: Truck },
  { title: "Reportes", href: "/reports", icon: BarChart3 },
  { title: "Facturación", href: "/billing", icon: CreditCard },
  { title: "Configuración", href: "/settings", icon: Settings },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-xl md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl">Handy CRM</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">CM</span>
              </div>
              <div>
                <p className="font-medium">Carlos Mendoza</p>
                <p className="text-sm text-gray-500">Administrador</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2",
                      pathname === item.href
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        pathname === item.href
                          ? "text-blue-600"
                          : "text-gray-500"
                      )}
                    />
                    <span className="text-sm font-medium">{item.title}</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t">
            <button
              onClick={() => {
                console.log("Logout");
                onClose();
              }}
              className="flex items-center space-x-3 w-full rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;

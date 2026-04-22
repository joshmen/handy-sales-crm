import React from "react";
import { Spinner } from "./Spinner";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Wrapper legacy — delega al <Spinner /> homologado para consistencia visual.
 * Antes usaba un div con border-t que se ve\u00eda distinto al resto de la app.
 */
export const Loading: React.FC<LoadingProps> = ({ size = "md", className }) => {
  // El Spinner homologado usa xs/sm/md/lg; mapeamos las tallas del Loading legacy.
  const mapped = size === "sm" ? "sm" : size === "md" ? "md" : "lg";
  return <Spinner size={mapped} className={className} />;
};

export const LoadingPage: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-foreground/70">Cargando...</p>
      </div>
    </div>
  );
};

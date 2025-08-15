// Hook simplificado de toast que funciona sin dependencias externas
interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export const toast = (props: ToastProps) => {
  if (typeof window !== "undefined") {
    // Por ahora, usa console.log como fallback
    // En producción, esto debería mostrar una notificación real
    const style = props.variant === "destructive" ? "color: red;" : "color: green;"
    console.log(`%c[Toast] ${props.title}`, style, props.description || "")
  }
}

export const useToast = () => {
  return { toast }
}

export default { toast, useToast }

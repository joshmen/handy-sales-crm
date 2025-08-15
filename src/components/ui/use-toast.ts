// Hook básico de toast
export const useToast = () => {
  const toast = (props: {
    title?: string
    description?: string
    variant?: "default" | "destructive"
    duration?: number
  }) => {
    if (typeof window !== "undefined") {
      console.log("[Toast]", props.title, props.description)
    }
  }

  return { toast }
}

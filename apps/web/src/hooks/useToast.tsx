'use client';

import { toast as sonnerToast } from 'sonner';

// Tipos compatibles con la API anterior
interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type ToastReturn = {
  id: string | number;
  dismiss: () => void;
};

// Función principal: acepta objeto { title, description, variant }
function toast(props: ToastProps): ToastReturn {
  let id: string | number;

  if (props.variant === 'destructive') {
    id = sonnerToast.error(props.title || 'Error', {
      description: props.description,
    });
  } else {
    id = sonnerToast(props.title || '', {
      description: props.description,
    });
  }

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
  };
}

// Helpers compatibles con la API anterior
type HelperOpts = Partial<ToastProps>;

type ToastAPI = typeof toast & {
  success: (message: string, opts?: HelperOpts) => ToastReturn;
  error: (message: string, opts?: HelperOpts) => ToastReturn;
  info: (message: string, opts?: HelperOpts) => ToastReturn;
  warning: (message: string, opts?: HelperOpts) => ToastReturn;
};

const toastWithHelpers = Object.assign(toast, {
  success: (message: string, opts?: HelperOpts): ToastReturn => {
    const id = sonnerToast.success(opts?.title || 'Éxito', { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  error: (message: string, opts?: HelperOpts): ToastReturn => {
    const id = sonnerToast.error(opts?.title || 'Error', { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  info: (message: string, opts?: HelperOpts): ToastReturn => {
    const id = sonnerToast.info(opts?.title || 'Información', { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  warning: (message: string, opts?: HelperOpts): ToastReturn => {
    const id = sonnerToast.warning(opts?.title || 'Atención', { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
}) as ToastAPI;

// Hook compatible: devuelve { toast, dismiss }
function useToast() {
  return {
    toast: toastWithHelpers,
    dismiss: (id?: string | number) => {
      if (id) sonnerToast.dismiss(id);
      else sonnerToast.dismiss();
    },
    toasts: [] as never[],
  };
}

export { useToast, toastWithHelpers as toast };

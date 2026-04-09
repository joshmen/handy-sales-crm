'use client';

import { toast as sonnerToast } from 'sonner';
import { getMessages } from '@/i18n/messages';

// Read current locale from localStorage (same source as CompanyContext)
function getLocaleMessages() {
  try {
    const settings = JSON.parse(localStorage.getItem('company_settings') || '{}');
    return getMessages(settings.language || 'es');
  } catch {
    return getMessages('es');
  }
}

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
  const m = getLocaleMessages();

  if (props.variant === 'destructive') {
    id = sonnerToast.error(props.title || m.common.error, {
      description: props.description,
    });
  } else {
    id = sonnerToast.success(props.title || m.common.success, {
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
    const m = getLocaleMessages();
    const id = sonnerToast.success(opts?.title || m.common.success, { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  error: (message: string, opts?: HelperOpts): ToastReturn => {
    const m = getLocaleMessages();
    const id = sonnerToast.error(opts?.title || m.common.error, { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  info: (message: string, opts?: HelperOpts): ToastReturn => {
    const m = getLocaleMessages();
    const id = sonnerToast.info(opts?.title || m.common.info, { description: message });
    return { id, dismiss: () => sonnerToast.dismiss(id) };
  },
  warning: (message: string, opts?: HelperOpts): ToastReturn => {
    const m = getLocaleMessages();
    const id = sonnerToast.warning(opts?.title || m.common.warning, { description: message });
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

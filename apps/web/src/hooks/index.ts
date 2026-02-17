// Core API hooks
export * from './useApi';
export * from './useApiQuery';
export * from './useApiMutation';

// Entity-specific hooks
export * from './useClients';
export * from './useProducts';
export * from './useUsers';
export * from './useDashboard';

// Form and validation hooks
export * from './useForm';

// Permission management
export * from './usePermissions';

// UI utilities
export * from './useToast';
export * from './useUtils';

// Re-export commonly used hooks
export { useApi } from './useApi';
export { useApiQuery } from './useApiQuery';
export { useApiMutation } from './useApiMutation';
export { useZodForm, useFormHandler, formSchemas } from './useForm';
export { usePermissions } from './usePermissions';
export { useToast } from './useToast';
export {
  useDebounce,
  useLocalStorage,
  usePagination,
  useClickOutside,
  useKeyPress,
  useWindowSize,
  useAsync,
  useToggle,
  usePrevious,
  useInterval,
  useIsOnline,
} from './useUtils';

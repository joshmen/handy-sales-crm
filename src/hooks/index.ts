// Export all custom hooks
export * from './useApi';
export * from './useForm';
export * from './usePermissions';
export * from './useToast';
export * from './useUtils';

// Re-export specific hooks for easier imports
export { useClients, useProducts, useDashboard } from './useApi';
export { useZodForm, useFormHandler, formSchemas } from './useForm';
export { usePermissions, useConditionalRender, withPermission } from './usePermissions';
export { useToast, toast } from './useToast';  // Explicitly export toast
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

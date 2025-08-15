// Export all custom hooks
export * from './useApi';
export * from './useForm';
export * from './usePermissions';
export * from './useToast';
export * from './useUtils';

// Re-export specific hooks for easier imports
export { useAuth, useClients, useProducts, useDashboard } from './useApi';
export { useZodForm, useFormHandler, formSchemas } from './useForm';
export { usePermissions, useConditionalRender, withPermission } from './usePermissions';
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

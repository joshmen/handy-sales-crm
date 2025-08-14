// Export all stores
export * from './useAppStore'
export * from './useUIStore'
export * from './useRouteStore'

// You can also create a combined store hook if needed
import { useAppStore } from './useAppStore'
import { useUIStore } from './useUIStore'
import { useRouteStore } from './useRouteStore'

export const useStores = () => ({
  app: useAppStore(),
  ui: useUIStore(),
  route: useRouteStore(),
})

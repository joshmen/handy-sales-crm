// Export all API services
export * from './auth'
export * from './clients'
export * from './dashboard'
export * from './products'

// Re-export services for easier imports
export { authService } from './auth'
export { clientService } from './clients'
export { dashboardService } from './dashboard'
export { productService } from './products'

// Central services object
export const services = {
  auth: authService,
  clients: clientService,
  dashboard: dashboardService,
  products: productService,
} as const

export default services

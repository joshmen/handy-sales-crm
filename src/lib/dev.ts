// Development utilities and helpers

// API Mock Mode - useful for development without backend
export const DEV_CONFIG = {
  MOCK_API: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_MOCK_API === 'true',
  API_DELAY: 1000, // Simulate network delay
  ENABLE_LOGS: process.env.NODE_ENV === 'development',
  SHOW_DEV_TOOLS: process.env.NODE_ENV === 'development'
}

// Development logger
export const devLog = {
  info: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.log(`🔷 [Handy CRM] ${message}`, ...args)
    }
  },
  error: (message: string, error?: any) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.error(`🔴 [Handy CRM] ${message}`, error)
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.warn(`🟡 [Handy CRM] ${message}`, ...args)
    }
  },
  success: (message: string, ...args: any[]) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.log(`🟢 [Handy CRM] ${message}`, ...args)
    }
  }
}

// Mock API delay for development
export const mockDelay = (ms: number = DEV_CONFIG.API_DELAY) => {
  if (DEV_CONFIG.MOCK_API) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  return Promise.resolve()
}

// Development data generators
export const generateMockId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const generateMockDate = (daysOffset: number = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date
}

export const generateMockClient = (overrides: any = {}) => {
  const names = ['Abarrotes El Sol', 'Supermercado Central', 'Tienda La Esquina', 'Distribuidora Norte']
  const cities = ['Hermosillo', 'Tijuana', 'Mexicali', 'Ensenada']
  const types = ['MINORISTA', 'MAYORISTA', 'DISTRIBUIDOR']
  
  return {
    id: generateMockId(),
    code: `CLI-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
    name: names[Math.floor(Math.random() * names.length)],
    email: `cliente${Math.floor(Math.random() * 999)}@email.com`,
    phone: `+52 644 ${Math.floor(Math.random() * 999).toString().padStart(3, '0')} ${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
    address: `Calle ${Math.floor(Math.random() * 999)} #${Math.floor(Math.random() * 999)}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    state: 'Sonora',
    zipCode: `83${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
    type: types[Math.floor(Math.random() * types.length)],
    isActive: Math.random() > 0.2,
    creditLimit: Math.floor(Math.random() * 100000),
    paymentTerms: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
    createdAt: generateMockDate(-Math.floor(Math.random() * 365)),
    updatedAt: generateMockDate(-Math.floor(Math.random() * 30)),
    ...overrides
  }
}

export const generateMockProduct = (overrides: any = {}) => {
  const names = ['Refresco Cola', 'Agua Natural', 'Pan Integral', 'Leche Entera', 'Arroz Blanco']
  const categories = ['Bebidas', 'Panadería', 'Lácteos', 'Abarrotes']
  const brands = ['Coca Cola', 'Bonafont', 'Bimbo', 'Lala', 'Verde Valle']
  
  return {
    id: generateMockId(),
    code: `PROD-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
    name: names[Math.floor(Math.random() * names.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    brand: brands[Math.floor(Math.random() * brands.length)],
    unit: 'pz',
    price: Math.floor(Math.random() * 100) + 10,
    cost: Math.floor(Math.random() * 50) + 5,
    stock: Math.floor(Math.random() * 500),
    minStock: Math.floor(Math.random() * 50),
    isActive: Math.random() > 0.1,
    images: [],
    createdAt: generateMockDate(-Math.floor(Math.random() * 365)),
    updatedAt: generateMockDate(-Math.floor(Math.random() * 30)),
    ...overrides
  }
}

// Performance monitoring for development
export const performanceMonitor = {
  start: (label: string) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.time(`⏱️ [${label}]`)
    }
  },
  end: (label: string) => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      console.timeEnd(`⏱️ [${label}]`)
    }
  },
  mark: (label: string) => {
    if (DEV_CONFIG.ENABLE_LOGS && typeof window !== 'undefined' && window.performance) {
      window.performance.mark(label)
    }
  }
}

// Development shortcuts (only available in development)
export const devShortcuts = {
  clearStorage: () => {
    if (typeof window !== 'undefined' && DEV_CONFIG.ENABLE_LOGS) {
      localStorage.clear()
      sessionStorage.clear()
      devLog.success('Storage cleared')
    }
  },
  dumpStore: (storeName?: string) => {
    if (typeof window !== 'undefined' && DEV_CONFIG.ENABLE_LOGS) {
      if (storeName) {
        const storeData = localStorage.getItem(storeName)
        console.log(`📦 Store [${storeName}]:`, JSON.parse(storeData || '{}'))
      } else {
        console.log('📦 All localStorage:', { ...localStorage })
      }
    }
  },
  simulateError: (message: string = 'Simulated development error') => {
    if (DEV_CONFIG.ENABLE_LOGS) {
      throw new Error(message)
    }
  }
}

// Make dev tools available globally in development
if (typeof window !== 'undefined' && DEV_CONFIG.SHOW_DEV_TOOLS) {
  ;(window as any).handyDev = {
    ...devShortcuts,
    log: devLog,
    config: DEV_CONFIG,
    generateMockClient,
    generateMockProduct,
    performance: performanceMonitor
  }
  
  devLog.info('🛠️ Dev tools available at window.handyDev')
}

// Export environment helpers
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'

// Feature flags for development
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  ENABLE_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
  ENABLE_CLOUDINARY: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  ENABLE_NEXTAUTH: !!process.env.NEXTAUTH_SECRET
}

// Development component for debugging
export const DevInfo: React.FC = () => {
  if (!isDevelopment) return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded opacity-50 pointer-events-none z-50">
      <div>ENV: {process.env.NODE_ENV}</div>
      <div>API: {process.env.NEXT_PUBLIC_API_URL}</div>
    </div>
  )
}

export default {
  DEV_CONFIG,
  devLog,
  mockDelay,
  generateMockId,
  generateMockDate,
  generateMockClient,
  generateMockProduct,
  performanceMonitor,
  devShortcuts,
  isDevelopment,
  isProduction,
  isTest,
  FEATURE_FLAGS,
  DevInfo
}

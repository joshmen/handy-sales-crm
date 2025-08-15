import { useState, useEffect, useCallback } from 'react'
import { authService, clientService, productService, dashboardService } from '@/services/api'
import { useAppStore } from '@/stores/useAppStore'
import { ApiError } from '@/lib/api'

export function useAuth() {
  const { user, isAuthenticated, setUser, login, logout } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      login(response.user)
      return response
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [login])

  const handleLogout = useCallback(async () => {
    setLoading(true)
    try {
      await authService.logout()
      logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }, [logout])

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return
    
    setLoading(true)
    try {
      const user = await authService.getCurrentUser()
      setUser(user)
    } catch (err) {
      console.error('Failed to refresh user:', err)
      logout()
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setUser, logout])

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshUser,
    clearError: () => setError(null)
  }
}

export function useClients() {
  const { clients, setClients, addClient, updateClient, deleteClient } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await clientService.getClients(params)
      setClients(response.clients)
      return response
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setClients])

  const createClient = useCallback(async (clientData: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const client = await clientService.createClient(clientData)
      addClient(client)
      return client
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [addClient])

  const editClient = useCallback(async (clientData: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const client = await clientService.updateClient(clientData)
      updateClient(client)
      return client
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [updateClient])

  const removeClient = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await clientService.deleteClient(id)
      deleteClient(id)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [deleteClient])

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient: editClient,
    deleteClient: removeClient,
    clearError: () => setError(null)
  }
}

export function useProducts() {
  const { products, setProducts, addProduct, updateProduct, deleteProduct } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await productService.getProducts(params)
      setProducts(response.products)
      return response
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setProducts])

  const createProduct = useCallback(async (productData: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const product = await productService.createProduct(productData)
      addProduct(product)
      return product
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [addProduct])

  const editProduct = useCallback(async (productData: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const product = await productService.updateProduct(productData)
      updateProduct(product)
      return product
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [updateProduct])

  const removeProduct = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await productService.deleteProduct(id)
      deleteProduct(id)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [deleteProduct])

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct: editProduct,
    deleteProduct: removeProduct,
    clearError: () => setError(null)
  }
}

export function useDashboard() {
  const { metrics, setMetrics } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async (dateRange?: { start?: Date; end?: Date }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getMetrics(dateRange)
      setMetrics(data)
      return data
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setMetrics])

  const fetchChartsData = useCallback(async (dateRange?: { start?: Date; end?: Date }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getChartsData(dateRange)
      return data
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    fetchChartsData,
    clearError: () => setError(null)
  }
}

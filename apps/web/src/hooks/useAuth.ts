/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { useAppContext } from '@/context/AppContext';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simular usuario por defecto para desarrollo
    const mockUser: User = {
      id: '1',
      name: 'Josué Mendoza',
      email: 'josue@handycrm.com',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'SET_USER', payload: mockUser });
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Aquí irá la llamada real a tu API
      const mockUser: User = {
        id: '1',
        name: 'Josué Mendoza',
        email: email,
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dispatch({ type: 'SET_USER', payload: mockUser });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    dispatch({ type: 'SET_USER', payload: null });
  };

  return {
    user: state.user,
    loading,
    error,
    login,
    logout,
  };
};

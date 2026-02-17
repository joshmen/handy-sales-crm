import { useState, useEffect } from 'react';
import { companyService, CompanySettings } from '@/services/api/companyService';

export const useCompany = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanySettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await companyService.getCompanySettings();
      if (response.success && response.data) {
        setCompanySettings(response.data);
      } else {
        setError(response.error || 'Error al cargar configuración de la empresa');
      }
    } catch (err) {
      setError('Error al cargar configuración de la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  return {
    companySettings,
    isLoading,
    error,
    refetch: fetchCompanySettings
  };
};
import { useEffect, useState, useCallback } from 'react';
import { api, type Empresa } from '@/lib/api';

const STORAGE_KEY = 'nubefact_empresa_id';

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPrimeraEmpresa = useCallback(async () => {
    const res = await api.empresas.listar({ activo: true, per_page: 1 });
    const lista = (res.data as unknown as { data?: Empresa[] }).data ?? [];
    if (lista.length > 0) {
      const primera = lista[0];
      setEmpresaId(primera.id);
      setEmpresa(primera);
      localStorage.setItem(STORAGE_KEY, String(primera.id));
    }
  }, []);

  const cargarEmpresa = useCallback(async () => {
    try {
      setLoading(true);
      if (empresaId) {
        try {
          const res = await api.empresas.obtener(empresaId);
          const data = (res.data as unknown as { data?: Empresa }).data ?? res.data as unknown as Empresa;
          setEmpresa(data);
        } catch {
          // Empresa guardada ya no existe, limpiar y cargar la primera disponible
          localStorage.removeItem(STORAGE_KEY);
          setEmpresaId(null);
          await cargarPrimeraEmpresa();
        }
      } else {
        await cargarPrimeraEmpresa();
      }
    } catch (error) {
      console.error('Error al cargar empresa:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, cargarPrimeraEmpresa]);

  useEffect(() => {
    void cargarEmpresa();
  }, [cargarEmpresa]);

  const selectEmpresa = useCallback((id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setEmpresaId(id);
  }, []);

  const recargar = useCallback(() => {
    void cargarEmpresa();
  }, [cargarEmpresa]);

  return { empresaId, empresa, loading, selectEmpresa, recargar };
}

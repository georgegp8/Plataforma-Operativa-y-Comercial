import axios from 'axios';
import type { 
  DashboardFiltros, 
  DashboardStats, 
  CPERankingItem,
  ProductoTopItem,
  ClienteTopItem,
  StockMinimoResponse
} from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Utilidad para obtener la URL base
export const apiBaseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '');

// Interceptor para agregar token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardApi = {
  getStats: async (filtros: DashboardFiltros): Promise<DashboardStats> => {
    const params = new URLSearchParams({
      establecimiento: filtros.establecimiento,
      periodo: filtros.periodo,
      fecha_del: filtros.fechaDel,
    });
    if (filtros.fechaHasta) {
      params.append('fecha_hasta', filtros.fechaHasta);
    }
    const response = await api.get(`/v1/dashboard/stats?${params}`);
    return response.data;
  },

  getCPERanking: async (filtros: DashboardFiltros): Promise<CPERankingItem[]> => {
    const params = new URLSearchParams({
      establecimiento: filtros.establecimiento,
      periodo: filtros.periodo,
      fecha_del: filtros.fechaDel,
    });
    if (filtros.fechaHasta) {
      params.append('fecha_hasta', filtros.fechaHasta);
    }
    const response = await api.get(`/v1/dashboard/cpe-ranking?${params}`);
    return response.data;
  },

  getProductosTop: async (filtros: DashboardFiltros, limit = 5): Promise<ProductoTopItem[]> => {
    const params = new URLSearchParams({
      establecimiento: filtros.establecimiento,
      periodo: filtros.periodo,
      fecha_del: filtros.fechaDel,
      limit: limit.toString(),
    });
    if (filtros.fechaHasta) {
      params.append('fecha_hasta', filtros.fechaHasta);
    }
    const response = await api.get(`/v1/dashboard/productos-top?${params}`);
    return response.data;
  },

  getClientesTop: async (filtros: DashboardFiltros, limit = 10): Promise<ClienteTopItem[]> => {
    const params = new URLSearchParams({
      establecimiento: filtros.establecimiento,
      periodo: filtros.periodo,
      fecha_del: filtros.fechaDel,
      limit: limit.toString(),
    });
    if (filtros.fechaHasta) {
      params.append('fecha_hasta', filtros.fechaHasta);
    }
    const response = await api.get(`/v1/dashboard/clientes-top?${params}`);
    return response.data;
  },

  getStockMinimo: async (page = 1, perPage = 5): Promise<StockMinimoResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    const response = await api.get(`/v1/dashboard/stock-minimo?${params}`);
    return response.data;
  },

  getMonthlyComparison: async (filtros: DashboardFiltros, incluirAnuladas = false) => {
    const params = new URLSearchParams({
      establecimiento: filtros.establecimiento,
      periodo: filtros.periodo,
      fecha_del: filtros.fechaDel,
      incluir_anuladas: String(incluirAnuladas),
    });
    if (filtros.fechaHasta) {
      params.append('fecha_hasta', filtros.fechaHasta);
    }
    const response = await api.get(`/v1/dashboard/monthly-comparison?${params}`);
    return response.data;
  },
};

export default api;

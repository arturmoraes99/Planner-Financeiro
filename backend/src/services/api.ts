import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Criação da instância do Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Recupera o token do localStorage
    const token = localStorage.getItem('token');

    // Se existir token, adiciona ao header Authorization
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log de desenvolvimento (remover em produção)
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log de desenvolvimento (remover em produção)
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.status}`, response.data);
    }
    return response;
  },
  (error: AxiosError): Promise<AxiosError> => {
    // Tratamento específico para erro 401 (Unauthorized)
    if (error.response?.status === 401) {
      console.warn('[API] Token expirado ou inválido. Realizando logout...');
      
      // Remove dados de autenticação do localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      
      // Redireciona para a página de login
      // Usando window.location para garantir limpeza completa do estado
      window.location.href = '/login';
    }

    // Tratamento para erro 403 (Forbidden)
    if (error.response?.status === 403) {
      console.error('[API] Acesso negado. Permissões insuficientes.');
    }

    // Tratamento para erro 404 (Not Found)
    if (error.response?.status === 404) {
      console.error('[API] Recurso não encontrado:', error.config?.url);
    }

    // Tratamento para erro 500 (Internal Server Error)
    if (error.response?.status === 500) {
      console.error('[API] Erro interno do servidor:', error.response.data);
    }

    // Tratamento para erro de rede/timeout
    if (error.code === 'ECONNABORTED') {
      console.error('[API] Timeout: A requisição demorou demais.');
    }

    if (!error.response) {
      console.error('[API] Erro de rede: Servidor indisponível.');
    }

    // Log detalhado do erro
    console.error('[API Error]', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
};

export const getStoredUser = <T = unknown>(): T | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as T;
  } catch {
    return null;
  }
};

export const setAuthData = (token: string, user: unknown, refreshToken?: string): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export default api;

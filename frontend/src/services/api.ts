import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token
api.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const token = state.token;
    
    console.log('📤 Enviando petición a:', config.url);
    console.log('📤 Token encontrado:', token ? 'SÍ ✅' : 'NO ❌');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 Header Authorization agregado:', config.headers.Authorization);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en interceptor request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta exitosa:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ Error en respuesta:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    if (error.response?.status === 401) {
      console.log('🚨 Token inválido - Cerrando sesión');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
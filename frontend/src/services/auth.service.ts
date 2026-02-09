import api from './api';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    uuid_usuario: string;
    nombre: string;
    apellido: string;
    username: string;
    email: string;
    is_active: boolean;
    last_login: string | null;
    created_on: string;
  };
}

interface UserResponse {
  uuid_usuario: string;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
  created_on: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
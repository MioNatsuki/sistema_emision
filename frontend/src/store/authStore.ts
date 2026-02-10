import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  uuid_usuario: string;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
  created_on: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (token: string, user: User) => {
        console.log('🔐 Guardando token en store:', token.substring(0, 20) + '...');
        set({ token, user, isAuthenticated: true });
      },
      
      logout: () => {
        console.log('🚪 Limpiando sesión');
        set({ token: null, user: null, isAuthenticated: false });
      },
      
      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
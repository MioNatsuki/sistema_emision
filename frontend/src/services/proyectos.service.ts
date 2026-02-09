import api from './api';
import { Proyecto, ProyectoCreate, ProyectoUpdate, Padron } from '@/types/proyecto.types';

export const proyectosService = {
  getAll: async (): Promise<Proyecto[]> => {
    const response = await api.get<Proyecto[]>('/proyectos');
    return response.data;
  },

  getById: async (uuid: string): Promise<Proyecto> => {
    const response = await api.get<Proyecto>(`/proyectos/${uuid}`);
    return response.data;
  },

  create: async (data: ProyectoCreate): Promise<Proyecto> => {
    const response = await api.post<Proyecto>('/proyectos', data);
    return response.data;
  },

  update: async (uuid: string, data: ProyectoUpdate): Promise<Proyecto> => {
    const response = await api.put<Proyecto>(`/proyectos/${uuid}`, data);
    return response.data;
  },

  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/proyectos/${uuid}`);
  },

  uploadLogo: async (uuid: string, file: File): Promise<Proyecto> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Proyecto>(`/proyectos/${uuid}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPadrones: async (): Promise<Padron[]> => {
    const response = await api.get<Padron[]>('/proyectos/padrones');
    return response.data;
  },
};
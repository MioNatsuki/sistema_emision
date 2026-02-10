import api from './api';
import { Plantilla, PlantillaCreate, PlantillaUpdate, CampoPadron } from '@/types/plantilla.types';

export const plantillasService = {
  getByProyecto: async (proyectoUuid: string): Promise<Plantilla[]> => {
    const response = await api.get<Plantilla[]>(`/plantillas/proyecto/${proyectoUuid}`);
    return response.data;
  },

  getById: async (uuid: string): Promise<Plantilla> => {
    const response = await api.get<Plantilla>(`/plantillas/${uuid}`);
    return response.data;
  },

  create: async (data: PlantillaCreate): Promise<Plantilla> => {
    const response = await api.post<Plantilla>('/plantillas', data);
    return response.data;
  },

  update: async (uuid: string, data: PlantillaUpdate): Promise<Plantilla> => {
    const response = await api.put<Plantilla>(`/plantillas/${uuid}`, data);
    return response.data;
  },

  delete: async (uuid: string): Promise<void> => {
    await api.delete(`/plantillas/${uuid}`);
  },

  getCamposPadron: async (nombrePadron: string): Promise<CampoPadron[]> => {
    const response = await api.get<CampoPadron[]>(`/plantillas/padron/${nombrePadron}/columnas`);
    return response.data;
  },

  getPreviewData: async (plantillaUuid: string): Promise<any> => {
    const response = await api.get(`/plantillas/${plantillaUuid}/preview`);
    return response.data;
  },
};
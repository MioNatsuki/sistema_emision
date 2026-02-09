export interface Proyecto {
  id_proyecto: number;
  uuid_proyecto: string;
  nombre_proyecto: string;
  descripcion: string | null;
  logo_proyecto: string | null;
  uuid_padron: string;
  usuario_creador: string;
  en_emision: boolean;
  created_on: string;
  updated_on: string;
  is_deleted: boolean;
  nombre_padron: string | null;
}

export interface ProyectoCreate {
  nombre_proyecto: string;
  descripcion?: string;
  uuid_padron: string;
}

export interface ProyectoUpdate {
  nombre_proyecto?: string;
  descripcion?: string;
  uuid_padron?: string;
  logo_proyecto?: string;
}

export interface Padron {
  uuid_padron: string;
  nombre_padron: string;
  descripcion: string | null;
}
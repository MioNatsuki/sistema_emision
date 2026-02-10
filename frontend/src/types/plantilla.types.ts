export interface ElementoEstilo {
  fuente?: string;
  tamano?: number;
  negrita?: boolean;
  italica?: boolean;
  color?: string;
  alineacion?: string;
}

export interface ElementoBase {
  id: string;
  tipo: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface ElementoTextoPlano extends ElementoBase {
  tipo: 'texto_plano';
  contenido: string;
  estilo: ElementoEstilo;
}

export interface ElementoCampoBD extends ElementoBase {
  tipo: 'campo_bd';
  campo_nombre: string;
  etiqueta?: string;
  estilo: ElementoEstilo;
}

export interface ElementoImagen extends ElementoBase {
  tipo: 'imagen';
  ruta_imagen: string;
  mantener_aspecto?: boolean;
}

export interface ElementoCodigoBarras extends ElementoBase {
  tipo: 'codigo_barras';
  campo_nombre: string;
  estilo?: any;
}

export type ElementoCanvas = ElementoTextoPlano | ElementoCampoBD | ElementoImagen | ElementoCodigoBarras;

export interface ConfiguracionGlobal {
  margen_superior?: number;
  margen_inferior?: number;
  margen_izquierdo?: number;
  margen_derecho?: number;
  color_fondo?: string;
}

export interface CanvasConfig {
  elementos: ElementoCanvas[];
  configuracion_global?: ConfiguracionGlobal;
}

export interface Plantilla {
  id_plantilla: number;
  uuid_plantilla: string;
  nombre_plantilla: string;
  descripcion: string | null;
  uuid_proyecto: string;
  uuid_padron: string;
  canvas_config: CanvasConfig;
  ancho_canvas: number;
  alto_canvas: number;
  thumbnail_path: string | null;
  version: number;
  is_deleted: boolean;
  created_on: string;
  updated_on: string;
  nombre_proyecto?: string;
  nombre_padron?: string;
}

export interface PlantillaCreate {
  nombre_plantilla: string;
  descripcion?: string;
  uuid_proyecto: string;
  uuid_padron: string;
  canvas_config: CanvasConfig;
  ancho_canvas?: number;
  alto_canvas?: number;
}

export interface PlantillaUpdate {
  nombre_plantilla?: string;
  descripcion?: string;
  canvas_config?: CanvasConfig;
  ancho_canvas?: number;
  alto_canvas?: number;
}

export interface CampoPadron {
  nombre_columna: string;
  tipo_dato: string;
}
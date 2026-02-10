from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Schemas para elementos del canvas
class ElementoEstilo(BaseModel):
    fuente: Optional[str] = "Calibri"
    tamano: Optional[int] = 11
    negrita: Optional[bool] = False
    italica: Optional[bool] = False
    color: Optional[str] = "#000000"
    alineacion: Optional[str] = "left"

class ElementoBase(BaseModel):
    id: str
    tipo: str  # texto_plano, campo_bd, imagen, codigo_barras
    x: float
    y: float
    ancho: float
    alto: float

class ElementoTextoPlano(ElementoBase):
    tipo: str = "texto_plano"
    contenido: str
    estilo: ElementoEstilo

class ElementoCampoBD(ElementoBase):
    tipo: str = "campo_bd"
    campo_nombre: str
    etiqueta: Optional[str] = None
    estilo: ElementoEstilo

class ElementoImagen(ElementoBase):
    tipo: str = "imagen"
    ruta_imagen: str
    mantener_aspecto: Optional[bool] = True

class ElementoCodigoBarras(ElementoBase):
    tipo: str = "codigo_barras"
    campo_nombre: str
    estilo: Optional[Dict[str, Any]] = None

class ConfiguracionGlobal(BaseModel):
    margen_superior: Optional[float] = 1.0
    margen_inferior: Optional[float] = 1.0
    margen_izquierdo: Optional[float] = 1.0
    margen_derecho: Optional[float] = 1.0
    color_fondo: Optional[str] = "#FFFFFF"

class CanvasConfig(BaseModel):
    elementos: List[Dict[str, Any]]
    configuracion_global: Optional[ConfiguracionGlobal] = None

# Schemas principales
class PlantillaBase(BaseModel):
    nombre_plantilla: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = None
    uuid_proyecto: uuid.UUID
    uuid_padron: uuid.UUID

class PlantillaCreate(PlantillaBase):
    canvas_config: CanvasConfig
    ancho_canvas: Optional[float] = 21.59
    alto_canvas: Optional[float] = 34.01

class PlantillaUpdate(BaseModel):
    nombre_plantilla: Optional[str] = Field(None, min_length=3, max_length=200)
    descripcion: Optional[str] = None
    canvas_config: Optional[CanvasConfig] = None
    ancho_canvas: Optional[float] = None
    alto_canvas: Optional[float] = None

class PlantillaResponse(PlantillaBase):
    id_plantilla: int
    uuid_plantilla: uuid.UUID
    canvas_config: Dict[str, Any]
    ancho_canvas: float
    alto_canvas: float
    thumbnail_path: Optional[str] = None
    version: int
    is_deleted: bool
    created_on: datetime
    updated_on: datetime
    
    # Info adicional
    nombre_proyecto: Optional[str] = None
    nombre_padron: Optional[str] = None
    
    class Config:
        from_attributes = True

class CamposPadronResponse(BaseModel):
    nombre_columna: str
    tipo_dato: str

class PreviewDataResponse(BaseModel):
    datos: Dict[str, Any]
    mensaje: Optional[str] = None
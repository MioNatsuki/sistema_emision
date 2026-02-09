from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class ProyectoBase(BaseModel):
    nombre_proyecto: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = None
    uuid_padron: uuid.UUID

class ProyectoCreate(ProyectoBase):
    pass

class ProyectoUpdate(BaseModel):
    nombre_proyecto: Optional[str] = Field(None, min_length=3, max_length=200)
    descripcion: Optional[str] = None
    uuid_padron: Optional[uuid.UUID] = None
    logo_proyecto: Optional[str] = None

class ProyectoResponse(ProyectoBase):
    id_proyecto: int
    uuid_proyecto: uuid.UUID
    logo_proyecto: Optional[str] = None
    usuario_creador: uuid.UUID
    en_emision: bool
    created_on: datetime
    updated_on: datetime
    is_deleted: bool
    
    # Info adicional del padrón
    nombre_padron: Optional[str] = None
    
    class Config:
        from_attributes = True

class PadronResponse(BaseModel):
    uuid_padron: uuid.UUID
    nombre_padron: str
    descripcion: Optional[str] = None
    
    class Config:
        from_attributes = True
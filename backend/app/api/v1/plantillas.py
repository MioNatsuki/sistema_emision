from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_db, get_current_active_user
from app.schemas.plantilla import (
    PlantillaCreate, PlantillaUpdate, PlantillaResponse,
    CamposPadronResponse, PreviewDataResponse
)
from app.services.plantilla_service import PlantillaService
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/proyecto/{proyecto_uuid}", response_model=List[PlantillaResponse])
async def get_plantillas_by_proyecto(
    proyecto_uuid: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener todas las plantillas de un proyecto
    """
    return PlantillaService.get_all_by_proyecto(db, proyecto_uuid)

@router.get("/{plantilla_uuid}", response_model=PlantillaResponse)
async def get_plantilla(
    plantilla_uuid: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener una plantilla por UUID
    """
    return PlantillaService.get_by_uuid(db, plantilla_uuid)

@router.post("/", response_model=PlantillaResponse, status_code=status.HTTP_201_CREATED)
async def create_plantilla(
    plantilla_data: PlantillaCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Crear nueva plantilla
    """
    return PlantillaService.create(
        db=db,
        plantilla_data=plantilla_data,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.put("/{plantilla_uuid}", response_model=PlantillaResponse)
async def update_plantilla(
    plantilla_uuid: uuid.UUID,
    plantilla_data: PlantillaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Actualizar plantilla
    """
    return PlantillaService.update(
        db=db,
        plantilla_uuid=plantilla_uuid,
        plantilla_data=plantilla_data,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.delete("/{plantilla_uuid}")
async def delete_plantilla(
    plantilla_uuid: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Eliminar plantilla (soft delete)
    """
    return PlantillaService.delete(
        db=db,
        plantilla_uuid=plantilla_uuid,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.get("/padron/{nombre_padron}/columnas", response_model=List[CamposPadronResponse])
async def get_campos_padron(
    nombre_padron: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener columnas disponibles de un padrón
    
    Nombres válidos:
    - TLAJOMULCO_APA
    - TLAJOMULCO_PREDIAL
    - GUADALAJARA_PREDIAL
    - GUADALAJARA_LICENCIAS
    - PENSIONES
    """
    return PlantillaService.get_campos_padron(db, nombre_padron)

@router.get("/{plantilla_uuid}/preview", response_model=PreviewDataResponse)
async def get_preview_data(
    plantilla_uuid: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener datos aleatorios del padrón para preview
    """
    return PlantillaService.get_preview_data(db, plantilla_uuid)
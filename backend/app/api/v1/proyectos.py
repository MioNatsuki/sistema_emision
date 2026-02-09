from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_db, get_current_active_user
from app.schemas.proyecto import ProyectoCreate, ProyectoUpdate, ProyectoResponse, PadronResponse
from app.services.proyecto_service import ProyectoService
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/padrones", response_model=List[PadronResponse])
async def get_padrones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener todos los padrones disponibles
    """
    return ProyectoService.get_all_padrones(db)

@router.get("/", response_model=List[ProyectoResponse])
async def get_proyectos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener todos los proyectos
    """
    return ProyectoService.get_all_proyectos(db, current_user.uuid_usuario)

@router.get("/{proyecto_uuid}", response_model=ProyectoResponse)
async def get_proyecto(
    proyecto_uuid: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener un proyecto por UUID
    """
    return ProyectoService.get_proyecto_by_uuid(db, proyecto_uuid)

@router.post("/", response_model=ProyectoResponse, status_code=status.HTTP_201_CREATED)
async def create_proyecto(
    proyecto_data: ProyectoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Crear nuevo proyecto
    """
    return ProyectoService.create_proyecto(
        db=db,
        proyecto_data=proyecto_data,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.put("/{proyecto_uuid}", response_model=ProyectoResponse)
async def update_proyecto(
    proyecto_uuid: uuid.UUID,
    proyecto_data: ProyectoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Actualizar proyecto
    """
    return ProyectoService.update_proyecto(
        db=db,
        proyecto_uuid=proyecto_uuid,
        proyecto_data=proyecto_data,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.delete("/{proyecto_uuid}")
async def delete_proyecto(
    proyecto_uuid: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Eliminar proyecto (soft delete)
    """
    return ProyectoService.delete_proyecto(
        db=db,
        proyecto_uuid=proyecto_uuid,
        usuario=current_user,
        ip_address=request.client.host
    )

@router.post("/{proyecto_uuid}/logo", response_model=ProyectoResponse)
async def upload_logo(
    proyecto_uuid: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Subir logo del proyecto
    
    - Formatos permitidos: JPG, PNG
    - Tamaño máximo: 2MB
    """
    return await ProyectoService.upload_logo(
        db=db,
        proyecto_uuid=proyecto_uuid,
        file=file,
        usuario=current_user
    )
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime

from app.models.proyecto import Proyecto
from app.models.padron import IdentificadorPadron
from app.models.usuario import Usuario
from app.schemas.proyecto import ProyectoCreate, ProyectoUpdate, ProyectoResponse, PadronResponse
from app.services.bitacora_service import BitacoraService
from app.core.config import settings

class ProyectoService:
    
    @staticmethod
    def get_all_proyectos(db: Session, usuario_uuid: uuid.UUID, include_deleted: bool = False) -> List[ProyectoResponse]:
        """Obtener todos los proyectos"""
        
        query = db.query(Proyecto).join(IdentificadorPadron)
        
        if not include_deleted:
            query = query.filter(Proyecto.is_deleted == False)
        
        proyectos = query.all()
        
        # Mapear con nombre de padrón
        result = []
        for proyecto in proyectos:
            padron = db.query(IdentificadorPadron).filter(
                IdentificadorPadron.uuid_padron == proyecto.uuid_padron
            ).first()
            
            proyecto_dict = ProyectoResponse.model_validate(proyecto).__dict__
            proyecto_dict['nombre_padron'] = padron.nombre_padron if padron else None
            result.append(ProyectoResponse(**proyecto_dict))
        
        return result
    
    @staticmethod
    def get_proyecto_by_uuid(db: Session, proyecto_uuid: uuid.UUID) -> ProyectoResponse:
        """Obtener proyecto por UUID"""
        
        proyecto = db.query(Proyecto).filter(
            and_(
                Proyecto.uuid_proyecto == proyecto_uuid,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if not proyecto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        # Obtener nombre del padrón
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == proyecto.uuid_padron
        ).first()
        
        proyecto_dict = ProyectoResponse.model_validate(proyecto).__dict__
        proyecto_dict['nombre_padron'] = padron.nombre_padron if padron else None
        
        return ProyectoResponse(**proyecto_dict)
    
    @staticmethod
    def create_proyecto(
        db: Session,
        proyecto_data: ProyectoCreate,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> ProyectoResponse:
        """Crear nuevo proyecto"""
        
        # Verificar que el padrón existe
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == proyecto_data.uuid_padron
        ).first()
        
        if not padron:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Padrón no encontrado"
            )
        
        # Verificar que no exista un proyecto con el mismo nombre
        existing = db.query(Proyecto).filter(
            and_(
                Proyecto.nombre_proyecto == proyecto_data.nombre_proyecto,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un proyecto con ese nombre"
            )
        
        # Crear proyecto
        nuevo_proyecto = Proyecto(
            nombre_proyecto=proyecto_data.nombre_proyecto,
            descripcion=proyecto_data.descripcion,
            uuid_padron=proyecto_data.uuid_padron,
            usuario_creador=usuario.uuid_usuario,
            en_emision=False,
            is_deleted=False
        )
        
        db.add(nuevo_proyecto)
        db.commit()
        db.refresh(nuevo_proyecto)
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="CREAR_PROYECTO",
            entidad="PROYECTO",
            entidad_id=str(nuevo_proyecto.uuid_proyecto),
            detalles={
                "nombre": nuevo_proyecto.nombre_proyecto,
                "padron": padron.nombre_padron
            },
            ip_address=ip_address
        )
        
        proyecto_dict = ProyectoResponse.model_validate(nuevo_proyecto).__dict__
        proyecto_dict['nombre_padron'] = padron.nombre_padron
        
        return ProyectoResponse(**proyecto_dict)
    
    @staticmethod
    def update_proyecto(
        db: Session,
        proyecto_uuid: uuid.UUID,
        proyecto_data: ProyectoUpdate,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> ProyectoResponse:
        """Actualizar proyecto"""
        
        proyecto = db.query(Proyecto).filter(
            and_(
                Proyecto.uuid_proyecto == proyecto_uuid,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if not proyecto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        # Verificar que no esté en emisión
        if proyecto.en_emision:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede editar un proyecto que está en emisión"
            )
        
        # Actualizar campos
        update_data = proyecto_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(proyecto, field, value)
        
        db.commit()
        db.refresh(proyecto)
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="EDITAR_PROYECTO",
            entidad="PROYECTO",
            entidad_id=str(proyecto.uuid_proyecto),
            detalles={"cambios": update_data},
            ip_address=ip_address
        )
        
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == proyecto.uuid_padron
        ).first()
        
        proyecto_dict = ProyectoResponse.model_validate(proyecto).__dict__
        proyecto_dict['nombre_padron'] = padron.nombre_padron if padron else None
        
        return ProyectoResponse(**proyecto_dict)
    
    @staticmethod
    def delete_proyecto(
        db: Session,
        proyecto_uuid: uuid.UUID,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> dict:
        """Eliminar proyecto (soft delete)"""
        
        proyecto = db.query(Proyecto).filter(
            and_(
                Proyecto.uuid_proyecto == proyecto_uuid,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if not proyecto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        # Verificar que no esté en emisión
        if proyecto.en_emision:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar un proyecto que está en emisión"
            )
        
        # Soft delete
        proyecto.is_deleted = True
        db.commit()
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="ELIMINAR_PROYECTO",
            entidad="PROYECTO",
            entidad_id=str(proyecto.uuid_proyecto),
            detalles={"nombre": proyecto.nombre_proyecto},
            ip_address=ip_address
        )
        
        return {"message": "Proyecto eliminado exitosamente"}
    
    @staticmethod
    async def upload_logo(
        db: Session,
        proyecto_uuid: uuid.UUID,
        file: UploadFile,
        usuario: Usuario
    ) -> ProyectoResponse:
        """Subir logo del proyecto"""
        
        proyecto = db.query(Proyecto).filter(
            and_(
                Proyecto.uuid_proyecto == proyecto_uuid,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if not proyecto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        # Validar tipo de archivo
        allowed_types = ["image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se permiten imágenes JPG/PNG"
            )
        
        # Validar tamaño (max 2MB)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > 2 * 1024 * 1024:  # 2MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo no debe superar 2MB"
            )
        
        # Crear directorio si no existe
        upload_dir = os.path.join(settings.UPLOAD_DIR, "proyectos")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generar nombre único
        file_extension = os.path.splitext(file.filename)[1]
        new_filename = f"{proyecto_uuid}{file_extension}"
        file_path = os.path.join(upload_dir, new_filename)
        
        # Eliminar logo anterior si existe
        if proyecto.logo_proyecto and os.path.exists(proyecto.logo_proyecto):
            os.remove(proyecto.logo_proyecto)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Actualizar BD
        proyecto.logo_proyecto = file_path
        db.commit()
        db.refresh(proyecto)
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="SUBIR_LOGO",
            entidad="PROYECTO",
            entidad_id=str(proyecto.uuid_proyecto),
            detalles={"filename": new_filename}
        )
        
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == proyecto.uuid_padron
        ).first()
        
        proyecto_dict = ProyectoResponse.model_validate(proyecto).__dict__
        proyecto_dict['nombre_padron'] = padron.nombre_padron if padron else None
        
        return ProyectoResponse(**proyecto_dict)
    
    @staticmethod
    def get_all_padrones(db: Session) -> List[PadronResponse]:
        """Obtener todos los padrones disponibles"""
        
        padrones = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.is_deleted == False
        ).all()
        
        return [PadronResponse.model_validate(p) for p in padrones]
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from datetime import datetime

from app.models.bitacora import Bitacora

class BitacoraService:
    
    @staticmethod
    def registrar(
        db: Session,
        uuid_usuario: Optional[uuid.UUID],
        accion: str,
        entidad: str,
        entidad_id: Optional[str] = None,
        detalles: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        fue_exitoso: bool = True,
        mensaje_error: Optional[str] = None
    ) -> Bitacora:
        """Registrar entrada en bitácora"""
        
        registro = Bitacora(
            uuid_usuario=uuid_usuario,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            detalles=detalles,
            ip_address=ip_address,
            user_agent=user_agent,
            fue_exitoso=fue_exitoso,
            mensaje_error=mensaje_error
        )
        
        db.add(registro)
        db.commit()
        
        return registro
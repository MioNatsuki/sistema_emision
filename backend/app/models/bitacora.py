from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class Bitacora(Base):
    __tablename__ = "bitacora"
    
    id_bitacora = Column(Integer, primary_key=True, index=True)
    uuid_usuario = Column(UUID(as_uuid=True), nullable=True)
    accion = Column(String(50), nullable=False, index=True)
    entidad = Column(String(50), nullable=False, index=True)
    entidad_id = Column(String(100), nullable=True)
    detalles = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    fue_exitoso = Column(Boolean, default=True)
    mensaje_error = Column(Text, nullable=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<Bitacora {self.accion} - {self.entidad}>"
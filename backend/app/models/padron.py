from sqlalchemy import Column, String, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base

class IdentificadorPadron(Base):
    __tablename__ = "identificador_padron"
    
    uuid_padron = Column(UUID(as_uuid=True), default=uuid.uuid4, primary_key=True)
    nombre_padron = Column(String(100), unique=True, nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    is_deleted = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Padron {self.nombre_padron}>"
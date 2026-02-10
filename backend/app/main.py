from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/")
async def root():
    return {
        "message": "Sistema de Emisiones API",
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Crear directorios si no existen
os.makedirs("./uploads/proyectos", exist_ok=True)
os.makedirs("./uploads/plantillas", exist_ok=True)

# Servir archivos estáticos
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")

# Importar routers
from app.api.v1 import auth, proyectos, plantillas

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(proyectos.router, prefix="/api/v1/proyectos", tags=["Proyectos"])
app.include_router(plantillas.router, prefix="/api/v1/plantillas", tags=["Plantillas"])
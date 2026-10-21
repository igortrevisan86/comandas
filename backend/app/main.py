from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import SessionLocal

from app.api.v1 import (
    auth,
    cards,
    categories,
    products,
    orders,
    splits,
    payments,
    cash,
    reports
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed database tables and initial records
    try:
        db = SessionLocal()
        init_db(db)
        db.close()
    except Exception as e:
        # In test environments or when DB is initialized separately
        print(f"[Lifespan Notice] Skipping default DB seeding: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API para Sistema de Comandas e PDV de Restaurante",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck endpoint (used by Docker Compose health checks)
@app.get("/api/health", tags=["Status"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# Include API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(auth.users_router, prefix=api_v1_prefix)
app.include_router(cards.router, prefix=api_v1_prefix)
app.include_router(categories.router, prefix=api_v1_prefix)
app.include_router(products.router, prefix=api_v1_prefix)
app.include_router(orders.router, prefix=api_v1_prefix)
app.include_router(splits.router, prefix=api_v1_prefix)
app.include_router(payments.router, prefix=api_v1_prefix)
app.include_router(cash.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)

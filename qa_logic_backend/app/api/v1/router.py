from fastapi import APIRouter
from app.api.v1.endpoints import health, generate, export, history, prd

# Main v1 router aggregator
api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(generate.router, prefix="/generate", tags=["Generate"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])

api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(prd.router, prefix="/prd", tags=["PRD"])

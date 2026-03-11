from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.db.database import engine, Base
# Import all models here mapped into metadata before create_all
from app.db import models

from app.core.config import settings
from app.core.exceptions import (
    BaseAPIException,
    custom_api_exception_handler,
    custom_validation_exception_handler,
)
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite flat structures synchronously safely gracefully
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # No teardown needed MVP

def create_app() -> FastAPI:
    """
    Factory to assemble the FastAPI application structure for MVP.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        description="Backend API for QA-Logic Pro MVP",
        version="0.1.0",
        lifespan=lifespan
    )

    # Allow React frontend to safely query the backend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Standardize our Error Boundaries natively
    app.add_exception_handler(RequestValidationError, custom_validation_exception_handler)
    app.add_exception_handler(BaseAPIException, custom_api_exception_handler)

    # Attach our active v1 routes
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    # Primarily for direct execution testing 
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

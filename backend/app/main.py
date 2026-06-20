from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "JobBuddy Voice Agent backend is running.",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/api",
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


app.include_router(router, prefix="/api")

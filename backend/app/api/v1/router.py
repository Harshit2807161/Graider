from fastapi import APIRouter
from app.api.v1.endpoints import login, users, orgs, batches, upload, exams, submissions

api_router = APIRouter()
api_router.include_router(login.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
api_router.include_router(batches.router, prefix="/batches", tags=["batches"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(submissions.router, prefix="", tags=["submissions"])

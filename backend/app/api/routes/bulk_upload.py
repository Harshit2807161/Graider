from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.sql_models import User, Membership
from app.api.deps import get_current_user
from app.services.ingestion import ingest_users_from_file

router = APIRouter()

@router.post("/orgs/{org_id}/upload-users", response_model=dict)
def upload_users(
    *,
    db: Session = Depends(get_session),
    org_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Bulk upload users to an organization via Excel/CSV.
    Requires 'owner' or 'admin' role.
    """
    # Check permissions
    if not current_user.is_superuser:
        membership = db.exec(
            select(Membership)
            .where(Membership.user_id == current_user.id)
            .where(Membership.org_id == org_id)
            .where(Membership.role.in_(["owner", "admin"]))
        ).first()
        if not membership:
             raise HTTPException(status_code=403, detail="Not authorized")

    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx or .csv")
    
    # Process
    try:
        stats = ingest_users_from_file(db, org_id, file)
        return {
            "message": "File processed successfully",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

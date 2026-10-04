import pandas as pd
from typing import List, Dict, Any
from uuid import UUID
from fastapi import UploadFile, HTTPException
from sqlmodel import Session, select
import io

from app import crud
from app.models.org import Batch, Enrollment
from app.models.user import User, Membership
from app.core.constants import Role

async def process_student_roster(
    db: Session, 
    batch_id: UUID, 
    file: UploadFile
) -> Dict[str, Any]:
    """
    Process an Excel or CSV file to enroll students into a batch.
    Logic is idempotent:
    1. Find/Create User by email.
    2. Ensure Membership in the batch's organization.
    3. Create Enrollment for the batch.
    """
    
    # 1. Verify Batch & Org
    batch = crud.batch.get(db, id=batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    org_id = batch.org_id

    # 2. Read File
    try:
        content = await file.read()
        if (file.filename or "").lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Standardize column names
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Check required columns
    required = {'email', 'name'}
    if not required.issubset(df.columns):
        raise HTTPException(
            status_code=400, 
            detail=f"Missing required columns. Found: {list(df.columns)}. Required: {list(required)}"
        )

    results = {
        "total": len(df),
        "enrolled": 0,
        "existing": 0,
        "errors": []
    }

    for _, row in df.iterrows():
        if pd.isna(row['email']):
            results["errors"].append({"email": "", "error": "Missing email"})
            continue
        email = str(row['email']).strip().lower()
        name = str(row['name']).strip() if pd.notna(row['name']) else email.split("@")[0]

        if not email or "@" not in email:
            results["errors"].append({"email": email, "error": "Invalid email"})
            continue

        try:
            # 3. Find or Create User
            user = crud.user.get_by_email(db, email=email)
            if not user:
                # No password: the account can't log in until one is set through an
                # invite/reset flow. (A shared default password made every imported
                # student's account trivially guessable.)
                user = User(email=email, full_name=name, hashed_password=None)
                db.add(user)
                db.commit()
                db.refresh(user)

            # 4. Ensure Org Membership
            membership = db.exec(
                select(Membership)
                .where(Membership.user_id == user.id)
                .where(Membership.org_id == org_id)
            ).first()

            if not membership:
                membership = Membership(
                    user_id=user.id, 
                    org_id=org_id, 
                    role=Role.STUDENT
                )
                db.add(membership)
                db.commit()
                db.refresh(membership)

            # 5. Create Enrollment
            existing_enrollment = db.exec(
                select(Enrollment)
                .where(Enrollment.batch_id == batch_id)
                .where(Enrollment.membership_id == membership.id)
            ).first()

            if not existing_enrollment:
                enrollment = Enrollment(batch_id=batch_id, membership_id=membership.id)
                db.add(enrollment)
                db.commit()
                results["enrolled"] += 1
            elif existing_enrollment.deleted_at is not None:
                existing_enrollment.deleted_at = None
                db.add(existing_enrollment)
                db.commit()
                results["enrolled"] += 1
            else:
                results["existing"] += 1

        except Exception as e:
            # Keep the session usable for the remaining rows
            db.rollback()
            results["errors"].append({"email": email, "error": str(e)})

    return results

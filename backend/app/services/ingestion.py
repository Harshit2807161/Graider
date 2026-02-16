import pandas as pd
from typing import BinaryIO, List
from uuid import UUID
from sqlmodel import Session, select
from fastapi import UploadFile

from app.models.sql_models import User, Membership, Batch, Enrollment
from app.core.security import get_password_hash

def ingest_users_from_file(
    db: Session, 
    org_id: UUID, 
    file: UploadFile, 
    default_role: str = "student"
) -> dict:
    """
    Ingest users from Excel/CSV file.
    Expected Columns: 'email' (required), 'full_name' (required), 'role', 'batch_name'
    All other columns go into profile_data.
    """
    # 1. Read File
    if file.filename.endswith('.csv'):
        df = pd.read_csv(file.file)
    else:
        df = pd.read_excel(file.file)
    
    # Normalize headers: generic lower case
    df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
    
    # Validation
    if 'email' not in df.columns or 'full_name' not in df.columns:
         return {"error": "Missing required columns: email, full_name"}

    stats = {"created": 0, "updated": 0, "errors": 0}

    for _, row in df.iterrows():
        try:
            email = row['email']
            full_name = row['full_name']
            role = row.get('role', default_role)
            batch_name = row.get('batch_name') # Optional: "Class 10-A"
            
            # Extract generic profile data
            # Everything that is NOT core fields
            core_fields = ['email', 'full_name', 'role', 'batch_name', 'password']
            profile_data = {k: v for k, v in row.to_dict().items() if k not in core_fields and pd.notna(v)}
            
            # 1. Create/Get User
            user = db.exec(select(User).where(User.email == email)).first()
            if not user:
                # Create user with temp password
                user = User(
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash("graider123") # Temp password
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                stats["created"] += 1
            else:
                stats["updated"] += 1
            
            # 2. Add Membership to Org
            membership = db.exec(
                select(Membership)
                .where(Membership.user_id == user.id)
                .where(Membership.org_id == org_id)
            ).first()
            
            if not membership:
                membership = Membership(
                    user_id=user.id,
                    org_id=org_id,
                    role=role,
                    profile_data=profile_data
                )
                db.add(membership)
                db.commit()
                db.refresh(membership)
            
            # 3. Handle Batch (Optional)
            if batch_name and pd.notna(batch_name):
                # Find or Create Batch
                batch = db.exec(
                    select(Batch)
                    .where(Batch.org_id == org_id)
                    .where(Batch.name == batch_name)
                ).first()
                
                if not batch:
                    batch = Batch(org_id=org_id, name=batch_name)
                    db.add(batch)
                    db.commit()
                    db.refresh(batch)
                
                # Enroll
                enrollment = db.exec(
                    select(Enrollment)
                    .where(Enrollment.batch_id == batch.id)
                    .where(Enrollment.membership_id == membership.id)
                ).first()
                
                if not enrollment:
                    enrollment = Enrollment(batch_id=batch.id, membership_id=membership.id)
                    db.add(enrollment)
                    db.commit()

        except Exception as e:
            print(f"Error processing row {email}: {e}")
            stats["errors"] += 1
            
    return stats

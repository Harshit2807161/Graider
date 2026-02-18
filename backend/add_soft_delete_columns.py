"""
Add deleted_at column to all tables for soft delete support
"""
from sqlmodel import Session, text
from app.core.db import engine

def migrate():
    with Session(engine) as session:
        tables = [
            "users",
            "organizations", 
            "memberships",
            "batches",
            "enrollments",
            "exams",
            "submissions"
        ]
        
        for table in tables:
            try:
                session.exec(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP"))
                print(f"✅ Added deleted_at to {table}")
            except Exception as e:
                print(f"⚠️  {table}: {e}")
        
        session.commit()
        print("\n✅ Migration complete!")

if __name__ == "__main__":
    migrate()

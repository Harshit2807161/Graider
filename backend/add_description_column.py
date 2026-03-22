"""
Add description column to organizations table
"""
from sqlmodel import Session, text
from app.core.db import engine

def migrate():
    with Session(engine) as session:
        # Add description column to organizations table
        session.exec(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT"))
        session.commit()
        print("✅ Added description column to organizations table")

if __name__ == "__main__":
    migrate()

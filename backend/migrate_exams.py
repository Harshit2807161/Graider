from sqlmodel import Session, text
from app.core.db import engine

def migrate():
    with Session(engine) as session:
        print("Checking for missing columns in 'exams' table...")
        
        # Exams Table
        session.exec(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT"))
        session.exec(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()"))
        session.exec(text("ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE"))
        print("✅ Checked 'exams' table")
        
        # Organizations Table
        session.exec(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT"))
        session.exec(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE"))
        print("✅ Checked 'organizations' table")

        # Questions Table
        session.exec(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE"))
        print("✅ Checked 'questions' table")

        # Submissions Table
        session.exec(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE"))
        print("✅ Checked 'submissions' table")
        
        session.commit()
        print("🚀 Migration completed successfully")

if __name__ == "__main__":
    migrate()

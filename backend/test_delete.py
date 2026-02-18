"""Test organization deletion to see actual error"""
from sqlmodel import Session
from app.core.db import engine
from app.services.org_service import org_service
from uuid import UUID

def test_delete():
    with Session(engine) as session:
        org_id = UUID("05e9567f-1416-49bd-ae1a-5552fbe494a2")
        
        try:
            org_service.delete_organization(session, org_id=org_id)
            print(f"✅ Organization deleted successfully")
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_delete()

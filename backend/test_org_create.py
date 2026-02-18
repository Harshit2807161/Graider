"""
Test organization creation directly
"""
from sqlmodel import Session
from app.core.db import engine
from app.schemas.org import OrganizationCreate
from app.services.org_service import org_service
from uuid import UUID

def test_create_org():
    with Session(engine) as session:
        # Use the super admin user ID
        owner_id = UUID("6dc82e06-db34-41b0-a52c-d1a07b0f8d33")
        
        org_in = OrganizationCreate(
            name="Test Org",
            slug="test-org",
            description="Test Description"
        )
        
        try:
            org = org_service.create_organization_with_owner(
                session, obj_in=org_in, owner_id=owner_id
            )
            print(f"✅ Organization created: {org.name} (ID: {org.id})")
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_create_org()

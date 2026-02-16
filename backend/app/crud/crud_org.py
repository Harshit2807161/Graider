from uuid import UUID

from app.crud.base import CRUDBase
from app.models.org import Organization
from app.schemas.org import OrganizationCreate, OrganizationUpdate

class CRUDOrganization(CRUDBase[Organization, OrganizationCreate, OrganizationUpdate]):
    pass

org = CRUDOrganization(Organization)

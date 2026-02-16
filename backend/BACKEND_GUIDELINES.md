# Graider Backend Development Guidelines

**Architecture Pattern**: Layered Architecture (Service-Repository Pattern).
**Philosophy**: Separation of Concerns. Each layer has a distinct responsibility.

---

## 1. The Architecture Stack

We strictly follow this flow. Requests flow down, Data flows up.

```mermaid
graph TD
    Client[Client (React/Mobile)] -->|HTTP/JSON| Route[API Route (Controller)]
    Route -->|Schema Object| Service[Service Layer (Business Logic)]
    Service -->|Model Object| CRUD[CRUD Layer (Data Access)]
    CRUD -->|SQL| DB[(Database)]
```

### 1.1. API Layer (`app/api/v1/endpoints`)
*   **Responsibility**: Parsing requests, Input validation (Pydantic), Permission checks, Returning HTTP responses.
*   **Strict Rule**: **NO Business Logic.** Do not calculate grades, send emails, or write complex `if` statements here.
*   **Strict Rule**: **NO SQL.** Never import `select` or call `db.exec()` here. Call a Service or CRUD method.

### 1.2. Service Layer (`app/services`)
*   **Responsibility**: The "Brain" of the application. Business rules, transactions, coordinating multiple things.
*   **Example**: "Registering a School" (Create Org -> Create Admin User -> Send Welcome Email).
*   **Strict Rule**: Does not know about HTTP (no `Request` or `Response` objects). Returns Python objects/models.

### 1.3. CRUD Layer (`app/crud`)
*   **Responsibility**: The "Library" of the application. atomic Database operations.
*   **Example**: `get_by_email`, `create`, `update_status`.
*   **Strict Rule**: **NO Business Logic.** Just verify the data can be written/read.
*   **Why?**: If we switch from Postgres to MongoDB, we only rewrite this layer.

### 1.4. Models & Schemas
*   **Models (`app/models`)**: Database Tables (`class User(SQLModel, table=True)`).
*   **Schemas (`app/schemas`)**: API Types (`class UserCreate(BaseModel)`).
*   **Strict Rule**: Never return a raw **Model** to the user if it contains secrets (like `hashed_password`). structured via **Schemas**.

---

## 2. Frequently Asked Questions

### Q: Why do we have a CRUD layer? Why not call DB in Service?
**A:**
1.  **Reusability**: `crud.user.get_by_email()` is written once, used in Login, Registration, and Forgot Password endpoints.
2.  **Testing**: We can "mock" the CRUD layer to test the Service logic without a real database.
3.  **Future Proofing**: If we change ORMs or Databases, the Service code remains untouched.

### Q: Is this "Hexagonal Architecture"?
**A:** Not strictly. Hexagonal (Ports & Adapters) is more complex and uses abstract interfaces for everything. We use a **Pragmatic Layered Architecture**.
*   Our **APIs** are the "Primary Adapters".
*   Our **CRUD** is the "Secondary Adapter".
*   Our **Services** are the "Core Domain".
It achieves the same goal (decoupling) with less boilerplate.

---

## 3. Strict Coding Standards

1.  **Imports**: Avoid circular imports.
    *   Models can import other models (carefully).
    *   CRUD imports Models.
    *   Service imports CRUD.
    *   API imports Service and CRUD.
    *   **NEVER**: Model imports CRUD.

    *   **Circular Imports in Models**: Use `typing.TYPE_CHECKING` and String Forward References.
        ```python
        # Good Pattern
        if TYPE_CHECKING:
            from app.models.org import Organization
        
        class User(Base, table=True):
            # Use string "Organization", not the class Organization
            orgs: List["Organization"] = Relationship(...)
        ```

2.  **Constants**: No "Magic Strings".
    *   **Bad**: `if user.role == "admin":`
    *   **Good**: `if user.role == Role.ADMIN:` (Import from `app.core.constants`)

3.  **Configuration**:
    *   Use `app.core.config.settings` for all environment variables.

4.  **Security**:
    *   Never check permissions manually (e.g. `if user.is_superuser`).
    *   Use dependencies: `Depends(deps.get_current_active_superuser)`.
    *   **Superuser vs Roles**:
        *   `is_superuser`: ONLY for system admins (God Mode). Can access the `/admin` panel, create the first Organization.
        *   `Organization Role` (in `Memberships`): For actual business logic. "Can this user grade?" -> Check `membership.role == 'teacher'`. **DO NOT use is_superuser for business logic.**

5.  **Error Handling**:
    *   **Always** raise `HTTPException`.
    *   **Never** return a dictionary like `{"error": "message"}`.
    *   **Bad**: `return {"status": 404, "msg": "Not found"}`
    *   **Good**: `raise HTTPException(status_code=404, detail="User not found")`

6.  **Logging**:
    *   Use `structlog` (already installed).
    *   **Bad**: `print(f"User {id} logged in")`
    *   **Good**: 
        ```python
        import structlog
        logger = structlog.get_logger()
        logger.info("user_login", user_id=str(user.id))
        ```

## 4. Decision Tree: "Where do I put this code?"

*   *Is it a SQL query?* -> **CRUD Layer**.
*   *Is it checking if a user is allowed to do X?* -> **Service Layer** (or API Dependency).
*   *Is it sending an email?* -> **Service Layer**.
*   *Is it just validating that an email is valid?* -> **Pydantic Schema**.
*   *Is it parsing a CSV file?* -> **Service Layer** (e.g. `ingestion_service.py`).

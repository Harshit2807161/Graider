# Graider API Reference (V1)

**Base URL**: `http://localhost:8000/api/v1`
**Auto-generated Docs**: `http://localhost:8000/docs` (Swagger UI)

---

## 1. Authentication
**Tag**: `auth`

### Login
*   **POST** `/auth/login`
*   **Body** (`OAuth2PasswordRequestForm`):
    *   `username`: Email address (e.g., `admin@graider.com`)
    *   `password`: User password
*   **Response**:
    *   `access_token`: JWT Token
    *   `token_type`: "bearer"

---

## 2. Users
**Tag**: `users`

### Get Current User
*   **GET** `/users/me`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**: `User` object (id, email, full_name, etc.)

### Create User (Superuser Only)
*   **POST** `/users/`
*   **Body**:
    *   `email`: string
    *   `password`: string
    *   `full_name`: string
*   **Response**: Created `User` object.

---

## 3. Organizations
**Tag**: `orgs`

### Create Organization
*   **POST** `/orgs/`
*   **Body**:
    *   `name`: "Acme High School"
    *   `slug`: "acme-hs"
*   **Response**: `Organization` object.
*   **Note**: Automatically makes the creator the `OWNER`.

### List Organizations
*   **GET** `/orgs/`
*   **Response**: List of `Organization` objects.

---

## 4. Batches (Classes)
**Tag**: `batches`

### Create Batch
*   **POST** `/batches/`
*   **Body**:
    *   `org_id`: UUID of the organization
    *   `name`: "Class 10-A"
*   **Permissions**: `OWNER`, `ADMIN`, or `TEACHER` of the Org.

### List Batches
*   **GET** `/batches/?org_id=<UUID>`
*   **Response**: List of `Batch` objects.

### Enroll Student
*   **POST** `/batches/{batch_id}/enroll`
*   **Body**:
    *   `email`: Email of the student to enroll.
*   **Note**: Student must already exist in the system and be a member of the Org.

---

## 5. Upload & Grading (AI Service)
**Tag**: `upload`

### Upload Question Paper
*   **POST** `/upload/questions`
*   **Form Data**:
    *   `files`: List of images/PDFs
    *   `session_id`: (Optional) UUID if appending to existing session.
*   **Response**: `session_id`, `message`.

### Upload Answer Sheets
*   **POST** `/upload/answers`
*   **Form Data**:
    *   `files`: List of images/PDFs
    *   `session_id`: UUID of the session (Required).

### Upload Rubric
*   **POST** `/upload/rubric`
*   **Form Data**:
    *   `files`: Text, Markdown, JSON, or Image/PDF.
    *   `session_id`: UUID (Required).

### Upload Combined (Question + Answer)
*   **POST** `/upload/combined`
*   **Form Data**:
    *   `files`: Combined PDF/Images.

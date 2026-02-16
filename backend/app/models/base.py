from sqlmodel import SQLModel

class Base(SQLModel):
    class Config:
        validate_assignment = True

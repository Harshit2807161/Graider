from sqlmodel import Session, select
from app.core.db import engine
from app.models.user import User
from app.core.security import verify_password, get_password_hash

def check_user():
    with Session(engine) as session:
        email = "agarwalparth0903@gmail.com"
        password = "admin"
        
        # 1. Check if user exists
        user = session.exec(select(User).where(User.email == email)).first()
        
        if not user:
            print(f"❌ User {email} NOT FOUND in database!")
            return

        print(f"✅ User {email} FOUND.")
        print(f"   ID: {user.id}")
        print(f"   Stored Hash: {user.hashed_password[:10]}...")
        
        # 2. Verify Password
        is_valid = verify_password(password, user.hashed_password)
        if is_valid:
            print(f"✅ Password verification SUCCESS.")
        else:
            print(f"❌ Password verification FAILED.")
            
            # 3. Fix Password if failed
            print("🔄 Resetting password...")
            user.hashed_password = get_password_hash(password)
            session.add(user)
            session.commit()
            print("✅ Password reset to 'admin'. Try logging in now.")

if __name__ == "__main__":
    check_user()

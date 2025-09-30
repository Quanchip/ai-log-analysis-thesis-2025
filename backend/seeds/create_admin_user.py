#!/usr/bin/env python3
"""
Script to create admin users for testing purposes.
"""

from pathlib import Path
import sys
import os

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Add the src directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.database import SessionLocal
from auth.models import Users, UserRole
from auth.utils import bcrypt_context

def create_admin_user(username: str, email: str, password: str):
    """Create an admin user"""

    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(Users).filter(Users.username == username).first()
        if existing_user:
            print(f"❌ User '{username}' already exists!")
            if existing_user.role == UserRole.admin:
                print(f"   User '{username}' is already an admin.")
            else:
                print(f"   User '{username}' exists but is not an admin.")
                print(f"   Current role: {existing_user.role.value}")
            return False

        # Create new admin user
        hashed_password = bcrypt_context.hash(password)

        admin_user = Users(
            username=username,
            email=email,
            password=hashed_password,
            role=UserRole.admin  # Explicitly set admin role
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"✅ Admin user created successfully!")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role.value}")
        print(f"   Created at: {admin_user.created_at}")
        return True

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {str(e)}")
        return False
    finally:
        db.close()

def create_test_users():
    """Create some test users (both admin and regular users)"""

    print("🚀 Creating test users...")
    print("="*50)

    # Create admin user
    print("👑 Creating admin user...")
    create_admin_user(
        username="admin",
        email="admin@example.com",
        password="admin123"
    )

    print("\n👤 Creating regular user...")
    # Create regular user for testing
    db = SessionLocal()
    try:
        existing_user = db.query(Users).filter(Users.username == "testuser").first()
        if not existing_user:
            hashed_password = bcrypt_context.hash("testpass123")
            regular_user = Users(
                username="testuser",
                email="testuser@example.com",
                password=hashed_password,
                role=UserRole.user  # Default user role
            )
            db.add(regular_user)
            db.commit()
            print(f"✅ Regular user 'testuser' created successfully!")
        else:
            print(f"⏭️  Regular user 'testuser' already exists")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating regular user: {str(e)}")
    finally:
        db.close()

def list_all_users():
    """List all users in the database"""

    db = SessionLocal()
    try:
        users = db.query(Users).all()

        print(f"\n📋 All users in database ({len(users)} total):")
        print("-" * 80)
        print(f"{'ID':<5} {'Username':<15} {'Email':<25} {'Role':<10} {'Created'}")
        print("-" * 80)

        for user in users:
            created_str = user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else "N/A"
            print(f"{user.id:<5} {user.username:<15} {user.email:<25} {user.role.value:<10} {created_str}")

    except Exception as e:
        print(f"❌ Error listing users: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    print("👥 Admin User Creation Script")
    print("="*50)

    if len(sys.argv) > 1:
        if sys.argv[1] == "--create-test-users":
            create_test_users()
            list_all_users()
        elif sys.argv[1] == "--list":
            list_all_users()
        else:
            print("Usage:")
            print("  python create_admin_user.py --create-test-users")
            print("  python create_admin_user.py --list")
    else:
        # Interactive mode
        print("🔧 Interactive Admin User Creation")
        print()

        username = input("Enter admin username: ").strip()
        email = input("Enter admin email: ").strip()
        password = input("Enter admin password: ").strip()

        if username and email and password:
            success = create_admin_user(username, email, password)
            if success:
                print(f"\n🎉 You can now login with:")
                print(f"   Username: {username}")
                print(f"   Password: {password}")
                print(f"   Role: admin")
        else:
            print("❌ All fields are required!")

        print()
        list_all_users()
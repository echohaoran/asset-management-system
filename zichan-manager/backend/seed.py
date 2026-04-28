from app.database import SessionLocal, engine, Base
from app.models import User, Category
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if not db.query(User).filter(User.username == "admin").first():
    admin = User(username="admin", password_hash=hash_password("admin123"), role="admin")
    db.add(admin)
    print("Created admin user (admin / admin123)")

if not db.query(Category).first():
    for name in ["电子设备", "办公家具", "交通工具", "仪器仪表", "房屋建筑"]:
        db.add(Category(name=name))
    print("Created default categories")

db.commit()
db.close()
print("Seed completed!")

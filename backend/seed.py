from app.database import SessionLocal, engine, Base
from app.models import User, Category, Person
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

if not db.query(Person).first():
    for name, dept in [("张三", "技术部"), ("李四", "财务部"), ("王五", "行政部"), ("赵六", "市场部")]:
        db.add(Person(name=name, department=dept))
    print("Created sample persons")

db.commit()
db.close()
print("Seed completed!")

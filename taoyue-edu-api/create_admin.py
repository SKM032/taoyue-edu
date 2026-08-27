"""创建默认管理员账号
可单独运行：python create_admin.py
也可被 main.py 启动时自动调用
"""
import sys

from app.database import SessionLocal, engine, Base
from app.models import User
from app.security import hash_password

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "Admin123456!"
DEFAULT_ADMIN_PHONE = "13800000000"


def ensure_admin(db=None):
    """确保管理员账号存在（不存在则创建，存在则更新默认密码）
    返回创建/更新结果字符串
    """
    if db is None:
        db = SessionLocal()
        own_session = True
    else:
        own_session = False
    try:
        admin = db.query(User).filter(
            User.role == "admin", User.nickname == DEFAULT_ADMIN_USERNAME
        ).first()
        if admin:
            admin.password_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
            db.commit()
            return "管理员账号已存在，密码已更新为默认密码"
        admin = User(
            nickname=DEFAULT_ADMIN_USERNAME,
            phone=DEFAULT_ADMIN_PHONE,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
            role="admin",
            status="active",
        )
        db.add(admin)
        db.commit()
        return "管理员账号创建成功"
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    # 确保表存在
    Base.metadata.create_all(bind=engine)
    result = ensure_admin()
    print(result)
    print(f"  账号: {DEFAULT_ADMIN_USERNAME}")
    print(f"  密码: {DEFAULT_ADMIN_PASSWORD}")

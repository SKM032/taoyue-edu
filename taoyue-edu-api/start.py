"""一键启动脚本：先建表+创建admin，再启动服务"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

print("=" * 50)
print("桃悦智科 API 启动器")
print("=" * 50)

print("\n[1/2] 初始化数据库和创建管理员账号...")
try:
    from app.database import SessionLocal, engine, Base
    from app.models import User
    from app.security import hash_password, verify_password

    Base.metadata.create_all(bind=engine)
    print("  ✓ 数据库表已创建")

    db = SessionLocal()

    # 强制重建 admin
    old = db.query(User).filter(User.nickname == "admin").first()
    if old:
        db.delete(old)
        db.commit()
        print("  ✓ 删除旧 admin 账号")

    new_admin = User(
        nickname="admin",
        phone="13800000000",  # 使用合法手机号格式
        password_hash=hash_password("Admin123456!"),
        role="admin",
        status="active",
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    ok = verify_password("Admin123456!", new_admin.password_hash)
    print(f"  ✓ 创建 admin 账号: {new_admin.id}")
    print(f"  ✓ 密码验证: {'通过' if ok else '失败'}")

    if not ok:
        print("  ! 密码验证失败，请检查 bcrypt 库")
        sys.exit(1)

    db.close()
except Exception as e:
    print(f"  ✗ 错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[2/2] 启动 FastAPI 服务...")
import uvicorn
uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

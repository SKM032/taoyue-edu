@echo off
echo ========================================
echo 桃悦智科API - 一键初始化脚本
echo ========================================

echo [1/4] 安装Python依赖...
pip install fastapi uvicorn sqlalchemy pymysql redis python-jose passlib python-multipart oss2 pydantic-settings httpx bcrypt cryptography

echo [2/4] 初始化数据库...
python init_db.py

echo [3/4] 启动API服务...
start "Taoyue-API" cmd /c "python run.py"

echo [4/4] API服务已启动在 http://localhost:8000
echo API文档: http://localhost:8000/docs
echo.
echo ========================================
echo 接下来请在新窗口执行:
echo   cd taoyue-edu ^&^& npm install ^&^& npm run dev
echo   cd taoyue_edu_admin ^&^& npm install ^&^& npm run dev
echo ========================================
pause

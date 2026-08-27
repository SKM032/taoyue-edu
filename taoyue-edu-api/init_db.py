"""初始化数据库脚本"""
import pymysql

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "root",
    "charset": "utf8mb4",
}

def init_database():
    """创建数据库"""
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS taoyue_edu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    print("[OK] 数据库 taoyue_edu 创建成功")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    init_database()
    print("数据库初始化完成！")
    print("接下来请执行: python -m pip install -r requirements.txt")
    print("然后启动后端: python run.py")

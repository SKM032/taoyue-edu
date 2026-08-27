# -*- coding: utf-8 -*-
"""把生成的轮播图复制到 static/uploads 并保存 Banner 记录到数据库
运行：python seed_banners.py
"""
import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

from app.database import SessionLocal
from app.models import Banner

# 源图片目录
SRC_DIR = r'e:/my_important/generated-images'
# 目标静态上传目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 映射：源文件名 -> (目标文件名, 标题, 跳转链接, 排序)
banners_config = [
    ('Modern_education_technology_co_2026-08-15T04-13-10.png',
     'banner-brand.png', 'AI大模型实战训练营', '/courses/llm-app', 1),
    ('Artificial_intelligence_educat_2026-08-15T04-13-31.png',
     'banner-ai.png', 'Python零基础入门实战', '/courses/python-basic', 2),
    ('Career_growth_and_professional_2026-08-15T04-13-52.png',
     'banner-career.png', '机器学习实战：从入门到项目', '/courses/ml-practice', 3),
    ('Digital_skills_and_programming_2026-08-15T04-14-13.png',
     'banner-digital.png', '跨境电商运营实战', '/courses/amazon-practice', 4),
]

db = SessionLocal()
try:
    saved = []
    for src_name, dst_name, title, link, sort_order in banners_config:
        src = os.path.join(SRC_DIR, src_name)
        if not os.path.exists(src):
            print(f"[跳过] 源文件不存在: {src_name}")
            continue
        # 复制到 static/uploads
        dst = os.path.join(UPLOAD_DIR, dst_name)
        shutil.copy2(src, dst)
        # 检查是否已有同名 banner（避免重复）
        exists = db.query(Banner).filter(Banner.link_url == link).first()
        if exists:
            # 已存在则更新图片地址
            exists.image_url = f'/static/uploads/{dst_name}'
            exists.title = title
            db.commit()
            print(f"[更新] {title}: {dst_name}")
            saved.append(dst_name)
            continue
        # 新增 banner
        b = Banner(
            title=title,
            image_url=f'/static/uploads/{dst_name}',
            link_url=link,
            position='home',
            sort_order=sort_order,
            is_active=True,
        )
        db.add(b)
        saved.append(dst_name)
        print(f"[新增] {title}: /static/uploads/{dst_name}")

    db.commit()

    # 打印最终 banner 列表
    print("\n===== 当前所有 Banner =====")
    for b in db.query(Banner).order_by(Banner.sort_order).all():
        print(f"  id={b.id} title={b.title} image={b.image_url} link={b.link_url} active={b.is_active}")

    print(f"\n处理完成，共保存 {len(saved)} 张轮播图")
except Exception as e:
    import traceback
    traceback.print_exc()
    db.rollback()
    print(f"失败: {e}")
finally:
    db.close()

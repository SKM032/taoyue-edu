# -*- coding: utf-8 -*-
"""测试数据种子脚本：插入分类、讲师、课程、章节、课时、套餐、Banner、直播、免费资料等
运行：python seed_data.py
可重复运行（已存在的数据会跳过）
"""
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    User,
    Category, Teacher, Course, Chapter, Lesson, CoursePackage,
    Banner, LiveRoom, FreeResource, Bootcamp,
)
from app.security import hash_password


def get_or_create_category(db, name, slug, parent_id=None, icon="", description="", sort_order=0):
    c = db.query(Category).filter(Category.slug == slug).first()
    if c:
        return c
    c = Category(
        name=name, slug=slug, icon=icon, description=description,
        parent_id=parent_id, sort_order=sort_order,
    )
    db.add(c)
    db.flush()
    return c


def get_or_create_teacher(db, name, title="", description="", skills=None, rating=4.9):
    t = db.query(Teacher).filter(Teacher.name == name).first()
    if t:
        return t
    t = Teacher(
        name=name, title=title, description=description,
        skills=json.dumps(skills or [], ensure_ascii=False),
        experience=json.dumps([], ensure_ascii=False),
        course_count=0, student_count=0, rating=rating, status="active",
    )
    db.add(t)
    db.flush()
    return t


def get_or_create_course(db, title, slug, category_id, teacher_id, price, original_price,
                         course_type="recorded", difficulty="beginner", cover="",
                         description="", tags=None, is_featured=False, is_recommended=False,
                         student_count=0, rating=5.0, duration_hours=0,
                         learning_goals=None, prerequisites=None):
    c = db.query(Course).filter(Course.slug == slug).first()
    if c:
        return c
    c = Course(
        title=title, subtitle="", slug=slug, cover=cover, description=description,
        category_id=category_id, teacher_id=teacher_id, difficulty=difficulty,
        course_type=course_type, price=price, original_price=original_price,
        duration_hours=duration_hours, chapter_count=0, student_count=student_count,
        rating=rating, review_count=0,
        tags=json.dumps(tags or [], ensure_ascii=False),
        learning_goals=json.dumps(learning_goals or [], ensure_ascii=False),
        prerequisites=json.dumps(prerequisites or [], ensure_ascii=False),
        status="published",
        is_featured=is_featured, is_recommended=is_recommended,
        published_at=datetime.utcnow(),
    )
    db.add(c)
    db.flush()
    return c


def get_or_create_chapter(db, course_id, title, sort_order, is_free=False, description=""):
    ch = db.query(Chapter).filter(
        Chapter.course_id == course_id, Chapter.title == title
    ).first()
    if ch:
        return ch
    ch = Chapter(course_id=course_id, title=title, description=description,
                 sort_order=sort_order, is_free=is_free)
    db.add(ch)
    db.flush()
    return ch


def get_or_create_lesson(db, chapter_id, title, sort_order, lesson_type="video",
                         video_url="", video_duration=0, is_free=False, content=""):
    le = db.query(Lesson).filter(
        Lesson.chapter_id == chapter_id, Lesson.title == title
    ).first()
    if le:
        return le
    le = Lesson(
        chapter_id=chapter_id, title=title, lesson_type=lesson_type,
        video_url=video_url, video_duration=video_duration,
        document_url="", content=content, is_free=is_free, sort_order=sort_order,
    )
    db.add(le)
    db.flush()
    return le


def get_or_create_package(db, course_id, name, price, original_price, description="", features=None):
    p = db.query(CoursePackage).filter(
        CoursePackage.course_id == course_id, CoursePackage.name == name
    ).first()
    if p:
        return p
    p = CoursePackage(
        course_id=course_id, name=name, price=price, original_price=original_price,
        description=description, features=json.dumps(features or [], ensure_ascii=False),
        sort_order=0,
    )
    db.add(p)
    db.flush()
    return p


def main():
    db = SessionLocal()
    try:
        # ============ 1. 分类（一级 + 二级） ============
        it = get_or_create_category(db, "IT技能", "it", icon="", description="前沿IT技能提升", sort_order=1)
        ai = get_or_create_category(db, "人工智能", "ai", icon="", description="AI人工智能实战", sort_order=2)
        cross = get_or_create_category(db, "跨境电商", "cross-border", icon="", description="跨境电商运营", sort_order=3)
        op = get_or_create_category(db, "新媒体运营", "operation", icon="", description="新媒体内容运营", sort_order=4)

        # IT 二级分类
        python = get_or_create_category(db, "Python编程", "python", parent_id=it.id, description="Python全栈", sort_order=1)
        web = get_or_create_category(db, "Web前端", "web", parent_id=it.id, description="前端开发", sort_order=2)
        data = get_or_create_category(db, "数据分析", "data", parent_id=it.id, description="数据分析", sort_order=3)

        # AI 二级分类
        ml = get_or_create_category(db, "机器学习", "ml", parent_id=ai.id, description="机器学习", sort_order=1)
        llm = get_or_create_category(db, "大模型应用", "llm", parent_id=ai.id, description="大模型应用开发", sort_order=2)

        # 跨境电商二级
        amazon = get_or_create_category(db, "亚马逊", "amazon", parent_id=cross.id, description="亚马逊运营", sort_order=1)
        shopee = get_or_create_category(db, "Shopee", "shopee", parent_id=cross.id, description="Shopee运营", sort_order=2)

        # 新媒体运营二级分类
        short_video = get_or_create_category(db, "短视频运营", "short-video", parent_id=op.id, description="短视频内容与运营", sort_order=1)
        live_sell = get_or_create_category(db, "直播带货", "live-selling", parent_id=op.id, description="直播带货与选品", sort_order=2)

        # ============ 2. 讲师 ============
        t1 = get_or_create_teacher(db, "张伟", title="Python高级工程师", description="8年Python开发经验，擅长Web开发与数据分析", skills=["Python", "Django", "数据分析"], rating=4.9)
        t2 = get_or_create_teacher(db, "李娜", title="AI算法工程师", description="前大厂算法工程师，专注机器学习与AI应用落地", skills=["机器学习", "深度学习", "大模型"], rating=4.8)
        t3 = get_or_create_teacher(db, "王强", title="跨境电商运营专家", description="5年跨境电商运营经验，打造多个百万级店铺", skills=["亚马逊", "Shopee", "选品"], rating=4.7)

        # ============ 3. 课程（含套餐、章节、课时） ============
        # 3.1 Python 入门
        c1 = get_or_create_course(
            db, "Python零基础入门实战", "python-basic", python.id, t1.id,
            price=39, original_price=199, cover="",
            description="<p>从零开始学习Python编程，涵盖语法基础、函数、面向对象、常用库实战。</p>",
            tags=["Python", "入门", "实战"], is_featured=True, is_recommended=True,
            student_count=1250, rating=4.9, duration_hours=18,
        )
        ch = get_or_create_chapter(db, c1.id, "第一章 Python基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 Python环境搭建", 1, video_url="", video_duration=480)
        get_or_create_lesson(db, ch.id, "1.2 变量与数据类型", 2, video_url="", video_duration=620, is_free=True)
        ch2 = get_or_create_chapter(db, c1.id, "第二章 函数与模块", 2)
        get_or_create_lesson(db, ch2.id, "2.1 函数定义", 1, video_url="", video_duration=540)
        ch3 = get_or_create_chapter(db, c1.id, "第三章 面向对象", 3)
        get_or_create_lesson(db, ch3.id, "3.1 类与对象", 1, video_url="", video_duration=700)
        c1.chapter_count = 3
        get_or_create_package(db, c1.id, "标准班", 99, 199, "完整课程+源码", ["全套视频", "源码下载", "答疑群"])
        get_or_create_package(db, c1.id, "VIP陪跑班", 299, 499, "视频+1对1辅导", ["全套视频", "1对1答疑", "项目实战", "就业指导"])

        # 3.2 Web 前端
        c2 = get_or_create_course(
            db, "Vue3+TypeScript实战开发", "vue3-ts", web.id, t1.id,
            price=199, original_price=399, cover="",
            description="<p>系统学习Vue3组合式API与TypeScript，结合实战项目掌握现代前端开发。</p>",
            tags=["Vue", "TypeScript", "前端"], is_featured=True,
            student_count=860, rating=4.8, duration_hours=32,
        )
        ch = get_or_create_chapter(db, c2.id, "第一章 Vue3基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 响应式系统", 1, video_url="", video_duration=560)
        c2.chapter_count = 1
        get_or_create_package(db, c2.id, "标准班", 199, 399, "完整课程", ["全套视频", "源码"])

        # 3.3 机器学习
        c3 = get_or_create_course(
            db, "机器学习实战：从入门到项目", "ml-practice", ml.id, t2.id,
            price=299, original_price=599, cover="",
            description="<p>系统讲解机器学习核心算法，配合Kaggle实战项目，掌握建模全流程。</p>",
            tags=["机器学习", "算法", "实战"], is_recommended=True,
            student_count=720, rating=4.8, duration_hours=45,
        )
        ch = get_or_create_chapter(db, c3.id, "第一章 机器学习基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 什么是机器学习", 1, video_url="", video_duration=500)
        c3.chapter_count = 1
        get_or_create_package(db, c3.id, "标准班", 299, 599, "课程+数据集", ["全套视频", "数据集", "Notebook"])

        # 3.4 大模型应用
        c4 = get_or_create_course(
            db, "大模型应用开发实战", "llm-app", llm.id, t2.id,
            price=399, original_price=799, cover="",
            description="<p>基于LangChain等框架，开发大模型应用，涵盖RAG、Agent、提示工程。</p>",
            tags=["大模型", "LLM", "LangChain"], is_featured=True,
            student_count=1580, rating=4.9, duration_hours=52,
        )
        ch = get_or_create_chapter(db, c4.id, "第一章 大模型基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 大模型原理", 1, video_url="", video_duration=600)
        c4.chapter_count = 1
        get_or_create_package(db, c4.id, "标准班", 399, 799, "课程+源码", ["全套视频", "源码", "社区"])

        # 3.5 亚马逊运营
        c5 = get_or_create_course(
            db, "亚马逊开店与选品实战", "amazon-practice", amazon.id, t3.id,
            price=249, original_price=499, cover="",
            description="<p>从账号注册到选品、listing优化、广告投放，全流程掌握亚马逊运营。</p>",
            tags=["亚马逊", "跨境电商", "选品"], is_recommended=True,
            student_count=980, rating=4.7, duration_hours=38,
        )
        ch = get_or_create_chapter(db, c5.id, "第一章 开店准备", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 亚马逊账号注册", 1, video_url="", video_duration=540)
        c5.chapter_count = 1
        get_or_create_package(db, c5.id, "标准班", 249, 499, "课程+资料", ["全套视频", "运营模板"])

        # 3.6 Shopee 运营（免费公开课）
        c6 = get_or_create_course(
            db, "Shopee新手开店公开课", "shopee-free", shopee.id, t3.id,
            price=0, original_price=0, cover="",
            description="<p>免费公开课，了解Shopee平台规则与新手开店流程。</p>",
            tags=["Shopee", "免费", "公开课"], is_recommended=True,
            student_count=3200, rating=4.6, duration_hours=6,
        )
        ch = get_or_create_chapter(db, c6.id, "第一章 认识Shopee", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 Shopee平台介绍", 1, video_url="", video_duration=400, is_free=True)
        c6.chapter_count = 1

        # 3.7 Python 数据分析（数据分析分类）
        c7 = get_or_create_course(
            db, "Python数据分析实战", "python-data", data.id, t1.id,
            price=169, original_price=299, cover="",
            description="<p>使用Python进行数据清洗、分析和可视化，掌握Pandas、Matplotlib、NumPy三大库，完成真实业务数据分析项目。</p>",
            tags=["Python", "数据分析", "Pandas"], is_recommended=True,
            student_count=1100, rating=4.8, duration_hours=28,
            learning_goals=["掌握Python数据分析全流程", "熟练使用Pandas处理数据", "用Matplotlib制作可视化图表", "完成实战数据分析项目"],
            prerequisites=["有基础的Python语法知识"],
        )
        ch = get_or_create_chapter(db, c7.id, "第一章 数据分析基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 数据分析概述", 1, video_url="", video_duration=480)
        get_or_create_lesson(db, ch.id, "1.2 开发环境搭建", 2, video_url="", video_duration=520, is_free=True)
        ch = get_or_create_chapter(db, c7.id, "第二章 Pandas数据处理", 2)
        get_or_create_lesson(db, ch.id, "2.1 Series与DataFrame", 1, video_url="", video_duration=640)
        get_or_create_lesson(db, ch.id, "2.2 数据清洗", 2, video_url="", video_duration=700)
        ch = get_or_create_chapter(db, c7.id, "第三章 数据可视化", 3)
        get_or_create_lesson(db, ch.id, "3.1 Matplotlib基础", 1, video_url="", video_duration=560)
        c7.chapter_count = 3
        get_or_create_package(db, c7.id, "标准班", 169, 299, "课程+源码+数据", ["全套视频", "数据集", "源码"])

        # 3.8 React 全栈（Web前端分类）
        c8 = get_or_create_course(
            db, "React+Node全栈开发", "react-node", web.id, t1.id,
            price=259, original_price=499, cover="",
            description="<p>从零构建React前端 + Node.js后端全栈项目，掌握Hooks、Redux、Express、数据库集成等核心技术。</p>",
            tags=["React", "Node", "全栈"], is_featured=False, is_recommended=True,
            student_count=650, rating=4.7, duration_hours=40,
            learning_goals=["掌握React组件化开发", "理解Hooks与状态管理", "搭建Node后端服务", "完成全栈实战项目"],
            prerequisites=["了解HTML/CSS/JavaScript基础"],
        )
        ch = get_or_create_chapter(db, c8.id, "第一章 React基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 React简介与环境", 1, video_url="", video_duration=550)
        get_or_create_lesson(db, ch.id, "1.2 JSX与组件", 2, video_url="", video_duration=620, is_free=True)
        ch = get_or_create_chapter(db, c8.id, "第二章 Hooks与状态", 2)
        get_or_create_lesson(db, ch.id, "2.1 useState/useEffect", 1, video_url="", video_duration=680)
        ch = get_or_create_chapter(db, c8.id, "第三章 Node后端", 3)
        get_or_create_lesson(db, ch.id, "3.1 Express基础", 1, video_url="", video_duration=590)
        c8.chapter_count = 3
        get_or_create_package(db, c8.id, "标准班", 259, 499, "全栈课程", ["全套视频", "源码"])

        # 3.9 SQL数据库（数据分析分类）
        c9 = get_or_create_course(
            db, "SQL数据库从入门到精通", "sql-master", data.id, t1.id,
            price=129, original_price=249, cover="",
            description="<p>系统学习MySQL数据库，涵盖建表、查询、索引、优化、事务等核心内容，配套大量练习题。</p>",
            tags=["SQL", "数据库", "MySQL"], is_recommended=True,
            student_count=1500, rating=4.9, duration_hours=22,
            learning_goals=["掌握SQL增删改查", "理解数据库设计与索引", "学会查询性能优化", "掌握事务与锁机制"],
            prerequisites=["无，零基础可学"],
        )
        ch = get_or_create_chapter(db, c9.id, "第一章 SQL入门", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 数据库概念", 1, video_url="", video_duration=450)
        get_or_create_lesson(db, ch.id, "1.2 安装与建库", 2, video_url="", video_duration=520, is_free=True)
        ch = get_or_create_chapter(db, c9.id, "第二章 查询进阶", 2)
        get_or_create_lesson(db, ch.id, "2.1 多表查询", 1, video_url="", video_duration=720)
        get_or_create_lesson(db, ch.id, "2.2 子查询", 2, video_url="", video_duration=650)
        ch = get_or_create_chapter(db, c9.id, "第三章 索引与优化", 3)
        get_or_create_lesson(db, ch.id, "3.1 索引原理", 1, video_url="", video_duration=580)
        c9.chapter_count = 3
        get_or_create_package(db, c9.id, "标准班", 129, 249, "课程+练习题", ["全套视频", "练习题"])

        # 3.10 深度学习入门（机器学习分类）
        c10 = get_or_create_course(
            db, "深度学习入门实战", "dl-basic", ml.id, t2.id,
            price=349, original_price=699, cover="",
            description="<p>从神经网络原理讲起，使用PyTorch搭建CNN、RNN等模型，完成图像识别、文本分类等实战项目。</p>",
            tags=["深度学习", "PyTorch", "神经网络"], is_featured=True,
            student_count=890, rating=4.8, duration_hours=46,
            learning_goals=["理解神经网络基本原理", "掌握PyTorch开发流程", "搭建CNN/RNN模型", "完成深度学习实战项目"],
            prerequisites=["有Python基础", "了解机器学习基本概念"],
        )
        ch = get_or_create_chapter(db, c10.id, "第一章 神经网络基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 神经网络原理", 1, video_url="", video_duration=720)
        get_or_create_lesson(db, ch.id, "1.2 PyTorch入门", 2, video_url="", video_duration=680, is_free=True)
        ch = get_or_create_chapter(db, c10.id, "第二章 CNN卷积网络", 2)
        get_or_create_lesson(db, ch.id, "2.1 卷积原理", 1, video_url="", video_duration=760)
        ch = get_or_create_chapter(db, c10.id, "第三章 实战项目", 3)
        get_or_create_lesson(db, ch.id, "3.1 图像识别项目", 1, video_url="", video_duration=800)
        c10.chapter_count = 3
        get_or_create_package(db, c10.id, "标准班", 349, 699, "课程+代码", ["全套视频", "代码", "GPU环境指南"])

        # 3.11 Prompt工程（大模型分类）
        c11 = get_or_create_course(
            db, "Prompt提示词工程实战", "prompt-eng", llm.id, t2.id,
            price=199, original_price=399, cover="",
            description="<p>系统学习提示词工程方法论，掌握结构化Prompt设计、Few-shot、思维链等技术，提升大模型输出质量。</p>",
            tags=["Prompt", "提示词", "大模型"], is_recommended=True,
            student_count=2100, rating=4.9, duration_hours=16,
            learning_goals=["掌握Prompt设计原则", "学会Few-shot与思维链", "构建高效提示词模板", "提升AI应用效果"],
            prerequisites=["对AI工具有基本了解"],
        )
        ch = get_or_create_chapter(db, c11.id, "第一章 Prompt基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 什么是提示词", 1, video_url="", video_duration=420)
        get_or_create_lesson(db, ch.id, "1.2 Prompt设计原则", 2, video_url="", video_duration=560, is_free=True)
        ch = get_or_create_chapter(db, c11.id, "第二章 高级技巧", 2)
        get_or_create_lesson(db, ch.id, "2.1 Few-shot示例", 1, video_url="", video_duration=600)
        get_or_create_lesson(db, ch.id, "2.2 思维链CoT", 2, video_url="", video_duration=640)
        c11.chapter_count = 2
        get_or_create_package(db, c11.id, "标准班", 199, 399, "课程+模板", ["全套视频", "Prompt模板库"])

        # 3.12 亚马逊广告投放（亚马逊分类）
        c12 = get_or_create_course(
            db, "亚马逊广告投放实战", "amazon-ads", amazon.id, t3.id,
            price=329, original_price=599, cover="",
            description="<p>深度解析亚马逊PPC广告，掌握关键词投放、竞价策略、ACOS优化，用广告撬动销量增长。</p>",
            tags=["亚马逊", "广告", "PPC"], is_recommended=True,
            student_count=760, rating=4.7, duration_hours=30,
            learning_goals=["理解PPC广告机制", "掌握关键词策略", "学会ACOS优化", "搭建高效广告组"],
            prerequisites=["了解亚马逊基础运营"],
        )
        ch = get_or_create_chapter(db, c12.id, "第一章 广告基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 PPC广告机制", 1, video_url="", video_duration=560)
        get_or_create_lesson(db, ch.id, "1.2 广告结构搭建", 2, video_url="", video_duration=620, is_free=True)
        ch = get_or_create_chapter(db, c12.id, "第二章 投放优化", 2)
        get_or_create_lesson(db, ch.id, "2.1 关键词研究", 1, video_url="", video_duration=700)
        get_or_create_lesson(db, ch.id, "2.2 ACOS优化", 2, video_url="", video_duration=650)
        c12.chapter_count = 2
        get_or_create_package(db, c12.id, "标准班", 329, 599, "课程+工具", ["全套视频", "广告工具模板"])

        # 3.13 Shopee流量运营（Shopee分类）
        c13 = get_or_create_course(
            db, "Shopee店铺流量运营", "shopee-traffic", shopee.id, t3.id,
            price=219, original_price=399, cover="",
            description="<p>掌握Shopee站内流量获取与转化技巧，包括关键词优化、活动报名、粉丝运营等，快速提升店铺销量。</p>",
            tags=["Shopee", "流量", "运营"], is_recommended=True,
            student_count=680, rating=4.6, duration_hours=26,
            learning_goals=["掌握Shopee流量来源", "学会关键词优化", "熟悉平台活动玩法", "提升店铺转化率"],
            prerequisites=["了解Shopee基础操作"],
        )
        ch = get_or_create_chapter(db, c13.id, "第一章 流量基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 Shopee流量渠道", 1, video_url="", video_duration=540)
        get_or_create_lesson(db, ch.id, "1.2 搜索排名规则", 2, video_url="", video_duration=600, is_free=True)
        ch = get_or_create_chapter(db, c13.id, "第二章 运营提升", 2)
        get_or_create_lesson(db, ch.id, "2.1 关键词优化", 1, video_url="", video_duration=680)
        get_or_create_lesson(db, ch.id, "2.2 粉丝运营", 2, video_url="", video_duration=590)
        c13.chapter_count = 2
        get_or_create_package(db, c13.id, "标准班", 219, 399, "课程+资料", ["全套视频", "运营资料包"])

        # 3.14 短视频运营（新媒体运营分类）
        c14 = get_or_create_course(
            db, "短视频运营从0到1", "short-video-op", short_video.id, t1.id,
            price=189, original_price=329, cover="",
            description="<p>从账号定位、内容策划、拍摄剪辑到发布运营，系统掌握短视频账号从0到1的完整运营方法。</p>",
            tags=["短视频", "运营", "抖音"], is_recommended=True,
            student_count=1900, rating=4.7, duration_hours=24,
            learning_goals=["掌握账号定位与搭建", "学会内容策划方法", "掌握拍摄剪辑技巧", "了解流量变现路径"],
            prerequisites=["对短视频有兴趣，会用手机拍摄"],
        )
        ch = get_or_create_chapter(db, c14.id, "第一章 账号搭建", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 账号定位", 1, video_url="", video_duration=520)
        get_or_create_lesson(db, ch.id, "1.2 养号与基础设置", 2, video_url="", video_duration=480, is_free=True)
        ch = get_or_create_chapter(db, c14.id, "第二章 内容创作", 2)
        get_or_create_lesson(db, ch.id, "2.1 选题方法", 1, video_url="", video_duration=620)
        get_or_create_lesson(db, ch.id, "2.2 脚本撰写", 2, video_url="", video_duration=580)
        ch = get_or_create_chapter(db, c14.id, "第三章 运营变现", 3)
        get_or_create_lesson(db, ch.id, "3.1 涨粉策略", 1, video_url="", video_duration=560)
        get_or_create_lesson(db, ch.id, "3.2 变现方式", 2, video_url="", video_duration=540)
        c14.chapter_count = 3
        get_or_create_package(db, c14.id, "标准班", 189, 329, "课程+模板", ["全套视频", "选题模板"])

        # 3.15 直播带货（新媒体运营分类）
        c15 = get_or_create_course(
            db, "直播带货实战训练", "live-selling", live_sell.id, t1.id,
            price=299, original_price=599, cover="",
            description="<p>系统学习直播带货全流程，涵盖主播话术、选品策略、直播间搭建、流量承接与转化，从零到一跑通直播间。</p>",
            tags=["直播", "带货", "电商"], is_featured=True, is_recommended=True,
            student_count=1300, rating=4.8, duration_hours=32,
            learning_goals=["掌握直播话术技巧", "学会直播选品方法", "搭建高转化直播间", "理解流量投放逻辑"],
            prerequisites=["了解基本电商概念", "敢于出镜表达"],
        )
        ch = get_or_create_chapter(db, c15.id, "第一章 直播基础", 1, is_free=True)
        get_or_create_lesson(db, ch.id, "1.1 直播带货趋势", 1, video_url="", video_duration=520)
        get_or_create_lesson(db, ch.id, "1.2 账号与设备准备", 2, video_url="", video_duration=600, is_free=True)
        ch = get_or_create_chapter(db, c15.id, "第二章 主播与话术", 2)
        get_or_create_lesson(db, ch.id, "2.1 主播人设", 1, video_url="", video_duration=560)
        get_or_create_lesson(db, ch.id, "2.2 直播话术设计", 2, video_url="", video_duration=700)
        ch = get_or_create_chapter(db, c15.id, "第三章 直播间运营", 3)
        get_or_create_lesson(db, ch.id, "3.1 选品与排品", 1, video_url="", video_duration=640)
        get_or_create_lesson(db, ch.id, "3.2 流量投放", 2, video_url="", video_duration=680)
        c15.chapter_count = 3
        get_or_create_package(db, c15.id, "标准班", 299, 599, "课程+工具", ["全套视频", "话术模板", "选品表"])

        # ============ 4. Banner ============
        if not db.query(Banner).first():
            db.add_all([
                Banner(title="AI大模型实战训练营", image_url="", link_url="/courses/llm-app", position="home", sort_order=1),
                Banner(title="Python零基础入门", image_url="", link_url="/courses/python-basic", position="home", sort_order=2),
                Banner(title="跨境电商旺季选品", image_url="", link_url="/courses/amazon-practice", position="home", sort_order=3),
            ])

        # ============ 5. 直播 ============
        now = datetime.utcnow()
        if not db.query(LiveRoom).first():
            db.add_all([
                LiveRoom(title="AI大模型实战公开课", cover="", teacher_id=t2.id,
                         description="直播间分享大模型应用开发实战经验",
                         start_at=now + timedelta(hours=2), end_at=now + timedelta(hours=4),
                         status="upcoming", viewer_count=0),
                LiveRoom(title="Python就业指导直播", cover="", teacher_id=t1.id,
                         description="Python开发者就业前景与学习路线",
                         start_at=now + timedelta(days=1, hours=3), end_at=now + timedelta(days=1, hours=5),
                         status="upcoming", viewer_count=0),
            ])

        # ============ 6. 免费资料 ============
        if not db.query(FreeResource).first():
            db.add_all([
                FreeResource(title="Python入门学习手册", file_type="pdf", file_url="", icon="", download_count=120, sort_order=1),
                FreeResource(title="跨境电商选品模板", file_type="xlsx", file_url="", icon="", download_count=88, sort_order=2),
                FreeResource(title="AI工具使用指南", file_type="pdf", file_url="", icon="", download_count=150, sort_order=3),
            ])

        # ============ 7. 训练营 ============
        if not db.query(Bootcamp).first():
            db.add_all([
                Bootcamp(title="30天大模型应用开发训练营", cover="", description="系统学习大模型应用开发，完成实战项目",
                         teacher_id=t2.id, price=1999, original_price=2999,
                         max_students=50, enrolled_count=12,
                         start_at=now + timedelta(days=3), end_at=now + timedelta(days=33),
                         status="enrolling"),
                Bootcamp(title="跨境电商选品训练营", cover="", description="掌握科学选品方法，打造爆款产品",
                         teacher_id=t3.id, price=1499, original_price=2499,
                         max_students=40, enrolled_count=8,
                         start_at=now + timedelta(days=5), end_at=now + timedelta(days=35),
                         status="upcoming"),
            ])

        db.commit()

        # ============ 统计 ============
        print("[OK] 测试数据插入完成！")
        print(f"  分类: {db.query(Category).count()} 条")
        print(f"  讲师: {db.query(Teacher).count()} 条")
        print(f"  课程: {db.query(Course).count()} 条")
        print(f"  章节: {db.query(Chapter).count()} 条")
        print(f"  课时: {db.query(Lesson).count()} 条")
        print(f"  套餐: {db.query(CoursePackage).count()} 条")
        print(f"  Banner: {db.query(Banner).count()} 条")
        print(f"  直播: {db.query(LiveRoom).count()} 条")
        print(f"  免费资料: {db.query(FreeResource).count()} 条")
        print(f"  训练营: {db.query(Bootcamp).count()} 条")

        # ============ 测试用户（用于本地登录调试）============
        _ensure_test_users(db)
        print(f"  测试用户: {db.query(User).filter(User.nickname.in_(['testuser', 'demo138'])).count()} 条")

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        print("[FAIL] 插入失败，已回滚:", e)
    finally:
        db.close()


def _ensure_test_users(db):
    """创建用于本地登录调试的测试用户
    - demo138 / 13800000001 ：短信验证码登录（开发环境验证码为 123456）
    - testuser / password123 ：账号密码登录
    """
    test_users = [
        {
            "nickname": "demo138",
            "phone": "13800000001",
            "password": "Test@123456",  # 仅用于演示，生产环境请修改
            "role": "student",
        },
        {
            "nickname": "testuser",
            "phone": "13800000002",
            "password": "Test@123456",
            "role": "student",
        },
    ]
    for tu in test_users:
        user = db.query(User).filter(User.phone == tu["phone"]).first()
        if not user:
            user = User(
                nickname=tu["nickname"],
                phone=tu["phone"],
                password_hash=hash_password(tu["password"]),
                role=tu["role"],
                status="active",
            )
            db.add(user)
            print(f"  [新增测试用户] {tu['nickname']} / {tu['phone']} / 密码: {tu['password']}")
        else:
            # 已存在则更新密码为最新
            user.password_hash = hash_password(tu["password"])
            user.status = "active"
            print(f"  [更新测试用户] {tu['nickname']} / {tu['phone']} / 密码已重置为: {tu['password']}")


if __name__ == "__main__":
    main()

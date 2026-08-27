"""购物车相关路由"""
import logging
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List

from app.database import get_db
from app.models import User, Course, Cart, Enrollment, Order, OrderItem
from app.security import get_current_user
from app.payment import create_payment
from app.wechat_pay_v3 import wechat_pay_v3, WechatPayError


async def _wechat_pay(order_no, amount, subject, trade_type, client_ip) -> dict:
    """微信支付下单：优先 APIv3，未配置时回退 APIv2/模拟"""
    if wechat_pay_v3.configured:
        try:
            if trade_type in ("JSAPI", "MWEB"):
                r = await wechat_pay_v3.mweb_pay(order_no, amount, subject, client_ip=client_ip)
            else:
                r = await wechat_pay_v3.native_pay(order_no, amount, subject)
            r["jsapi_pay_params"] = None
            return {"method": "wechat", "api": "v3", **r}
        except WechatPayError as e:
            logger.error(f"微信APIv3下单失败: code={e.code} msg={e.message}")
            raise HTTPException(status_code=400, detail=f"微信下单失败({e.code}): {e.message}")
        except RuntimeError as e:
            logger.error(f"微信APIv3下单配置错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"微信APIv3下单异常: {e}")
            raise HTTPException(status_code=500, detail=f"微信支付暂时不可用: {e}")
    return create_payment(
        pay_method="wechat", order_no=order_no, amount=amount,
        subject=subject, client_ip=client_ip, trade_type=trade_type,
    )

router = APIRouter(prefix="/api/v1/cart", tags=["购物车"])
logger = logging.getLogger(__name__)


class CartCheckoutRequest(BaseModel):
    """购物车合并结算请求"""
    course_ids: List[int] = Field(..., min_length=1, description="要结算的课程ID列表")
    pay_method: str = Field(default="wechat", pattern=r"^(wechat|alipay)$")
    return_url: str = ""
    trade_type: str = "NATIVE"


def _cart_item_dict(cart: Cart) -> dict:
    """购物车条目 + 课程信息"""
    c = cart.course
    return {
        "id": cart.id,
        "course_id": c.id,
        "title": c.title,
        "cover": c.cover,
        "price": float(c.price),
        "original_price": float(c.original_price),
        "slug": c.slug,
        "difficulty": c.difficulty,
        "student_count": c.student_count,
        "course_type": c.course_type,
        "added_at": cart.created_at.isoformat() if cart.created_at else "",
    }


@router.get("", summary="获取购物车列表")
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户购物车（需要登录）"""
    items = (
        db.query(Cart)
        .options(joinedload(Cart.course))
        .filter(Cart.user_id == current_user.id)
        .order_by(desc(Cart.created_at))
        .all()
    )
    # 过滤已下架/已购买课程
    valid_items = []
    for cart in items:
        if not cart.course:
            continue
        if cart.course.status != "published":
            continue
        # 已购买则从购物车移除
        enrolled = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == cart.course_id,
        ).first()
        if enrolled:
            db.delete(cart)
            db.commit()
            continue
        valid_items.append(cart)

    total_price = sum(float(cart.course.price) for cart in valid_items)
    return {
        "items": [_cart_item_dict(cart) for cart in valid_items],
        "total": len(valid_items),
        "total_price": total_price,
    }


@router.post("", summary="加入购物车")
async def add_to_cart(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """添加课程到购物车（需要登录）"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="课程未发布")

    # 已购买则提示
    enrolled = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()
    if enrolled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已购买该课程")

    # 已在购物车
    existing = db.query(Cart).filter(
        Cart.user_id == current_user.id,
        Cart.course_id == course_id,
    ).first()
    if existing:
        return {"message": "课程已在购物车中", "already_in_cart": True}

    cart = Cart(user_id=current_user.id, course_id=course_id)
    db.add(cart)
    db.commit()
    return {"message": "已加入购物车", "already_in_cart": False}


@router.delete("/{course_id}", summary="从购物车移除")
async def remove_from_cart(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从购物车移除课程"""
    cart = db.query(Cart).filter(
        Cart.user_id == current_user.id,
        Cart.course_id == course_id,
    ).first()
    if not cart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="购物车中不存在该课程")
    db.delete(cart)
    db.commit()
    return {"message": "已移除"}


@router.delete("", summary="清空购物车")
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """清空购物车（结算后调用）"""
    db.query(Cart).filter(Cart.user_id == current_user.id).delete()
    db.commit()
    return {"message": "购物车已清空"}


class CartCheckoutRequest(BaseModel):
    """购物车合并结算请求"""
    course_ids: List[int] = Field(..., min_length=1, description="要结算的课程ID列表")
    pay_method: str = Field(default="wechat", pattern=r"^(wechat|alipay)$")
    return_url: str = ""
    trade_type: str = "NATIVE"


@router.post("/checkout", summary="购物车合并结算（多课程合并成一个订单）")
async def cart_checkout(
    req: CartCheckoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从购物车选中课程合并结算：多门课程合并成一个订单并发起支付（需登录）。"""
    if not req.course_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请选择要结算的课程")

    valid_items = []  # (course, price)
    total_amount = Decimal("0.00")

    for cid in dict.fromkeys(req.course_ids):
        cart = db.query(Cart).filter(
            Cart.user_id == current_user.id,
            Cart.course_id == cid,
        ).first()
        course = db.query(Course).filter(Course.id == cid).first()
        if not course or course.status != "published":
            continue
        # 已购买则移除
        enrolled = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == cid,
        ).first()
        if enrolled:
            if cart:
                db.delete(cart)
            continue
        valid_items.append((course, course.price))
        total_amount += course.price

    if not valid_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="所选课程均已购买或不存在")

    # 合并为一个订单
    order_no = f"TY{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
    primary_course = valid_items[0][0]
    subject = primary_course.title if len(valid_items) == 1 else f"{primary_course.title} 等 {len(valid_items)} 门课程"

    order = Order(
        order_no=order_no,
        user_id=current_user.id,
        course_id=primary_course.id,
        amount=total_amount,
        pay_method=req.pay_method,
        pay_status="pending",
    )
    db.add(order)
    db.flush()

    for course, price in valid_items:
        db.add(OrderItem(
            order_id=order.id,
            course_id=course.id,
            course_title=course.title,
            course_cover=course.cover or "",
            price=price,
        ))

    # 全免费：直接开通全部
    if total_amount == 0:
        order.pay_status = "paid"
        order.paid_at = datetime.utcnow()
        for course, _price in valid_items:
            existing = db.query(Enrollment).filter(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course.id,
            ).first()
            if not existing:
                db.add(Enrollment(user_id=current_user.id, course_id=course.id, enrolled_at=datetime.utcnow()))
                course.student_count += 1
        # 结算后移除购物车
        for cid in req.course_ids:
            cart = db.query(Cart).filter(Cart.user_id == current_user.id, Cart.course_id == cid).first()
            if cart:
                db.delete(cart)
        db.commit()
        return {
            "order_no": order_no,
            "amount": str(total_amount),
            "pay_method": "free",
            "status": "paid",
            "course_ids": [c.id for c, _p in valid_items],
            "message": "课程开通成功",
        }

    # 发起支付
    client_ip = request.client.host if request.client else "127.0.0.1"
    if req.pay_method == "wechat":
        pay_result = await _wechat_pay(
            order_no, total_amount, subject,
            trade_type=req.trade_type or "NATIVE",
            client_ip=client_ip,
        )
    else:
        pay_result = create_payment(
            pay_method=req.pay_method,
            order_no=order_no,
            amount=total_amount,
            subject=subject,
            return_url=req.return_url,
            client_ip=client_ip,
            trade_type=req.trade_type or "NATIVE",
        )

    order.code_url = pay_result.get("code_url", "") or ""
    order.pay_url = pay_result.get("pay_url", "") or ""
    order.mweb_url = pay_result.get("mweb_url", "") or ""

    # 结算后移除已下单的购物车课程
    for cid in req.course_ids:
        cart = db.query(Cart).filter(Cart.user_id == current_user.id, Cart.course_id == cid).first()
        if cart:
            db.delete(cart)

    db.commit()
    db.refresh(order)

    return {
        "order_no": order_no,
        "amount": str(total_amount),
        "pay_method": req.pay_method,
        "status": "pending",
        "course_ids": [c.id for c, _p in valid_items],
        "course_titles": [c.title for c, _p in valid_items],
        **pay_result,
    }

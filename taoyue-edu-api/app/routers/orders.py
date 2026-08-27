"""订单和支付相关路由"""
import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
from app.models import User, Course, Order, OrderItem, Enrollment, CoursePackage
from app.schemas import CreateOrderRequest, CreateBatchOrderRequest, OrderResponse
from app.security import get_current_user
from app.payment import create_payment, wechat_pay, alipay
from app.wechat_pay_v3 import wechat_pay_v3, WechatPayError
from app.config import get_settings

router = APIRouter(prefix="/api/v1/orders", tags=["订单"])
settings = get_settings()
logger = logging.getLogger(__name__)


def generate_order_no() -> str:
    """生成订单号"""
    return f"TY{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"


async def _create_wechat_payment(
    order_no: str,
    amount,
    subject: str,
    trade_type: str = "NATIVE",
    client_ip: str = "127.0.0.1",
) -> Dict:
    """统一微信支付下单入口。

    优先使用 APIv3（企业级）；当 v3 配置未就绪时，回退到 APIv2/模拟支付，
    保证本地开发流程不中断。
    """
    if wechat_pay_v3.configured:
        try:
            if trade_type in ("JSAPI", "MWEB"):
                # H5 支付：手机浏览器拉起微信
                result = await wechat_pay_v3.mweb_pay(
                    order_no, amount, subject, client_ip=client_ip
                )
                result["jsapi_pay_params"] = None
                return {"method": "wechat", "api": "v3", **result}
            # NATIVE 扫码（默认）
            result = await wechat_pay_v3.native_pay(order_no, amount, subject)
            return {"method": "wechat", "api": "v3", **result}
        except WechatPayError as e:
            # 微信返回业务错误（如 APPID_MCHID_NOT_MATCH），转为可读的 400 给前端
            logger.error(f"微信APIv3下单失败: code={e.code} msg={e.message}")
            raise HTTPException(
                status_code=400,
                detail=f"微信下单失败({e.code}): {e.message}",
            )
        except RuntimeError as e:
            logger.error(f"微信APIv3下单配置错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"微信APIv3下单异常: {e}")
            raise HTTPException(status_code=500, detail=f"微信支付暂时不可用: {e}")
    else:
        logger.warning("微信 APIv3 未配置，回退到 APIv2/模拟支付")
        # 回退到原 create_payment（内部会走 APIv2 或模拟）
        result = create_payment(
            pay_method="wechat",
            order_no=order_no,
            amount=amount,
            subject=subject,
            client_ip=client_ip,
            trade_type=trade_type,
        )
        return {"method": "wechat", "api": "v2", **result}


@router.post("", summary="创建订单并发起支付")
async def create_order(
    req: CreateOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建订单并发起支付（需要登录）"""
    # 验证课程
    course = db.query(Course).filter(Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="课程未发布")

    # 确定金额
    amount = course.price
    subject = course.title
    package_id = None
    if req.package_id:
        pkg = db.query(CoursePackage).filter(
            CoursePackage.id == req.package_id,
            CoursePackage.course_id == req.course_id,
        ).first()
        if not pkg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="套餐不存在")
        amount = pkg.price
        subject = f"{course.title} - {pkg.name}"
        package_id = pkg.id

    # 检查是否已购买
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == req.course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="您已购买该课程")

    # 创建订单
    order_no = generate_order_no()
    order = Order(
        order_no=order_no,
        user_id=current_user.id,
        course_id=req.course_id,
        package_id=package_id,
        amount=amount,
        pay_method=req.pay_method,
        pay_status="pending",
    )
    db.add(order)
    # 先 flush 拿到订单 ID，再写订单明细（单课程也写入，统一通过 items 结算/查询）
    db.flush()
    db.add(OrderItem(
        order_id=order.id,
        course_id=req.course_id,
        course_title=course.title,
        course_cover=course.cover or "",
        price=amount,
    ))
    db.commit()
    db.refresh(order)

    # 免费课程直接开通
    if amount == 0:
        order.pay_status = "paid"
        order.paid_at = datetime.utcnow()
        enrollment = Enrollment(
            user_id=current_user.id,
            course_id=req.course_id,
            package_id=package_id,
            enrolled_at=datetime.utcnow(),
        )
        db.add(enrollment)
        course.student_count += 1
        db.commit()
        return {
            "order_no": order_no,
            "amount": str(amount),
            "pay_method": "free",
            "status": "paid",
            "message": "课程开通成功",
        }

    # 发起真实支付（未配置商户参数时自动降级为模拟）
    client_ip = request.client.host if request.client else "127.0.0.1"
    if req.pay_method == "wechat":
        pay_result = await _create_wechat_payment(
            order_no, amount, subject,
            trade_type=req.trade_type or "NATIVE",
            client_ip=client_ip,
        )
    else:
        pay_result = create_payment(
            pay_method=req.pay_method,
            order_no=order_no,
            amount=amount,
            subject=subject,
            return_url=req.return_url,
            client_ip=client_ip,
            trade_type=req.trade_type or "NATIVE",
        )

    # 把支付链接存到订单记录（详情接口直接读取，避免重复生成交易单）
    order.code_url = pay_result.get("code_url", "") or ""
    order.pay_url = pay_result.get("pay_url", "") or ""
    order.mweb_url = pay_result.get("mweb_url", "") or ""
    db.commit()
    db.refresh(order)

    return {
        "order_no": order_no,
        "amount": str(amount),
        "pay_method": req.pay_method,
        "status": "pending",
        **pay_result,
    }


@router.post("/batch", summary="合并下单（多课程合并成一个订单）")
async def create_batch_order(
    req: CreateBatchOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """多门课程合并成一个订单并发起支付（需要登录）。"""
    if not req.course_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请选择要结算的课程")

    valid_items = []  # (course, price, package_id)
    total_amount = Decimal("0.00")

    for cid in dict.fromkeys(req.course_ids):  # 去重
        course = db.query(Course).filter(Course.id == cid).first()
        if not course or course.status != "published":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="部分课程不存在或已下架")
        # 已购买则跳过
        existing = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == cid,
        ).first()
        if existing:
            continue
        valid_items.append((course, course.price, None))
        total_amount += course.price

    if not valid_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="所选课程均已购买")

    # 生成合并订单
    order_no = generate_order_no()
    primary_course = valid_items[0][0]
    subject = primary_course.title if len(valid_items) == 1 else f"{primary_course.title} 等 {len(valid_items)} 门课程"

    order = Order(
        order_no=order_no,
        user_id=current_user.id,
        course_id=primary_course.id,
        package_id=None,
        amount=total_amount,
        pay_method=req.pay_method,
        pay_status="pending",
    )
    db.add(order)
    db.flush()

    # 写订单明细
    for course, price, _pkg in valid_items:
        db.add(OrderItem(
            order_id=order.id,
            course_id=course.id,
            course_title=course.title,
            course_cover=course.cover or "",
            price=price,
        ))

    # 若全是免费课程：直接全部开通
    if total_amount == 0:
        order.pay_status = "paid"
        order.paid_at = datetime.utcnow()
        for course, _price, _pkg in valid_items:
            existing = db.query(Enrollment).filter(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course.id,
            ).first()
            if not existing:
                db.add(Enrollment(
                    user_id=current_user.id,
                    course_id=course.id,
                    enrolled_at=datetime.utcnow(),
                ))
                course.student_count += 1
        db.commit()
        return {
            "order_no": order_no,
            "amount": str(total_amount),
            "pay_method": "free",
            "status": "paid",
            "course_ids": [c.id for c, _p, _pg in valid_items],
            "message": "课程开通成功",
        }

    # 发起真实支付（未配置商户参数时自动降级为模拟）
    client_ip = request.client.host if request.client else "127.0.0.1"
    if req.pay_method == "wechat":
        pay_result = await _create_wechat_payment(
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
    db.commit()
    db.refresh(order)

    return {
        "order_no": order_no,
        "amount": str(total_amount),
        "pay_method": req.pay_method,
        "status": "pending",
        "course_ids": [c.id for c, _p, _pg in valid_items],
        "course_titles": [c.title for c, _p, _pg in valid_items],
        **pay_result,
    }


@router.get("", summary="获取用户订单列表")
async def get_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的订单列表"""
    query = db.query(Order).filter(Order.user_id == current_user.id)
    if status:
        query = query.filter(Order.pay_status == status)

    total = query.count()
    orders = (
        query
        .options(joinedload(Order.items))
        .order_by(desc(Order.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for order in orders:
        # 优先读取订单明细（合并订单），单课程订单也写入了一条明细
        oi = order.items if order.items else None
        if oi:
            course_titles = [i.course_title for i in oi if i.course_title]
            course_covers = [i.course_cover for i in oi if i.course_cover]
            first_cover = course_covers[0] if course_covers else ""
        else:
            course = db.query(Course).filter(Course.id == order.course_id).first()
            course_titles = [course.title] if course else []
            first_cover = course.cover if course else ""
        course_title = " + ".join(course_titles) if course_titles else "课程订单"
        items.append({
            "id": order.id,
            "order_no": order.order_no,
            "amount": str(order.amount),
            "pay_method": order.pay_method,
            "pay_status": order.pay_status,
            "course_title": course_title,
            "course_cover": first_cover,
            "course_titles": course_titles,
            "course_count": len(course_titles),
            "created_at": order.created_at.isoformat(),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


@router.get("/{order_no}", summary="查询订单详情")
async def get_order_detail(
    order_no: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询订单详情"""
    order = db.query(Order).filter(
        Order.order_no == order_no,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")

    course = db.query(Course).filter(Course.id == order.course_id).first()
    package = db.query(CoursePackage).filter(CoursePackage.id == order.package_id).first() if order.package_id else None
    subject = (course.title if course else "课程") + (f" - {package.name}" if package else "")

    # 订单明细（支持合并订单多课程）
    order_items = []
    if order.items:
        order_items = [{
            "course_id": i.course_id,
            "course_title": i.course_title,
            "course_cover": i.course_cover,
            "price": str(i.price),
        } for i in order.items]
    course_titles = [i["course_title"] for i in order_items] or ([course.title] if course else [])

    resp = {
        "id": order.id,
        "order_no": order.order_no,
        "amount": str(order.amount),
        "pay_method": order.pay_method,
        "pay_status": order.pay_status,
        "transaction_id": order.transaction_id or "",
        "course_title": course.title if course else "",
        "course_titles": course_titles,
        "course_cover": course.cover if course else "",
        "slug": course.slug if course else "",
        "items": order_items,
        "created_at": order.created_at.isoformat(),
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "refund_amount": str(order.refund_amount) if order.refund_amount else "0",
        "refund_at": order.refund_at.isoformat() if order.refund_at else None,
        # 直接读取 create_order 时存储的支付链接（避免重复生成交易单）
        "code_url": order.code_url or "",
        "pay_url": order.pay_url or "",
        "mweb_url": order.mweb_url or "",
        "jsapi_pay_params": None,
    }

    # 待支付的微信订单：主动向微信查询订单状态做对账（防漏单/补单）
    if order.pay_status == "pending" and order.pay_method == "wechat" and wechat_pay_v3.configured:
        try:
            wx_order = await wechat_pay_v3.query_order(order.order_no)
            if wx_order and wx_order.get("trade_state") == "SUCCESS":
                # 微信侧已支付但回调未到/丢失，主动补单
                transaction_id = wx_order.get("transaction_id", "")
                paid_total = wx_order.get("amount", {}).get("payer_total")
                paid_amount = Decimal(paid_total) / 100 if paid_total else None
                _complete_order(db, order.order_no, transaction_id, "wechat", paid_amount)
                resp["pay_status"] = "paid"
                resp["paid_at"] = datetime.utcnow().isoformat()
        except Exception as e:
            logger.warning(f"主动查询微信订单状态失败: order_no={order.order_no}, err={e}")
        resp["jsapi_pay_params"] = None

    return resp


# ==================== 企业级能力：关单 / 退款 / 同步 ====================

@router.post("/{order_no}/close", summary="关闭未支付订单")
async def close_order(
    order_no: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """关闭待支付订单（同步调用微信关单，防止重复支付）。"""
    order = db.query(Order).filter(
        Order.order_no == order_no,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.pay_status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅待支付订单可关闭")

    # 调微信关闭（APIv3），失败不阻塞本地关单，但记录日志
    if order.pay_method == "wechat" and wechat_pay_v3.configured:
        try:
            await wechat_pay_v3.close_order(order_no)
        except WechatPayError as e:
            logger.warning(f"微信关单失败: order_no={order_no}, code={e.code}, msg={e.message}")
            # 订单可能已支付，先查询确认
            try:
                wx = await wechat_pay_v3.query_order(order_no)
                if wx and wx.get("trade_state") == "SUCCESS":
                    _complete_order(db, order_no, wx.get("transaction_id", ""), "wechat")
                    return {"order_no": order_no, "pay_status": "paid", "message": "订单已支付，无法关闭"}
            except Exception:
                pass
        except Exception as e:
            logger.error(f"微信关单异常: order_no={order_no}, err={e}")

    order.pay_status = "cancelled"
    db.commit()
    return {"order_no": order_no, "pay_status": "cancelled", "message": "订单已关闭"}


@router.post("/{order_no}/refund", summary="申请退款")
async def refund_order(
    order_no: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """已支付订单退款（微信 APIv3 全额退款）。"""
    order = db.query(Order).filter(
        Order.order_no == order_no,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")
    if order.pay_status != "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅已支付订单可退款")
    if order.refund_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该订单已退款")

    refund_no = f"RF{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    if order.pay_method == "wechat":
        if not wechat_pay_v3.configured:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="微信支付未配置，无法退款")
        try:
            result = await wechat_pay_v3.refund(
                order_no=order_no,
                refund_no=refund_no,
                refund_amount=order.amount,
                order_amount=order.amount,
                reason="用户申请退款",
                notify_url=settings.WECHAT_PAY_REFUND_NOTIFY_URL or "",
            )
        except WechatPayError as e:
            raise HTTPException(status_code=400, detail=f"退款申请失败: {e.message}")
        refund_status = result.get("status", "PROCESSING")
    elif order.pay_method == "alipay":
        if not alipay.configured:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="支付宝未配置，无法退款")
        try:
            result = alipay.refund(
                order_no=order_no,
                refund_no=refund_no,
                refund_amount=order.amount,
                reason="用户申请退款",
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"退款申请失败: {e}")
        refund_status = result.get("refund_status", "PROCESSING")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前支付方式不支持在线退款")

    order.pay_status = "refunded"
    order.refund_no = refund_no
    order.refund_amount = order.amount
    order.refund_at = datetime.utcnow()
    db.commit()

    # 撤销选课记录（可选：用户不再拥有该课程）
    if order.items:
        for item in order.items:
            enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == order.user_id,
                Enrollment.course_id == item.course_id,
            ).first()
            if enrollment:
                db.delete(enrollment)
    elif order.course_id:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == order.user_id,
            Enrollment.course_id == order.course_id,
        ).first()
        if enrollment:
            db.delete(enrollment)
    db.commit()

    return {
        "order_no": order_no,
        "refund_no": refund_no,
        "refund_status": refund_status,
        "message": "退款申请已提交",
    }


@router.post("/{order_no}/sync", summary="主动同步订单状态（对账）")
async def sync_order(
    order_no: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """主动向支付平台（微信/支付宝）查询订单状态并同步本地（防漏单/补单）。"""
    order = db.query(Order).filter(
        Order.order_no == order_no,
        Order.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="订单不存在")

    if order.pay_status != "pending":
        return {
            "order_no": order_no,
            "pay_status": order.pay_status,
            "changed": False,
        }

    trade_state = ""
    changed = False

    if order.pay_method == "wechat":
        if not wechat_pay_v3.configured:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="微信支付未配置，无法同步")
        try:
            wx = await wechat_pay_v3.query_order(order_no)
            trade_state = wx.get("trade_state", "")
            if trade_state == "SUCCESS":
                paid_total = wx.get("amount", {}).get("payer_total")
                paid_amount = Decimal(paid_total) / 100 if paid_total else None
                _complete_order(db, order_no, wx.get("transaction_id", ""), "wechat", paid_amount)
                changed = True
            elif trade_state in ("CLOSED", "REVOKED", "PAYERROR"):
                order.pay_status = "cancelled"
                db.commit()
                changed = True
        except WechatPayError as e:
            raise HTTPException(status_code=400, detail=f"查询微信订单失败: {e.message}")

    elif order.pay_method == "alipay":
        if not alipay.configured:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="支付宝未配置，无法同步")
        try:
            al = alipay.query_order(order_no)
            trade_state = al.get("trade_status", "")
            if trade_state in ("TRADE_SUCCESS", "TRADE_FINISHED"):
                _complete_order(db, order_no, al.get("trade_no", ""), "alipay", None)
                changed = True
            elif trade_state == "WAIT_BUYER_PAY":
                pass  # 仍等待支付
            elif trade_state in ("TRADE_CLOSED",):
                order.pay_status = "cancelled"
                db.commit()
                changed = True
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"查询支付宝订单失败: {e}")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前订单不支持主动同步")

    return {
        "order_no": order_no,
        "trade_state": trade_state,
        "pay_status": order.pay_status,
        "changed": changed,
    }


def _parse_wechat_notify_xml(body: bytes) -> Dict:
    """解析微信回调 XML 为 dict"""
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(body)
        return {child.tag: (child.text or "") for child in root}
    except Exception as e:
        logger.error(f"解析微信回调 XML 失败: {e}")
        return {}


@router.post("/wechat/notify", summary="微信支付回调")
async def wechat_pay_notify(request: Request, db: Session = Depends(get_db)):
    """微信支付异步通知（无需登录，由微信服务器调用）。

    自动识别回调版本：
    - 微信支付 APIv3：JSON 报文（application/json），resource 加密，需验签+解密
    - 微信支付 APIv2：XML 报文（兼容旧订单/回退场景）
    """
    body = await request.body()
    content_type = request.headers.get("content-type", "")
    # v3 回调为 JSON，v2 回调为 XML；按首字符判断更可靠
    body_text = body.decode("utf-8", errors="replace").lstrip()

    if body_text.startswith("{"):
        # ---------- APIv3 回调 ----------
        return await _handle_wechat_v3_notify(request.headers, body, db)
    # ---------- APIv2 回调（兼容） ----------
    return _handle_wechat_v2_notify(body, db)


def _handle_wechat_v2_notify(body: bytes, db: Session):
    """处理微信 APIv2 XML 回调（兼容老订单）"""
    notify_data = _parse_wechat_notify_xml(body)
    if notify_data.get("return_code") != "SUCCESS":
        return Response(
            content=_wechat_notify_response(False), media_type="application/xml"
        )
    if not wechat_pay.verify_notify(notify_data):
        logger.warning(f"微信v2回调验签失败: {notify_data}")
        return Response(
            content=_wechat_notify_response(False), media_type="application/xml"
        )
    if notify_data.get("result_code") == "SUCCESS":
        order_no = notify_data.get("out_trade_no", "")
        transaction_id = notify_data.get("transaction_id", "")
        total_fee = notify_data.get("total_fee")
        paid_amount = None
        if total_fee:
            try:
                paid_amount = Decimal(int(total_fee)) / 100
            except (ValueError, TypeError):
                paid_amount = None
        _complete_order(db, order_no, transaction_id, "wechat", paid_amount)
    return Response(
        content=_wechat_notify_response(True), media_type="application/xml"
    )


def _notify_v3_success() -> Response:
    return Response(content=json.dumps({"code": "SUCCESS"}), media_type="application/json")


def _notify_v3_fail(reason: str = "FAIL") -> Response:
    return Response(content=json.dumps({"code": "FAIL", "message": reason}), media_type="application/json")


async def _handle_wechat_v3_notify(headers, body: bytes, db: Session):
    """处理微信 APIv3 JSON 回调：验签 + AES-GCM 解密 + 金额校验 + 幂等处理"""
    try:
        data = await wechat_pay_v3.parse_notify(dict(headers.items()), body)
    except Exception as e:
        logger.error(f"微信v3回调处理异常: {e}")
        return _notify_v3_fail("解析失败")

    if not data:
        return _notify_v3_fail("验签或解密失败")

    # 只处理支付成功事件
    if data.get("_event_type") != "TRANSACTION.SUCCESS":
        return _notify_v3_success()

    order_no = data.get("out_trade_no", "")
    transaction_id = data.get("transaction_id", "")
    # v3 回调金额单位为分
    total_fee = data.get("amount", {}).get("total")
    paid_amount = None
    if total_fee:
        try:
            paid_amount = Decimal(int(total_fee)) / 100
        except (ValueError, TypeError):
            paid_amount = None

    # 幂等：同一微信交易号/订单号重复回调直接返回成功，避免重复开通
    try:
        from app.redis_client import redis_client
        dedup_key = f"wxpay:notify:{order_no}"
        if redis_client.set(dedup_key, "1", nx=True, ex=3600):
            _complete_order(db, order_no, transaction_id, "wechat", paid_amount)
        else:
            logger.info(f"微信v3回调重复，已忽略: order_no={order_no}")
    except Exception as e:
        logger.error(f"Redis幂等异常，降级处理: order_no={order_no}, err={e}")
        _complete_order(db, order_no, transaction_id, "wechat", paid_amount)

    return _notify_v3_success()


@router.post("/alipay/notify", summary="支付宝支付回调")
async def alipay_pay_notify(request: Request, db: Session = Depends(get_db)):
    """支付宝异步通知（无需登录，由支付宝服务器调用）"""
    body = await request.body()
    notify_data = dict(parse_qsl(body.decode("utf-8")))

    # 验签
    if not alipay.verify_notify(notify_data):
        logger.warning(f"支付宝回调验签失败: {notify_data}")
        return Response(content="fail", media_type="text/plain")

    trade_status = notify_data.get("trade_status", "")
    if trade_status in ("TRADE_SUCCESS", "TRADE_FINISHED"):
        order_no = notify_data.get("out_trade_no", "")
        transaction_id = notify_data.get("trade_no", "")
        # 支付宝回调 total_amount 单位为元，直接用于金额校验
        paid_amount = notify_data.get("total_amount")
        if paid_amount:
            try:
                paid_amount = Decimal(paid_amount)
            except Exception:
                paid_amount = None
        _complete_order(db, order_no, transaction_id, "alipay", paid_amount)

    # 支付宝要求返回纯文本 "success"，不能是 JSON
    return Response(content="success", media_type="text/plain")


def _wechat_notify_response(success: bool) -> str:
    """构造微信回调应答 XML"""
    code = "SUCCESS" if success else "FAIL"
    msg = "OK" if success else "签名验证失败"
    return (
        "<xml>"
        f"<return_code><![CDATA[{code}]]></return_code>"
        f"<return_msg><![CDATA[{msg}]]></return_msg>"
        "</xml>"
    )


def _complete_order(
    db: Session,
    order_no: str,
    transaction_id: str,
    pay_method: str,
    paid_amount: Optional[Decimal] = None,
):
    """完成订单处理。

    paid_amount: 回调中的实际支付金额，用于金额校验（可选）。
    """
    order = db.query(Order).filter(Order.order_no == order_no).first()
    if not order or order.pay_status != "pending":
        return

    # 金额校验：防止回调金额与订单金额不一致
    if paid_amount is not None:
        try:
            paid = Decimal(str(paid_amount))
        except Exception:
            paid = Decimal(0)
        if paid != Decimal(order.amount):
            logger.error(
                f"回调金额不一致，拒绝处理: order_no={order_no}, "
                f"订单金额={order.amount}, 回调金额={paid}"
            )
            return

    order.pay_status = "paid"
    order.transaction_id = transaction_id
    order.paid_at = datetime.utcnow()

    # 确定该订单涉及的所有课程（合并订单读明细，单课程回退到 course_id）
    course_ids = []
    if order.items:
        course_ids = [i.course_id for i in order.items]
    elif order.course_id:
        course_ids = [order.course_id]

    # 为每门课创建选课记录（已购跳过），并更新课程学生数
    for cid in course_ids:
        existing = db.query(Enrollment).filter(
            Enrollment.user_id == order.user_id,
            Enrollment.course_id == cid,
        ).first()
        if existing:
            continue
        db.add(Enrollment(
            user_id=order.user_id,
            course_id=cid,
            package_id=order.package_id if cid == order.course_id else None,
            enrolled_at=datetime.utcnow(),
        ))
        course = db.query(Course).filter(Course.id == cid).first()
        if course:
            course.student_count += 1

    db.commit()


# ==================== 选课/学习记录 ====================

@router.get("/enrollments", summary="获取我的课程")
async def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的已选课程"""
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .filter(Enrollment.user_id == current_user.id)
        .order_by(desc(Enrollment.enrolled_at))
        .all()
    )
    return [
        {
            "id": e.id,
            "course_id": e.course_id,
            "course_title": e.course.title if e.course else "",
            "course_cover": e.course.cover if e.course else "",
            "progress": e.progress,
            "last_active_at": e.last_active_at.isoformat() if e.last_active_at else None,
            "enrolled_at": e.enrolled_at.isoformat(),
        }
        for e in enrollments
    ]


@router.post("/enrollments/{enrollment_id}/progress", summary="更新学习进度")
async def update_progress(
    enrollment_id: int,
    req: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新学习进度"""
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.user_id == current_user.id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="选课记录不存在")

    if "lesson_id" in req:
        raw = enrollment.completed_lessons or "[]"
        completed = json.loads(raw) if isinstance(raw, str) else (raw or [])
        if req["lesson_id"] not in completed:
            completed.append(req["lesson_id"])
        enrollment.completed_lessons = json.dumps(completed)
        enrollment.last_lesson_id = req["lesson_id"]

    if "progress" in req:
        enrollment.progress = req["progress"]

    enrollment.last_active_at = datetime.utcnow()
    db.commit()
    return {"message": "进度更新成功"}

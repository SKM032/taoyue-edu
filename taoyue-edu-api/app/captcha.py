"""图形验证码（防爬虫）

使用内存存储验证码文本（简单可靠，不依赖 Redis/DB）。
验证码 5 分钟有效，可配合发送短信时二次校验。
"""
import io
import random
import string
import time
import threading
from typing import Optional

# 内存存储：{ captcha_id: (text, expire_at) }
_captcha_store: dict[str, tuple[str, float]] = {}
_lock = threading.Lock()
_VALID_SECONDS = 300  # 5 分钟


def _generate_text(length: int = 4) -> str:
    """生成验证码文本（排除易混淆字符 0/O/1/I）"""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
    return "".join(random.choices(chars, k=length))


def _cleanup():
    """清理过期验证码"""
    now = time.time()
    expired = [k for k, (_, exp) in _captcha_store.items() if now > exp]
    for k in expired:
        _captcha_store.pop(k, None)


def create_captcha():
    """
    生成图形验证码。
    返回: (captcha_id, image_bytes, 调试文本)
    """
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

    width, height = 120, 40
    text = _generate_text()

    # 背景
    image = Image.new("RGB", (width, height), (245, 247, 250))
    draw = ImageDraw.Draw(image)

    # 干扰线
    for _ in range(5):
        x1, y1 = random.randint(0, width // 2), random.randint(0, height)
        x2, y2 = random.randint(width // 2, width), random.randint(0, height)
        draw.line([(x1, y1), (x2, y2)], fill=(random.randint(150, 200), random.randint(150, 200), random.randint(150, 200)), width=1)

    # 干扰点
    for _ in range(40):
        x, y = random.randint(0, width), random.randint(0, height)
        draw.point((x, y), fill=(random.randint(120, 180), random.randint(120, 180), random.randint(120, 180)))

    # 字符
    try:
        font = ImageFont.truetype("arial.ttf", 26)
    except Exception:
        font = ImageFont.load_default()

    char_width = width // (len(text) + 1)
    for i, ch in enumerate(text):
        x = char_width + i * char_width - 8
        y = random.randint(2, 8)
        color = (random.randint(30, 90), random.randint(30, 90), random.randint(90, 140))
        draw.text((x, y), ch, font=font, fill=color)

    # 微模糊
    image = image.filter(ImageFilter.SMOOTH)

    # 编码
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    image_bytes = buf.getvalue()

    # 存储
    captcha_id = "".join(random.choices(string.ascii_letters + string.digits, k=24))
    with _lock:
        _cleanup()
        _captcha_store[captcha_id] = (text, time.time() + _VALID_SECONDS)

    return captcha_id, image_bytes, text


def verify_captcha(captcha_id: Optional[str], text: Optional[str]) -> bool:
    """校验验证码（校验后立即失效，一次性）"""
    if not captcha_id or not text:
        return False
    with _lock:
        record = _captcha_store.pop(captcha_id, None)
    if not record:
        return False
    stored, expire_at = record
    if time.time() > expire_at:
        return False
    return stored.lower() == text.strip().lower()

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white/80" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1440px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* 品牌介绍 */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-white">桃悦智科</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              专注IT技能·AI全媒体·跨境电商的实战教育平台，已服务50000+学员实现职业进阶。
            </p>
            <div className="flex gap-3">
              {['微信', '微博', '知乎'].map((s, i) => (
                <span key={i} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs cursor-pointer hover:bg-[#00C4D4] transition-colors">{s[0]}</span>
              ))}
            </div>
          </div>

          {/* 热门赛道 */}
          <div>
            <h4 className="text-white font-semibold mb-4">热门赛道</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/it-academy" className="hover:text-[#00C4D4] transition-colors">IT技能学院</Link></li>
              <li><Link href="/ai-media" className="hover:text-[#00C4D4] transition-colors">AI全媒体运营</Link></li>
              <li><Link href="/cross-border" className="hover:text-[#00C4D4] transition-colors">跨境电商</Link></li>
              <li><Link href="/courses" className="hover:text-[#00C4D4] transition-colors">全部实战课程</Link></li>
              <li><Link href="/bootcamp" className="hover:text-[#00C4D4] transition-colors">训练营</Link></li>
            </ul>
          </div>

          {/* 关于我们 */}
          <div>
            <h4 className="text-white font-semibold mb-4">关于我们</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/about" className="hover:text-[#00C4D4] transition-colors">公司介绍</Link></li>
              <li><Link href="/teachers" className="hover:text-[#00C4D4] transition-colors">讲师团队</Link></li>
              <li><Link href="/join-us" className="hover:text-[#00C4D4] transition-colors">加入我们</Link></li>
            </ul>
          </div>

          {/* 联系我们（营业执照真实信息） */}
          <div>
            <h4 className="text-white font-semibold mb-4">联系我们</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2"><span className="text-[#00C4D4]">📞</span> 15175293089</li>
              <li className="flex items-center gap-2"><span className="text-[#00C4D4]">✉️</span> xinxt1024@163.com</li>
              <li className="flex items-center gap-2"><span className="text-[#00C4D4]">📍</span> 曲阳县桃悦智科软件开发中心</li>
            </ul>
          </div>

          {/* 客服二维码 */}
          <div className="text-center">
            <h4 className="text-white font-semibold mb-4">添加微信咨询</h4>
            <img
              src="/qrcode-wechat.jpg"
              alt="微信二维码"
              width={112}
              height={112}
              className="rounded-xl mx-auto"
            />
            <p className="text-xs text-white/40 mt-2">扫码添加客服微信</p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 text-center text-sm text-white/30">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <p>&copy; 2025 桃悦智科 TaoYue Tech. All rights reserved.</p>
            <div className="flex gap-6 items-center">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">隐私政策</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">服务协议</Link>
            </div>
          </div>
          {/* 备案信息单独一行 */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white/60 transition-colors"
            >
              冀ICP备2025130563号
            </a>
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=13063402000303"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white/60 transition-colors"
            >
              <img
                src="https://beian.mps.gov.cn/img/logo01.dd7ff50e.png"
                alt="公安备案"
                width={14}
                height={14}
                className="w-3.5 h-3.5 inline-block"
              />
              冀公网安备13063402000303号
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

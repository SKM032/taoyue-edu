import Link from 'next/link';
import { Icon } from '@iconify/react';

const sections = [
  {
    title: '一、引言',
    body: '桃悦智科教育平台（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们依据《中华人民共和国网络安全法》《中华人民共和国个人信息保护法》《中华人民共和国数据安全法》等法律法规制定本《隐私政策》，并采取相应的安全保护措施保护您的个人信息。\n\n我们致力于维持您对我们的信任，恪守以下原则保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最少够用原则、公开透明原则、确保安全原则、主体参与原则。\n\n请您在使用本平台服务前，仔细阅读并充分理解本政策。当您注册、登录或使用本平台服务时，即表示您已充分理解并同意本政策的全部内容。'
  },
  {
    title: '二、我们如何收集您的个人信息',
    body: '为向您提供本平台的各项服务，我们会在以下场景中收集您主动提供或在使用服务过程中产生的信息：\n\n2.1 账号信息：您注册或登录时提供的手机号码、昵称、头像等。手机号码是您登录本平台的凭证，我们将通过短信验证码验证您的身份。\n\n2.2 实名认证信息：如您购买课程或使用特定功能，我们可能收集您的姓名、身份证件信息（仅用于实名认证，依法加密存储）。\n\n2.3 订单与支付信息：您购买课程时产生的订单编号、购买课程、支付金额、支付方式（微信/支付宝）、支付状态、交易时间等信息。\n\n2.4 学习行为信息：您在本平台产生的课程浏览、观看进度、学习时长、收藏、笔记、作业提交、评价等学习行为数据。\n\n2.5 设备与日志信息：您使用本平台时，我们可能自动收集设备型号、操作系统、浏览器类型、IP地址、访问时间、访问页面等日志信息，用于保障服务安全与优化体验。\n\n2.6 您主动提供的信息：您在使用提问、咨询、意见反馈等功能时提供的内容。'
  },
  {
    title: '三、我们如何使用您的个人信息',
    body: '我们仅在为实现本平台服务目的所必需的范围内使用您的个人信息：\n\n3.1 提供核心服务：用于账号注册登录、课程开通与观看、订单处理与支付、学习进度同步等。\n\n3.2 账户与交易安全：用于身份验证、安全风控、异常检测，保障您与平台的合法权益。\n\n3.3 客服与售后：用于处理您的咨询、投诉、退款等请求。\n\n3.4 改善服务：在脱敏处理后，用于分析服务使用情况、优化课程内容与平台功能。\n\n3.5 依法合规：用于履行法律法规规定的义务，或响应司法机关、行政机关的合法要求。\n\n我们将仅在实现上述目的所必需的期限内保留您的个人信息，超出期限后将依法删除或匿名化处理。'
  },
  {
    title: '四、我们如何共享、转让、公开披露您的个人信息',
    body: '4.1 共享：我们不会向任何第三方出售您的个人信息。仅在以下情形下共享：\n（1）获得您的明确同意；\n（2）为提供支付服务，向微信支付、支付宝等第三方支付机构共享必要的订单与支付信息；\n（3）为完成实名认证，向合法存续的认证服务商共享必要的身份核验信息；\n（4）根据法律法规规定或应有权机关要求。\n\n4.2 转让：我们不会将您的个人信息转让给任何公司、组织或个人，但获得您明确同意，或发生合并、收购、破产清算等涉及个人信息转让的情形除外。\n\n4.3 公开披露：我们仅会在法律、法律程序、诉讼或政府主管部门强制要求时，依法公开披露您的个人信息。'
  },
  {
    title: '五、我们如何存储和保护您的个人信息',
    body: '5.1 存储地点与期限：您的个人信息将存储于中华人民共和国境内。我们仅在实现收集目的所必需的期限内保留您的个人信息，超出期限后将依法删除或匿名化处理。\n\n5.2 安全保护措施：\n（1）采用加密技术（如SSL/TLS传输加密、敏感字段加密存储）保护您的数据安全；\n（2）采用访问控制、权限管理、日志审计等措施防止未授权访问；\n（3）采用严格的内部管理制度与人员培训，明确个人信息保护职责；\n（4）建立应急响应机制，及时处理可能发生的信息安全事件。\n\n5.3 若不幸发生个人信息安全事件，我们将按照法律法规的要求，及时通过站内信、邮件、短信等适当方式向您告知，并视情况向主管部门报告。'
  },
  {
    title: '六、您的个人信息权利',
    body: '根据相关法律法规，您对您的个人信息享有以下权利：\n\n6.1 查阅、复制权：您有权查阅、复制您的个人信息。\n\n6.2 更正权：当您发现您的个人信息不准确、不完整时，有权要求更正或补充。\n\n6.3 删除权：在符合法律法规规定的情形下，您有权请求删除您的个人信息。\n\n6.4 撤回同意权：您有权撤回您对个人信息收集、使用的授权同意。撤回后，可能影响您使用本平台的相应功能。\n\n6.5 注销权：您有权申请注销您的账号。注销后，我们将依法删除或匿名化处理您的个人信息。\n\n您可以通过本政策"联系我们"部分的渠道行使上述权利，我们将在15个工作日内响应您的请求。'
  },
  {
    title: '七、未成年人保护',
    body: '本平台主要面向具有完全民事行为能力的成年人提供服务。若您为未满14周岁的儿童，未经监护人同意不得使用本平台服务。\n\n若您是未成年人的监护人，当您发现未成年人在未获您同意的情况下使用本平台并提供了个人信息时，请及时联系我们，我们将尽快删除相关个人信息。'
  },
  {
    title: '八、Cookie及同类技术的使用',
    body: '为提升您的使用体验，本平台可能使用Cookie及同类技术保存您的登录状态、浏览偏好等信息。您可以通过修改浏览器设置来管理或禁用Cookie，但可能会影响部分功能的正常使用。\n\n我们不会使用Cookie收集与您身份直接相关的敏感信息，也不会将Cookie用于本政策所述目的之外的用途。'
  },
  {
    title: '九、本政策的更新',
    body: '我们可能适时修订本政策。当本政策发生重大变更时，我们将在本平台显著位置发布变更通知，或通过其他适当方式向您告知。\n\n重大变更包括但不限于：\n（1）我们的服务模式发生重大变化，如处理个人信息的目的、类型、方式发生变化；\n（2）您参与个人信息处理的权利行使方式发生重大变化；\n（3）负责处理个人信息安全的部门及联系方式发生变化；\n（4）个人信息保护影响评估报告表明存在高风险情形。\n\n若您不同意修订后的政策，可停止使用本平台服务；继续使用的，视为同意修订后的政策。'
  },
  {
    title: '十、联系我们',
    body: '如您对本隐私政策或个人信息保护有任何疑问、意见或建议，或需要行使您的个人信息相关权利，可通过以下方式与我们联系：\n\n公司全称：曲阳县桃悦智科软件开发中心（统一社会信用代码：92130634MAEA468M01）\n经营场所：保定市曲阳县文德镇东河滩村水乐街水乐区110号\n\n我们将在收到您的反馈后15个工作日内予以回复。若您对我们的回复不满意，您还可以向有关监管部门投诉或举报。'
  },
];

const toc = sections.map((s, i) => ({ id: `sec-${i + 1}`, title: s.title }));

export default function PrivacyPage() {
  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 顶部装饰渐变 */}
      <div className="h-44 w-full" style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)' }} />

      <div className="max-w-[1100px] mx-auto px-6 -mt-20 relative pb-20">
        {/* 头部卡片 */}
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-[#E5E7EB] p-8 mb-6">
          <nav className="flex items-center gap-2 text-sm text-[#8B8BA0] mb-6">
            <Link href="/" className="hover:text-[#00C4D4] transition-colors">首页</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-[#1A1A2E] font-bold">隐私政策</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center shrink-0">
              <Icon icon="mdi:shield-lock-outline" className="w-7 h-7 text-[#6D28D9]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">桃悦智科教育平台隐私政策</h1>
              <p className="text-[#8B8BA0] text-sm">最后更新日期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 目录导航 */}
          <aside className="hidden lg:block sticky top-24">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
              <h3 className="font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
                <Icon icon="mdi:shield-account-outline" className="w-4 h-4 text-[#6D28D9]" />
                目录导航
              </h3>
              <ul className="space-y-1.5">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="block text-sm text-[#4A4A6A] hover:text-[#00C4D4] py-1.5 px-3 rounded-lg hover:bg-[#E0F7FA]/40 transition-colors leading-relaxed">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* 正文 */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 mb-5 text-sm text-[#4A4A6A] leading-relaxed">
              <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                <Icon icon="mdi:shield-check-outline" className="w-5 h-5 shrink-0" />
                <p>我们深知个人信息对您的重要性，将严格按照法律法规要求，以合法、正当、必要的原则收集和使用您的个人信息，并采取相应安全保护措施。</p>
              </div>
              {sections.map((sec, i) => (
                <section key={i} id={toc[i].id} className="mb-8 last:mb-0 scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-[#6D28D9]" />
                    {sec.title}
                  </h2>
                  <div className="whitespace-pre-line pl-3.5">{sec.body}</div>
                </section>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 text-center">
              <p className="text-sm text-[#8B8BA0] mb-4">感谢您阅读本隐私政策，我们将持续保障您的个人信息安全。</p>
              <Link href="/" className="inline-flex items-center gap-1 text-[#6D28D9] font-bold hover:underline">
                返回首页 <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

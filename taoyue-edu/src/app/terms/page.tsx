import Link from 'next/link';
import { Icon } from '@iconify/react';

const sections = [
  {
    title: '一、协议的确认与接纳',
    body: '欢迎您使用桃悦智科教育平台（以下简称"本平台"）。本平台由桃悦智科运营，为您提供在线课程学习、直播教学、训练营、学习资料下载、个性化辅导等服务（以下简称"本服务"）。\n\n您在使用本服务前，请务必仔细阅读并充分理解本《服务协议》（以下简称"本协议"）的全部内容，特别是免除或者限制责任的条款、争议解决和法律适用条款。当您点击"同意"或以任何方式注册、登录、使用本平台，即视为您已充分阅读、理解并同意接受本协议的全部内容，本协议即在您与本平台之间成立并发生法律效力。\n\n若您为未成年人或限制民事行为能力人，请在监护人陪同下阅读本协议，并在征得监护人同意后使用本服务。'
  },
  {
    title: '二、账号注册与安全',
    body: '2.1 您在注册本平台账号时，应提供真实、准确、完整、合法的个人信息（包括但不限于手机号码、昵称等）。您应保证不以虚假或冒用他人信息进行注册，否则本平台有权拒绝提供服务或注销相关账号。\n\n2.2 您注册成功后，应妥善保管您的账号、密码及手机验证码，并对使用该账号所进行的一切行为承担全部责任。因您保管不善造成的账号被盗、密码泄露等损失，由您自行承担。\n\n2.3 您的账号仅限本人使用，不得转让、出借、出租或赠与第三方，不得以任何方式售卖账号。如发现账号存在异常使用情况，本平台有权采取限制登录、冻结账号等措施。\n\n2.4 本平台提供的账号注册服务基于用户提供的信息。您授权本平台通过运营商或其他合法渠道核验您的身份信息。'
  },
  {
    title: '三、服务内容与范围',
    body: '3.1 本平台提供的服务包括但不限于：\n（1）在线视频课程、系统录播课；\n（2）直播公开课与直播答疑；\n（3）专项训练营、私教陪跑服务；\n（4）学习资料、文档、模板下载；\n（5）讲师一对一辅导、作业点评；\n（6）其他本平台后续上线的增值服务。\n\n3.2 本平台有权根据业务发展需要，对服务内容、功能模块进行更新、调整、升级或终止，并有权对收费服务的资费标准进行调整，但会通过站内公告、推送等方式提前告知。\n\n3.3 您购买课程后，可在约定的有效期内在限定设备上观看、学习。除本协议另有约定外，课程内容不得用于商业用途。'
  },
  {
    title: '四、付费与支付',
    body: '4.1 本平台部分课程为付费服务。您在购买前应仔细核对课程名称、套餐内容、价格、有效期等信息，并自愿选择支付方式（包括但不限于微信支付、支付宝等）。\n\n4.2 您应确保支付账户有足够余额或支付额度，并承担因支付失败或支付延迟导致的一切后果。支付过程中涉及的第三方支付服务的规则，适用相应第三方的服务协议。\n\n4.3 支付成功后，系统将为您开通相应的课程学习权限。具体到账时间以第三方支付渠道的结算时间为准。\n\n4.4 本平台在商品详情页明示价格，若价格标示错误或存在系统故障导致的异常低价，本平台有权在通知您后取消该笔订单并全额退款。'
  },
  {
    title: '五、退款政策',
    body: '5.1 付费课程（不含直播课、训练营、私教陪跑等定制类服务）：自支付成功之日起7日内，如您尚未观看课程内容超过20%，可申请无理由退款。\n\n5.2 直播课、训练营、私教陪跑等定制类服务：因涉及讲师排期与资源占用，一旦开课或讲师已提供相应服务，原则上不予退款。未开课且距离开课时间不少于72小时的，可申请退款。\n\n5.3 退款将在审核通过后3-7个工作日内，按原支付渠道原路退回，具体到账时间以支付渠道为准。\n\n5.4 以下情形不支持退款：\n（1）已超过退款期限；\n（2）已下载、复制、传播课程资料；\n（3）存在恶意刷课、转卖课程等违规行为；\n（4）您主动放弃学习且已过退款期限。'
  },
  {
    title: '六、用户行为规范',
    body: '6.1 您在使用本服务时，应遵守法律法规，不得从事以下行为：\n（1）利用本平台实施任何违法违规行为；\n（2）恶意注册、批量注册账号，或利用脚本、外挂等方式干扰平台正常运营；\n（3）传播危害国家安全、社会稳定的内容，或违反公序良俗的内容；\n（4）侵犯他人知识产权、商业秘密、个人隐私等合法权益；\n（5）未经授权抓取、爬取本平台数据，或对平台进行逆向工程、破解。\n\n6.2 如您违反上述规范，本平台有权视情节采取警示、限制功能、暂停或终止服务、注销账号等措施，并保留追究法律责任的权利。'
  },
  {
    title: '七、知识产权',
    body: '7.1 本平台及其课程内容（包括但不限于视频、音频、文字、图片、图表、软件、界面设计等）的知识产权归本平台及相应讲师所有，受《著作权法》等法律保护。\n\n7.2 未经本平台书面许可，您不得对本平台内容进行复制、改编、翻译、汇编、传播、出租、出售或以其他方式用于商业用途，不得移除或篡改相关权利标识。\n\n7.3 如您违反上述规定，本平台有权依法追究您的侵权责任，并要求赔偿因此造成的损失。'
  },
  {
    title: '八、免责声明',
    body: '8.1 您理解并同意，本平台服务按"现状"提供，本平台不保证服务永不中断、绝对稳定，亦不对第三方服务（如支付、网络运营商）的不稳定负责。\n\n8.2 因不可抗力（包括但不限于自然灾害、政府行为、网络故障、黑客攻击、系统升级维护）导致服务中断或数据丢失，本平台在合理范围内免责，但会尽最大努力尽快恢复。\n\n8.3 课程内容由讲师提供，本平台仅作为服务平台，不对讲师个人言论及第三方链接内容承担担保责任。'
  },
  {
    title: '九、协议变更与终止',
    body: '9.1 本平台有权根据业务变化修改本协议，修订后的协议将在本平台公告，并自公告之日起生效。若您不同意修订内容，可停止使用本服务；继续使用的，视为同意修订后的协议。\n\n9.2 您有权注销账号。注销后，您将无法使用本平台相关功能，本平台将依法删除或匿名化处理您的个人信息（法律法规另有规定或依据您签署的其他文件需保留的除外）。\n\n9.3 出现下列情形时，本平台有权终止或解除本协议：\n（1）您严重违反本协议约定；\n（2）您从事危害平台或其他用户合法权益的行为；\n（3）法律法规规定的其他情形。'
  },
  {
    title: '十、法律适用与争议解决',
    body: '10.1 本协议的订立、效力、解释、履行及争议解决均适用中华人民共和国法律。\n\n10.2 因本协议引起的或与本协议有关的争议，双方应首先友好协商解决；协商不成的，任何一方均可向本平台运营方所在地有管辖权的人民法院提起诉讼。\n\n10.3 本协议部分条款无效或不可执行的，不影响其他条款的效力。'
  },
  {
    title: '十一、联系我们',
    body: '如您对本协议有任何疑问、意见或建议，可通过以下方式与我们联系：\n\n公司全称：曲阳县桃悦智科软件开发中心（统一社会信用代码：92130634MAEA468M01）\n经营场所：保定市曲阳县文德镇东河滩村水乐街水乐区110号\n\n我们将在收到您的反馈后15个工作日内予以回复。'
  },
];

const toc = sections.map((s, i) => ({ id: `sec-${i + 1}`, title: s.title }));

export default function TermsPage() {
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
            <span className="text-[#1A1A2E] font-bold">服务协议</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center shrink-0">
              <Icon icon="mdi:file-document-check-outline" className="w-7 h-7 text-[#00C4D4]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1A1A2E] mb-2">桃悦智科教育平台服务协议</h1>
              <p className="text-[#8B8BA0] text-sm">最后更新日期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 目录导航 */}
          <aside className="hidden lg:block sticky top-24">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5">
              <h3 className="font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
                <Icon icon="mdi:format-list-numbered" className="w-4 h-4 text-[#00C4D4]" />
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
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <Icon icon="mdi:alert-circle-outline" className="w-5 h-5 shrink-0" />
                <p>【特别提示】本协议含有涉及您权益的重要条款，请务必仔细阅读，特别是免除或限制责任的条款。若您对本协议有任何疑问，可在使用前联系我们。</p>
              </div>
              {sections.map((sec, i) => (
                <section key={i} id={toc[i].id} className="mb-8 last:mb-0 scroll-mt-24">
                  <h2 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-[#00C4D4]" />
                    {sec.title}
                  </h2>
                  <div className="whitespace-pre-line pl-3.5">{sec.body}</div>
                </section>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 text-center">
              <p className="text-sm text-[#8B8BA0] mb-4">感谢您选择桃悦智科教育平台，祝您学习愉快，职业进阶！</p>
              <Link href="/" className="inline-flex items-center gap-1 text-[#00C4D4] font-bold hover:underline">
                返回首页 <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

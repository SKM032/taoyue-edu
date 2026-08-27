'use client';

import { Icon } from '@iconify/react';

export default function CooperationPage() {
  // 合作方向（基于真实经营范围）
  const directions = [
    {
      icon: 'mdi:teach',
      title: '讲师入驻',
      desc: '如果您是行业从业者或资深从业讲师，欢迎加入我们共同打磨实战型课程内容',
      color: 'from-[#00C4D4] to-[#06B6D4]',
    },
    {
      icon: 'mdi:office-building',
      title: '企业培训',
      desc: '基于经营范围中的"技术服务"，为有需要的团队提供定制化的技术培训方案',
      color: 'from-[#6D28D9] to-[#A78BFA]',
    },
    {
      icon: 'mdi:handshake',
      title: '项目合作',
      desc: '在软件开发、人工智能应用开发等范围内开展合法合规的项目级合作',
      color: 'from-[#059669] to-[#34D399]',
    },
  ];

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">商务合作</h1>
        <p className="text-lg text-[#8B8BA0]">携手桃悦智科，共建优质技术学习生态</p>
      </section>

      {/* 合作方向 */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {directions.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center hover:-translate-y-1 transition-all">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4`}>
                <Icon icon={item.icon} className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg text-[#1A1A2E]">{item.title}</h3>
              <p className="text-sm text-[#4A4A6A] mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 合作流程 */}
      <section className="bg-[#FAFAFA] py-12">
        <div className="max-w-[1440px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] text-center mb-8">合作流程</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: '提交意向', desc: '通过站内或邮件沟通需求' },
              { step: '02', title: '商务对接', desc: '1~3 个工作日内回复' },
              { step: '03', title: '方案制定', desc: '结合经营范围制定合规方案' },
              { step: '04', title: '签约启动', desc: '依法签约并开展合作' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#00C4D4] text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">{item.step}</div>
                <h3 className="font-bold text-[#1A1A2E]">{item.title}</h3>
                <p className="text-sm text-[#8B8BA0]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 联系我们（基于营业执照真实信息） */}
      <section className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] rounded-3xl p-8 lg:p-12 text-white">
          <div className="flex items-start gap-4 mb-6">
            <Icon icon="mdi:whatsapp" className="w-10 h-10 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-2">联系我们</h2>
              <p className="text-white/80">所有合作洽谈均在营业执照核准的经营范围内开展，请直接与我们取得联系。</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <ContactRow icon="mdi:office-building" label="公司全称" value="曲阳县桃悦智科软件开发中心" />
            <ContactRow icon="mdi:identifier" label="统一社会信用代码" value="92130634MAEA468M01" mono />
            <ContactRow icon="mdi:map-marker" label="经营场所" value="保定市曲阳县文德镇东河滩村水乐街水乐区110号" />
            <ContactRow icon="mdi:account-tie" label="经营者" value="兴兴涛" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
      <Icon icon={icon} className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-white/70 mb-1">{label}</div>
        <div className={`text-sm font-medium break-all ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
'use client';

import { Icon } from '@iconify/react';

export default function AboutPage() {
  // 公司真实工商信息（来源于营业执照）
  const company = {
    name: '曲阳县桃悦智科软件开发中心',
    type: '个体工商户',
    creditCode: '92130634MAEA468M01',
    legalPerson: '兴兴涛',
    registerDate: '2025年01月24日',
    address: '保定市曲阳县文德镇东河滩村水乐街水乐区110号',
    scope: '软件开发、人工智能应用软件开发、技术服务、技术开发、技术推广、信息系统咨询服务、互联网销售（除销售需要许可的商品）、内贸信息咨询服务',
  };

  // 联系信息
  const contactItems = [
    {
      icon: 'mdi:identifier',
      label: '统一社会信用代码',
      value: company.creditCode,
      mono: true,
    },
    {
      icon: 'mdi:calendar-clock',
      label: '注册日期',
      value: company.registerDate,
    },
    {
      icon: 'mdi:map-marker',
      label: '经营场所',
      value: company.address,
    },
    {
      icon: 'mdi:account-tie',
      label: '经营者',
      value: company.legalPerson,
    },
  ];

  // 经营许可展示（从经营范围提炼的核心领域）
  const capabilities = [
    {
      icon: 'mdi:code-tags',
      title: '软件开发',
      desc: '提供专业的定制化软件产品研发与服务',
      color: 'from-[#00C4D4] to-[#06B6D4]',
    },
    {
      icon: 'mdi:robot',
      title: '人工智能应用开发',
      desc: '聚焦大模型与机器学习等 AI 应用的落地研发',
      color: 'from-[#6D28D9] to-[#A78BFA]',
    },
    {
      icon: 'mdi:lifebuoy',
      title: '技术服务',
      desc: '面向客户的技术咨询、开发支持与培训服务',
      color: 'from-[#059669] to-[#34D399]',
    },
    {
      icon: 'mdi:storefront',
      title: '互联网销售',
      desc: '在许可范围内开展互联网商品销售业务',
      color: 'from-[#F59E0B] to-[#FBBF24]',
    },
  ];

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 头部 */}
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">关于我们</h1>
        <p className="text-lg text-[#8B8BA0]">{company.name}</p>
      </section>

      {/* 公司介绍 */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-md p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-4">企业简介</h2>
          <div className="space-y-4 text-[#4A4A6A] leading-relaxed">
            <p>{company.name}（统一社会信用代码：{company.creditCode}）是一家依法登记注册的个体工商户，于{company.registerDate}设立，专注于软件开发、人工智能应用软件开发及相关技术服务。</p>
            <p>桃悦智科致力于为学习者提供高品质、实战型的技术内容。我们围绕"让技术驱动每一位学习者的职业未来"这一使命，构建覆盖主流编程与AI领域的完整课程体系，帮助广大学习者从入门到进阶、从理论到实战，持续打磨专业技能。</p>
            <p>我们坚持合规经营，所有业务均在营业执照核定的经营范围内开展，依法接受相关部门监督。</p>
          </div>
        </div>
      </section>

      {/* 工商信息（营业执照公示） */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-md p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6">工商信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
            <InfoRow label="企业名称" value={company.name} />
            <InfoRow label="企业类型" value={company.type} />
            <InfoRow label="统一社会信用代码" value={company.creditCode} mono />
            <InfoRow label="经营者" value={company.legalPerson} />
            <InfoRow label="注册日期" value={company.registerDate} />
            <InfoRow label="经营场所" value={company.address} />
          </div>
          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            <div className="text-sm font-medium text-[#1A1A2E] mb-2">经营范围</div>
            <p className="text-sm text-[#4A4A6A] leading-relaxed">{company.scope}。</p>
          </div>
        </div>
      </section>

      {/* 联系我们 */}
      <section className="max-w-[1440px] mx-auto px-6 pb-12">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-md p-8 lg:p-12">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6">联系信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E7EB]">
                <div className="w-10 h-10 rounded-lg bg-[#00C4D4] text-white flex items-center justify-center flex-shrink-0">
                  <Icon icon={item.icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#8B8BA0] mb-1">{item.label}</div>
                  <div className={`text-sm text-[#1A1A2E] font-medium break-all ${item.mono ? 'font-mono' : ''}`}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 经营许可展示 */}
      <section className="bg-[#FAFAFA] py-12">
        <div className="max-w-[1440px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-8 text-center">经营许可范围</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center hover:-translate-y-1 transition-all">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center mx-auto mb-4`}>
                  <Icon icon={c.icon} className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-[#1A1A2E]">{c.title}</h3>
                <p className="text-sm text-[#4A4A6A] mt-2">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col py-3 border-b border-[#F3F4F6] md:border-b">
      <div className="text-xs text-[#8B8BA0] mb-1">{label}</div>
      <div className={`text-sm text-[#1A1A2E] font-medium break-all ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
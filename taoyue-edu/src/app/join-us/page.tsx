'use client';

import { Icon } from '@iconify/react';

export default function JoinUsPage() {
  const jobs = [
    { title: '高级前端工程师', dept: '技术部', location: '北京', type: '全职', tags: ['React', 'Next.js', 'TypeScript'] },
    { title: 'Go 后端工程师', dept: '技术部', location: '北京', type: '全职', tags: ['Go', '微服务', 'K8s'] },
    { title: '课程运营经理', dept: '运营部', location: '上海', type: '全职', tags: ['用户运营', '数据分析', '活动策划'] },
    { title: 'AI 内容创作讲师', dept: '教研部', location: '远程', type: '兼职', tags: ['ChatGPT', 'Midjourney', '内容创作'] },
  ];

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">加入我们</h1>
        <p className="text-lg text-[#8B8BA0]">与一群优秀的人，做有意义的事</p>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: 'mdi:rocket-launch', title: '快速成长', desc: '扁平化管理，与行业大牛并肩作战' },
            { icon: 'mdi:gift', title: '丰厚福利', desc: '五险一金、带薪年假、免费课程' },
            { icon: 'mdi:laptop', title: '远程办公', desc: '支持远程/混合办公，弹性工作' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E0F7FA] flex items-center justify-center mx-auto mb-3">
                <Icon icon={item.icon} className="w-7 h-7 text-[#00C4D4]" />
              </div>
              <h3 className="font-bold text-[#1A1A2E]">{item.title}</h3>
              <p className="text-sm text-[#8B8BA0] mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#FAFAFA] py-12">
        <div className="max-w-[1440px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6 text-center">热招岗位</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {jobs.map((job, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] hover:border-[#00C4D4] hover:-translate-y-1 transition-all flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#1A1A2E]">{job.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#8B8BA0] mt-1">
                    <span>{job.dept}</span>
                    <span>{job.location}</span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.tags.map((tag, j) => (
                    <span key={j} className="text-xs bg-[#E0F7FA] text-[#00C4D4] px-2 py-0.5 rounded-full font-medium">{tag}</span>
                  ))}
                  <button className="ml-2 px-4 py-1.5 rounded-lg bg-[#00C4D4] text-white font-bold text-sm hover:bg-[#009DA8] transition-colors">投递</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[#8B8BA0] text-sm mt-6">投递简历至 hr@taoyue.com</p>
        </div>
      </section>
    </div>
  );
}

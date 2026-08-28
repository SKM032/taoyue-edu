# Git 项目管理与阿里云生产部署完整实战教程

> 角色视角：8 年软件开发经验技术负责人  
> 适合人群：Git 零基础、刚进入团队开发流程、想搞懂“本地代码到底怎么一步步上线到生产”的开发者  
> 分支模型：`master` + `develop` + `feature/*` + `test` + `release/*` + `hotfix/*`  
> 部署示例：阿里云 ECS + Ubuntu 24.04 + Docker Compose + Nginx  
> 学习目标：从本地写代码开始，一直走到测试验收、生产发布、版本 Tag、回滚、线上 Hotfix

# 目录

## 第一篇：Git 基础与分支模型

1. 先搞懂代码从本地到生产到底经历了什么
2. 先分清 Git、远程仓库和服务器
3. 六类 Git 分支到底各自干什么
4. 第一次创建 Git 项目
5. 创建 `develop` 和 `test`
6. Feature 功能开发完整流程
7. Feature 合并到 develop
8. 从 develop 提交 test 测试分支
9. 测试发现 Bug 后怎么修
10. 测试通过后进入 master
11. 正式版本一定要打 Tag

## 第二篇：团队协作、分支保护与 Git 排错

12. 分支保护应该怎么配置
13. Git 冲突怎么解决
14. 常见误操作恢复
15. 一名开发每天真实怎么操作

## 第三篇：阿里云 ECS 与手工生产部署

16. 准备阿里云 ECS
17. 服务器安装 Git 和 Docker
18. 把项目 Docker 化
19. 安装和配置 Nginx
20. 第一次正式部署到阿里云
21. 以后发布新版本到底怎么做
22. Hotfix 线上紧急修复
23. 生产环境怎么回滚
24. 生产发布前 Checklist

## 第四篇：日常研发、发布流程与练习

25. 技术负责人完整发布流程
26. 推荐进一步升级成 CI/CD
27. 推荐目录与部署脚本
28. 完整练习任务
29. Git 命令速查表
30. 你必须真正理解的 11 条原则

## 第五篇：企业级 DevOps 与 CI/CD 基础

31. 企业级 Git 项目管理总体架构
32. 企业级多环境体系
33. 企业级分支保护、权限和 CODEOWNERS
34. 企业级 CI/CD：从代码提交到自动检查
35. 企业级 Docker 镜像管理与阿里云 ACR
36. 企业级 Secret 和配置管理
37. HTTPS、域名与生产 Nginx
38. 数据库 Migration 企业规范
39. 企业级发布策略：滚动、蓝绿和灰度
40. Health Check 与自动验证
41. 监控、日志与告警
42. 发布审批、审计与变更管理
43. 生产故障响应与回滚 SOP
44. 企业级安全发布基础
45. 从 Docker Compose 演进到 Kubernetes
46. 企业级完整 CI/CD 参考实现
47. 企业级目录建议
48. 企业级发布 Runbook
49. 企业级 Git + DevOps 最终规范

## 第六篇：4 项目 GitHub Actions 综合实战

50. 综合项目实战——4 个真实项目 + GitHub Actions + Dev/Test/Prod
51. 先确定最终交付结果
52. 整体企业架构
53. 4 个仓库的分支统一规范
54. GitHub Environments 配置
55. GitHub Variables 与 Secrets 设计
56. 阿里云资源准备
57. 服务器统一目录
58. 统一 Docker Compose
59. API 项目 FastAPI Docker 化
60. PC 项目 Next.js Docker 化
61. Admin React Docker 化
62. uni-app H5 Docker 化
63. ACR 镜像命名规范
64. GitHub Actions 公共 CI 思路
65. FastAPI GitHub Actions 完整示例
66. Next.js GitHub Actions
67. Admin React GitHub Actions
68. uni-app GitHub Actions
69. 服务器部署脚本
70. 一个非常重要的问题——4 个项目版本如何协调
71. Nginx 多域名路由
72. 跨域 CORS 配置
73. MySQL 三环境隔离
74. Redis 三环境隔离
75. 数据库 Migration 加入 GitHub Actions
76. 4 项目完整开发流程实战
77. Development 自动部署
78. Testing 提测
79. Testing Bug Fix
80. Production 发布
81. 生产 Smoke Test
82. 4 项目回滚实战
83. 生产发布不要把源码 Clone 到服务器
84. GitHub Actions 企业安全加固
85. GitHub Actions 复用 Workflow
86. 域名 DNS 最终配置表
87. 最终项目交付表
88. 最终版本记录示例
89. 这个实战真正达到企业标准的验收清单
90. 综合实战最终闭环

## 第七篇：企业级毕业实战与最终验收

91. 最终企业级毕业实战
92. 最终能力验收表
93. 技术负责人最终总结

# 第一篇：Git 基础与版本管理

# 第一章：先搞懂代码从本地到生产到底经历了什么

## 1.1 为什么先讲流程，而不是先背 Git 命令

Git 新手最容易陷入一个误区：

> “我学会了 `git add`、`git commit`、`git push`，是不是就会 Git 了？”

不是。

真实公司中，Git 最大的价值不是“保存文件”，而是管理多人协作和版本发布。

你真正需要搞懂的是：

```text
需求
 ↓
创建 feature 分支
 ↓
本地开发
 ↓
提交代码   git commit 
 ↓
推送远程仓库 git push
 ↓
代码评审
 ↓
合并 develop
 ↓
部署开发/联调环境
 ↓
合并 test
 ↓
部署测试环境
 ↓
测试人员测试
 ↓
Bug 修复
 ↓
重新测试
 ↓
测试通过
 ↓
合并 master
 ↓
打版本 Tag
 ↓
部署生产服务器
 ↓
生产验证
```

这才是一条完整的企业级发布链路。

---

## 1.2 本教程最终要实现的发布流程

假设我们开发一个课程交付平台。

今天产品提出需求：

> 用户购买课程以后，可以在“我的课程”中看到已经购买的课程。

我们会创建：

```text
feature/my-course
```

开发完成以后：

```text
feature/my-course
        ↓
     develop
        ↓
       test
        ↓
      master
        ↓
    v1.0.0 Tag
        ↓
 阿里云生产服务器
```

如果上线后突然发现一个严重 Bug：

```text
master
  ↓
hotfix/order-permission
  ↓
修复
  ↓
test 验证
  ↓
master
  ↓
v1.0.1
```

同时还要把 Hotfix 修复同步回：

```text
develop
test
```

否则下一次正常发布时，旧 Bug 可能重新出现。

---

# 第二章：先分清 Git、远程仓库和服务器

## 2.1 Git 是什么

Git 是版本管理工具。

它主要负责：

- 记录代码修改历史；
- 创建分支；
- 合并代码；
- 查看谁改了什么；
- 回退版本；
- 多人协作。

Git 安装在你的电脑上。

---

## 2.2 GitHub / GitLab / Gitee 是什么

它们是“远程 Git 仓库平台”。

可以把它理解成：

```text
你的电脑
   ↓ git push
远程代码仓库
   ↓ git pull / clone
其他开发电脑 / 测试服务器 / 生产服务器
```

企业里常见：

- GitLab
- GitHub
- Gitee
- 阿里云 Codeup

本教程统一把远程仓库地址写成：

```text
git@your-git-server.com:team/course-platform.git
```

你实际操作时换成自己的地址即可。

---

## 2.3 阿里云 ECS 是什么

ECS 可以理解成一台放在阿里云机房里的 Linux 电脑。

例如：

```text
公网 IP：47.xx.xx.xx
系统：Ubuntu 24.04
```

你的生产项目最终运行在这台服务器上。

访问关系大致是：

```text
用户浏览器
     ↓
公网域名
     ↓
阿里云 ECS
     ↓
Nginx
     ↓
Docker 容器
     ↓
你的应用
```

---

# 第三章：六类 Git 分支到底各自干什么

# 3.1 `master` 分支

## 介绍

`master` 是生产分支。

最重要的规则：

> `master` 中的代码必须是已经通过测试、允许上线生产环境的代码。

不要直接在 `master` 上开发。

不要把半成品直接提交到 `master`。

不要为了“快”直接在 `master` 上修改线上 Bug。

---

## `master` 里应该放什么

例如：

```text
v1.0.0
v1.1.0
v1.1.1
```

这些正式版本都应该可以从 `master` 找到。

---

# 3.2 `develop` 分支

## 介绍

`develop` 是开发集成分支。

多个开发人员完成各自 Feature 后，先合并到这里。

例如：

```text
feature/login
feature/course-search
feature/order
feature/my-course
```

最终：

```text
feature/login --------\
feature/course-search --\
feature/order ----------- > develop
feature/my-course ------/
```

`develop` 不保证可以直接上线生产。

它允许包含：

- 当前迭代正在开发完成的功能；
- 等待测试的功能；
- 正在联调的功能。

---

# 3.3 `feature/*` 分支

## 介绍

每开发一个需求，都从 `develop` 创建一个功能分支。

命名建议：

```text
feature/login
feature/course-search
feature/order-create
feature/my-course
feature/coupon
```

不要：

```text
feature/test
feature/new
feature/aaa
```

名字要让团队成员一眼看懂你在做什么。

---

## Feature 分支从哪里创建

必须从：

```text
develop
```

创建。

例如：

```bash
git switch develop
git pull origin develop
git switch -c feature/my-course
```

这样可以确保你的功能基于最新开发代码。

---

# 3.4 `test` 分支

## 介绍

`test` 分支代表“准备交给测试人员验证的版本”。

我们在本教程中采用：

```text
develop
   ↓
 test
   ↓
master
```

它的作用是把“日常开发集成代码”和“正在正式测试的版本”隔离开。

例如测试人员正在测试：

```text
test = 1.3.0 候选版本
```

与此同时，开发人员可能已经开始开发下一批功能：

```text
develop = 1.4.0 开发内容
```

这样测试环境不会不断被新开发代码打扰。

---

# 3.5 `hotfix/*` 分支

## 介绍

`hotfix` 专门解决“生产环境紧急 Bug”。

必须从当前生产代码创建，也就是：

```text
master
```

例如：

```bash
git switch master
git pull origin master
git switch -c hotfix/order-payment
```

修复完成后，需要至少同步到：

```text
master
develop
test
```

---

# 3.6 `release/*` 分支

## 介绍

`release/*` 是“预发布分支”，也叫“发布分支”。

它专门用来管理**一次即将上线的候选版本**，是在测试分支基本通过、准备进入生产之前，从 `develop` 分支切出来的一个“发布准备分支”。

例如一次版本发布：

```text
develop
   ↓
release/1.2.0
   ↓（发布前最后的收尾、回归、版本号确认）
master
```

> `release/*` 分支不是必须的。小团队、简单项目直接用 `test → master` 就够了。  
> 当你的团队规模变大、发布节奏加快、需要严格控制“这一版到底带什么上线”时，就应该引入 `release/*`。

---

## 它和 `test`、`master` 的区别

| 分支 | 作用 | 是否常驻 | 谁主要操作 |
|---|---|---|---|
| `develop` | 日常开发集成，新 Feature 不断汇入 | 常驻 | 开发 |
| `test` | 当前正在给 QA 测试的版本 | 常驻 | 开发 + 测试 |
| `release/*` | 某一次即将上线的候选版本收尾 | 临时 | 发布负责人 / Tech Lead |
| `master` | 已经上线的生产代码 | 常驻 | 发布负责人 |
| `hotfix/*` | 生产紧急 Bug 修复 | 临时 | 开发 + 发布负责人 |

简单理解：

```text
test 可以一直跟着最新的测试版本走
release/1.2.0 是“锁定 1.2.0 这版内容，专门为它做上线准备”
```

---

## release 分支用在哪个阶段

`release/*` 用在**测试通过之后、正式发布到生产之前**的阶段，也就是“发布准备 / 上线前收尾”阶段。

它在整条发布链路中的位置：

```text
feature/*
   ↓
develop（开发集成）
   ↓
test（QA 测试）
   ↓ QA PASS
release/1.2.0（发布准备：冻结功能、回归、改版本号、准备上线清单）
   ↓ 全部通过
master（合并进生产分支）
   ↓
v1.2.0 Tag（打正式版本号）
   ↓
部署生产
```

这个阶段通常要完成几件事：

```text
1. 冻结功能：不再加新功能，只修上线前发现的 Bug
2. 全面回归测试：确保这版稳定
3. 确认版本号：统一改成 1.2.0 并更新版本文件
4. 更新发布文档 / Release Notes：列出这版包含了哪些需求和修复
5. 数据库 Migration 复核：确认随这版一起上线的数据库变更都 OK
6. 准备上线 Checklist：回滚方案、监控、审批人都确认到位
```

---

## release 分支从哪里创建

必须从 `develop` 创建，因为它要包含“本次计划发布的所有已完成功能”：

```bash
git switch develop
git pull origin develop

git switch -c release/1.2.0
```

推送：

```bash
git push -u origin release/1.2.0
```

---

## 在 release 分支上只做“收尾”，不开发新功能

例如发布前发现一个小 Bug，直接在 `release/1.2.0` 上修复并提交：

```bash
git switch release/1.2.0
git pull origin release/1.2.0

git add .
git commit -m "fix(order): fix coupon amount display before release"
git push
```

但是**绝对不要**在 `release/*` 上开发全新需求。新需求应该继续走 `feature/* → develop`。

---

## release 分支合并进 master

回归、版本号、上线清单都确认好后，把 `release/1.2.0` 合并进 `master`：

```bash
git switch master
git pull origin master

git merge --no-ff release/1.2.0

git push origin master
```

打正式版本 Tag：

```bash
git tag -a v1.2.0 -m "release v1.2.0"
git push origin v1.2.0
```

---

## release 分支还要同步回 develop

上线之后，不要把 `release/1.2.0` 里的修复丢掉。把它合并回 `develop`，否则下一次开发就会缺失这些修复：

```bash
git switch develop
git pull origin develop

git merge --no-ff release/1.2.0

git push origin develop
```

---

## 发布完成后删除 release 分支

`release/*` 是临时分支，上线完成后删除即可：

```bash
git branch -d release/1.2.0
git push origin --delete release/1.2.0
```

> 版本信息已经通过 `master` + `v1.2.0` Tag 永久保留了，删掉 `release/1.2.0` 分支不会丢历史。

---

## 项目举例

假设公司要做一次版本发布：

```text
develop
   ↓
release/2.0.0
   ↓（冻结功能 + 回归 + 确认版本号 2.0.0）
master
   ↓
v2.0.0 Tag
```

```bash
# 从 develop 切发布分支
git switch develop
git pull origin develop
git switch -c release/2.0.0
git push -u origin release/2.0.0

# 上线前回归通过后合入 master
git switch master
git pull origin master
git merge --no-ff release/2.0.0
git push origin master

# 打正式版本 Tag
git tag -a v2.0.0 -m "release v2.0.0"
git push origin v2.0.0

# 同步回 develop
git switch develop
git pull origin develop
git merge --no-ff release/2.0.0
git push origin develop

# 删除发布分支
git branch -d release/2.0.0
git push origin --delete release/2.0.0
```

---

## release 分支使用小结

一句话记住：

> `release/*` 用于“测试通过之后、正式上线之前”的发布准备阶段，它把 `develop` 中已经完成的功能锁定成某一个候选版本，做完回归和版本收尾后再合并进 `master` 并打 Tag。

---

# 第四章：第一次创建 Git 项目

# 4.1 安装 Git

Windows 安装 Git 后打开：

```text
Git Bash
```

验证：

```bash
git --version
```

看到类似：

```text
git version 2.x.x
```

说明安装成功。

---

# 4.2 配置用户名和邮箱

第一次使用 Git：

```bash
git config --global user.name "zhangsan"
git config --global user.email "zhangsan@example.com"
```

检查：

```bash
git config --global --list
```

应该看到：

```text
user.name=zhangsan
user.email=zhangsan@example.com
```

---

# 4.3 创建本地项目

例如：

```bash
mkdir course-platform
cd course-platform
```

创建：

```text
README.md
```

内容：

```markdown
# Course Platform

课程交付平台
```

---

# 4.4 初始化 Git

执行：

```bash
git init
```

如果当前默认分支不是 `master`，可以执行：

```bash
先创建然后再切换
git branch -M master
```

检查：

```bash
git branch
```

---

# 4.5 第一次提交

先看状态：查看有没有冲突

```bash
git status
```

添加文件：

```bash
git add README.md
```

或者全部添加：

```bash
git add .
```

再次查看：

```bash
git status
```

提交：

```bash
git commit -m "chore: init project"
```

---

# 4.6 添加远程仓库

假设远程地址：

```text
git@your-git-server.com:team/course-platform.git
```

执行：

```bash
git remote add origin git@your-git-server.com:team/course-platform.git
```

检查：

```bash
git remote -v
```

第一次推送：

```bash
git push -u origin master
```

---

# 第五章：创建 `develop` 和 `test`

# 5.1 创建 develop

确保当前 master 是最新：

```bash
git switch master
git pull origin master
```

创建：

```bash
git switch -c develop
```

推送：将本地develop分支推送到远程分支上

检查：登录到github上，看有没有develop分支

```bash
git push -u origin develop
```

---

# 5.2 创建 test

建议第一次从 `develop` 创建：

```bash
git switch develop
git pull origin develop
git switch -c test
```

推送：

```bash
git push -u origin test
```

---

# 5.3 最终检查

执行：

```bash
git branch -a
```

应该能看到：

```text
master
develop
test
remotes/origin/master
remotes/origin/develop
remotes/origin/test
```

---

# 第六章：Feature 功能开发完整流程

现在开始真正模拟开发需求。

需求：

> 增加“我的课程”功能。

分支名称：

```text
feature/my-course
```

---

# 6.1 第一步：更新 develop

永远不要拿一个很久没更新的 `develop` 创建 Feature。

执行：

```bash
git switch develop
```

然后：

```bash
git pull origin develop
```

确认：有没有冲突

```bash
git status
```

应该看到：

```text
Your branch is up to date with 'origin/develop'
```

---

# 6.2 第二步：创建 Feature 分支

执行：

```bash
git switch -c feature/my-course
```

检查：

```bash
git branch
```

应该看到：

```text
  master
  develop
  test
* feature/my-course
```

星号表示当前所在分支。

---

# 6.3 第三步：开始开发

假设修改：

```text
src/course/my_course.py
src/course/course_service.py
tests/test_my_course.py
```

开发一段时间后：

```bash
git status
```

看看改了哪些文件。

---

# 6.4 第四步：先查看代码差异

执行：

```bash
git diff
```

这一步很重要。

提交之前一定检查：

- 有没有调试代码；
- 有没有密码；
- 有没有测试 Token；
- 有没有误删代码；
- 有没有临时日志；
- 有没有不该提交的配置文件。

---

# 6.5 第五步：添加暂存区

全部添加：

```bash
git add .
```

或者只添加指定文件：

```bash
git add src/course/my_course.py
git add tests/test_my_course.py
```

再次检查：

```bash
git status
```

---

# 6.6 第六步：提交 Commit

推荐 Commit 格式：

```text
type(scope): message
```

常见 type：

| 类型 | 用途 |
|---|---|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| refactor | 重构 |
| test | 测试代码 |
| chore | 工程配置 |
| perf | 性能优化 |

例如：

```bash
git commit -m "feat(course): add my course list"
```

---

# 6.7 一个功能不要只积累一个巨大 Commit

例如完成“我的课程”功能时，可以这样：

```bash
git commit -m "feat(course): add purchased course query api"
```

接着：

```bash
git commit -m "feat(course): add my course page"
```

再：

```bash
git commit -m "test(course): add my course api tests"
```

这样以后排查问题非常清楚。

---

# 6.8 第七步：Feature 开发期间同步 develop

假设你开发了两天。

其他人已经向 `develop` 合并了代码。

先：

```bash
git switch develop
git pull origin develop
```

再切回来：

```bash
git switch feature/my-course
```

推荐学习阶段先使用：

```bash
git merge develop
```

如果有冲突，解决冲突以后：

```bash
git add .
git commit
```

---

# 6.9 第八步：本地测试

提交远程前至少执行：

```text
单元测试
接口测试
项目启动
核心功能验证
```

假设测试命令：

```bash
pytest
```

或者 Node：

```bash
npm test
```

或者 Maven：

```bash
mvn test
```

全部通过以后再推送。

---

# 6.10 第九步：推送 Feature

第一次：

```bash
git push -u origin feature/my-course
```

以后只需：

```bash
git push
```

---

# 第七章：Feature 合并到 develop

# 7.1 推荐方式：Merge Request / Pull Request

企业中不要让开发者直接：

```bash
git push origin develop
```

推荐流程：

```text
feature/my-course
       ↓
提交 MR / PR
       ↓
目标分支 develop
       ↓
代码评审
       ↓
自动测试
       ↓
通过
       ↓
Merge
```

---

# 7.2 Code Review 要看什么

至少检查：

1. 功能逻辑；
2. 异常处理；
3. 重复代码；
4. SQL；
5. 数据库事务；
6. 安全风险；
7. 日志；
8. 测试代码；
9. 配置；
10. 是否包含密码/Secret。

---

# 7.3 GitHub 代码评审（Code Review）实操

> 下面以 GitHub 的 **Pull Request（PR）** 为例，带你完整走一遍"创建 PR → 提交评审意见 → 通过合并"的真实流程。  
> GitLab 上叫 Merge Request（MR），操作逻辑完全一样，只是按钮名字不同。

## 7.3.1 代码评审到底在评审什么

一句话：

> 评审人不是"帮作者把代码改一遍"，而是**在合并进主分支之前，把关这段代码能不能进**。

评审主要关注四类问题：

```text
1. 正确性：这段代码逻辑对吗？会出 Bug 吗？边界情况处理了吗？
2. 可维护性：别人以后能看懂吗？命名清楚吗？有没有重复代码？
3. 安全性：有没有注入、明文密码、越权、泄露敏感信息？
4. 可测试性：有没有对应的单元测试 / 接口测试？
```

评审后一般给三种结论：

```text
Approve（通过）→ 可以合并
Request changes（请求修改）→ 需要修改后再合并
Comment（一般评论）→ 只是建议，不阻塞合并
```

---

## 7.3.2 第一步：发起方创建 Pull Request

假设你开发完 `feature/my-course`，已经推送到了远程：

```bash
git switch feature/my-course
git push -u origin feature/my-course
```

然后在 GitHub 网页上：

```text
仓库首页
  → Pull requests 标签
  → 点绿色的 New pull request
  → base（目标分支）选 develop
  → compare（来源分支）选 feature/my-course
  → Create pull request
```

写好 PR 标题和描述。**描述要让人一眼看懂这版改了什么**，推荐模板：

````markdown
## 需求

用户购买课程后，能在"我的课程"看到已购课程。

## 改动内容

- feat(course): 新增已购课程查询接口
- feat(course): 新增"我的课程"页面
- test(course): 新增相关测试

## 改动文件

- src/course/my_course.py
- src/course/course_service.py
- tests/test_my_course.py

## 自测结果

- [x] 本地 pytest 通过
- [x] 接口手动验证通过
````

---

## 7.3.3 第二步：让 GitHub 自动检查（CI）

在创建 PR 之前，先确保仓库里已经有 CI 配置（例如 `.github/workflows/ci.yml`）。

这样创建 PR 后，GitHub 会自动跑：

```text
lint
单元测试
构建
```

PR 页面会显示每个检查的绿勾 / 红叉。**评审时先看 CI 是否通过**：

```text
CI 红叉 → 先让作者修复，不要急着评审细节
CI 绿勾 → 再开始认真看代码
```

> 规则：CI 失败不允许合并。

---

## 7.3.4 第三步：评审人开始看代码

在 PR 页面的 **Files changed（文件改动）** 标签里，GitHub 会把所有改动以"红（删）/绿（加）"形式展示出来。

评审人应该从上到下逐个文件看。对某一行的具体位置，把鼠标移到行号旁边，点 `+` 号就能**在那一行上写评论**。

示例——看到这样一段代码：

```python
def get_my_course(user_id):
    sql = "SELECT * FROM course WHERE user_id = " + user_id
    return db.execute(sql)
```

评审人可以在这行上留言：

```text
安全风险：这里直接把 user_id 拼进 SQL，存在注入风险。
请改成参数化查询，例如：
cursor.execute("SELECT * FROM course WHERE user_id = %s", (user_id,))
```

作者看到后可以在评论里回复、修改代码，然后重新推送。

---

## 7.3.5 第四步：Reviewer 点击完成评审

看完全部文件后，点 PR 页面右上角的：

```text
Review changes
  → 写一段总结性评审意见
  → 选择：
       Comment        （只是一般评论）
       Approve        （通过，可以合并）
       Request changes（需要修改）
  → Submit review（提交）
```

> 建议最后**先 Approve 一次练习**，再故意"Request changes"一次，两种流程都亲手点一遍。

---

## 7.3.6 第五步：按意见修改并重新推送

作者根据评审意见修改代码：

```bash
git switch feature/my-course

# 修改代码
git add .
git commit -m "fix(course): use parameterized query to prevent SQL injection"
git push
```

重新推送后，PR 会自动刷新，Reviewer 会再次收到通知，可以重新评审直到 Approve。

---

## 7.3.7 第六步：合并 PR

评审通过后，由有权限的人点 **Merge pull request**。

合并方式里推荐选：

```text
Create a merge commit（保留一次合并记录，对应 git merge --no-ff）
```

合并完成后，按 GitHub 提示点击：

```text
Delete branch
```

删除已经合并的 `feature/my-course` 分支。

---

## 7.3.8 第七步：你自己一个人怎么实操

如果没有人陪你评审，你也可以自己完整走一遍流程：

1. 创建 `feature/my-course`，写几行代码，推送，创建 PR（base=develop）；
2. 自己切换到"评审人"视角，在 Files changed 里故意找 1~2 个问题，写行内评论；
3. 回到"作者"视角，修改代码，重新推送；
4. 再看一遍，点 **Approve**；
5. 最后点 **Merge pull request** + **Delete branch**。

> 一个人练习时最关键的是：**从"写代码的人"切换到"检查代码的人"这个视角**。你会发现自己写的时候没注意到的问题。

---

## 7.3.9 评审 CheckList（每次评审照着勾）

```text
功能逻辑：这段代码真的实现需求了吗？
边界情况：空值 / 超长 / 无权限 / 重复提交怎么办？
异常处理：报错时有提示吗？会崩吗？
安全性：有没有 SQL 注入 / 明文密码 / 越权 / Secret 泄露？
命名：变量、函数、分支名别人能看懂吗？
重复代码：有没有应该抽出来的公共逻辑？
数据库：事务用对了吗？有没有 N+1 查询？
测试：改动有没有对应测试？测试通过了吗？
配置：有没有把不该提交的配置 / .env 提交进来？
文档：需要更新的 README / 注释更新了吗？
```

---

# 7.4 如果你是一个人练习

可以模拟：

```bash
git switch develop
git pull origin develop
git merge --no-ff feature/my-course
```

然后：

```bash
git push origin develop
```

---

# 7.5 为什么使用 `--no-ff`

执行：

```bash
git merge --no-ff feature/my-course
```

可以明确保留一次“功能分支合并记录”。

查看：

```bash
git log --oneline --graph --all
```

会更容易看出：

```text
develop
   └── feature/my-course
```

---

# 第八章：从 develop 提交 test 测试分支

现在多个 Feature 已经在 develop 集成完成。

例如：

```text
feature/login
feature/course-search
feature/my-course
feature/order
```

都已经进入：

```text
develop
```

准备测试。

---

# 8.1 先更新 develop

```bash
git switch develop
git pull origin develop
```

先运行完整测试：

```bash
pytest
```

或者项目自己的测试命令。

确认没有明显问题。

---

# 8.2 更新 test

```bash
git switch test
git pull origin test
```

---

# 8.3 把 develop 合入 test

执行：

```bash
git merge --no-ff develop
```

如果没有冲突：

```bash
git push origin test
```

此时：

```text
origin/test
```

就是本次“待测试版本”。

---

# 8.4 部署测试环境

真实公司通常会配置：

```text
test 分支 push
      ↓
CI/CD
      ↓
自动部署测试环境
```

例如：

```text
https://test.course.example.com
```

测试人员就在这里测试。

---

# 第九章：测试发现 Bug 后怎么修

假设测试发现：

> 已购买课程仍然显示“立即购买”。

不要直接在 `test` 上长期开发。

---

# 9.1 回到对应 Feature 或创建 Bugfix 分支

如果 Feature 还没删除：

```bash
git switch feature/my-course
```

如果已经删除，可以从 develop 新建：

```bash
git switch develop
git pull origin develop
git switch -c fix/my-course-purchased-status
```

---

# 9.2 修改代码

修改后：

```bash
git status
git diff
git add .
git commit -m "fix(course): fix purchased course status"
git push
```

---

# 9.3 重新进入 develop

通过 PR/MR：

```text
fix/my-course-purchased-status
           ↓
        develop
```

---

# 9.4 再同步 test

```bash
git switch test
git pull origin test

git switch develop
git pull origin develop

git switch test
git merge develop
git push origin test
```

测试环境重新部署。

QA 再回归。

---

# 第十章：测试通过后进入 master

这一步非常重要。

只有测试已经正式通过，才允许进入生产分支。

流程：

```text
develop
   ↓
 test
   ↓
QA PASS
   ↓
master
```

---

# 10.1 确认 test 最新

```bash
git switch test
git pull origin test
```

跑最后一次回归测试。

---

# 10.2 切换 master

```bash
git switch master
git pull origin master
```

---

# 10.3 合并 test

```bash
git merge --no-ff test
```

检查：

```bash
git log --oneline --graph --decorate -20
```

---

# 10.4 推送生产分支

```bash
git push origin master
```

现在：

```text
origin/master
```

已经代表即将发布的生产代码。

注意：

> `git push master` 不等于“已经部署生产”。

Git 仓库只是代码存储。

还需要部署服务器。

---

# 第十一章：正式版本一定要打 Tag

# 11.1 为什么需要 Tag

假设今天发布：

```text
v1.0.0
```

下个月：

```text
v1.1.0
```

如果线上突然出问题，你必须知道：

> 当前生产环境运行的是哪个确切版本？

所以正式发布必须打 Tag。

---

# 11.2 创建 Tag

确保在 master：

```bash
git switch master
git pull origin master
```

创建带说明的 Tag：

```bash
git tag -a v1.0.0 -m "release v1.0.0"
```

查看：

```bash
git tag
```

---

# 11.3 推送 Tag

```bash
git push origin v1.0.0
```

或者：

```bash
git push origin --tags
```

---

# 11.4 版本号怎么定

常见规则：

```text
主版本.次版本.修订版本
```

例如：

```text
1.0.0
```

新增兼容功能：

```text
1.1.0
```

修复 Bug：

```text
1.1.1
```

重大不兼容升级：

```text
2.0.0
```

---

# 第二篇：团队协作、分支保护与 Git 排错

# 第十二章：分支保护应该怎么配置

真实公司一定要保护：

```text
master
develop
test
```

尤其：

```text
master
```

---

# 21.1 master 推荐规则

禁止普通开发：

```text
直接 Push
强制 Push
删除分支
```

必须：

```text
PR/MR
至少 1~2 人 Review
CI 测试通过
有权限的人 Merge
```

---

# 21.2 develop

允许 Feature 合并。

建议：

```text
必须 MR
至少 1 人 Review
单元测试通过
```

---

# 21.3 test

一般只有：

```text
发布负责人
测试负责人
CI/CD
```

能够操作。

不要让所有开发随便 Push。

---

# 第十三章：Git 冲突怎么解决

假设：

```text
你修改了 course_service.py
张三也修改了同一行
```

你执行：

```bash
git merge develop
```

出现：

```text
CONFLICT
```

---

# 22.1 查看冲突

```bash
git status
```

打开文件会看到：

```text
<<<<<<< HEAD

你的代码

=======

develop 的代码

>>>>>>> develop
```

---

# 22.2 不要机械删除冲突标记

你要先搞懂：

```text
哪段代码应该保留？
两段是否都应该保留？
新的业务规则是什么？
```

修改成最终正确代码。

---

# 22.3 标记已解决

```bash
git add course_service.py
```

检查：

```bash
git status
```

完成 Merge：

```bash
git commit
```

---

# 第十四章：常见误操作恢复

# 23.1 修改了文件但还没 add

想放弃：

```bash
git restore filename
```

---

# 23.2 已经 git add，但还没 commit

取消暂存：

```bash
git restore --staged filename
```

代码修改仍然保留。

---

# 23.3 Commit 信息写错

如果还没有 Push：

```bash
git commit --amend
```

---

# 23.4 想查看历史

```bash
git log --oneline --graph --decorate --all
```

这是非常推荐掌握的命令。

---

# 23.5 已经 Push 的公共 Commit 不要随便 reset

生产团队中：

```bash
git reset --hard
git push --force
```

属于高风险操作。

对于已经推送的公共历史，优先使用：

```bash
git revert <commit>
```

它会创建一个新的反向 Commit，更容易审计。

---

# 第十五章：一名开发每天真实怎么操作

早上开始：

```bash
git switch develop
git pull origin develop
```

开始新需求：

```bash
git switch -c feature/course-search
```

开发。

查看：

```bash
git status
git diff
```

提交：

```bash
git add .
git commit -m "feat(course): add course search"
```

开发继续：

```bash
git add .
git commit -m "test(course): add course search tests"
```

同步最新 develop：

```bash
git switch develop
git pull origin develop

git switch feature/course-search
git merge develop
```

本地测试。

推送：

```bash
git push -u origin feature/course-search
```

创建 PR：

```text
feature/course-search
      ↓
develop
```

Review 通过以后合并。

---

# 第三篇：阿里云 ECS 与手工生产部署

# 第十六章：准备阿里云 ECS

> 下面进入真正的“代码部署生产”阶段。

# 12.1 创建 ECS

学习时建议：

```text
系统：Ubuntu 24.04 LTS
公网 IP：需要
```

购买完成后，你会得到类似：

```text
公网 IP：47.xx.xx.xx
用户名：root 或 ubuntu
```

---

# 12.2 配置安全组

公网 Web 服务通常至少需要：

```text
22   SSH
80   HTTP
443  HTTPS
```

建议：

- `80`：允许公网访问；
- `443`：允许公网访问；
- `22`：只允许你的固定公网 IP 或办公网络；
- 数据库端口不要随便开放给全网；
- 应用内部端口例如 `8080` 最好不要直接暴露公网。

推荐结构：

```text
Internet
   ↓
80 / 443
   ↓
Nginx
   ↓
127.0.0.1:8080
   ↓
Application
```

---

# 12.3 SSH 登录服务器

你的电脑：

```bash
ssh ubuntu@47.xx.xx.xx
```

如果使用 root：

```bash
ssh root@47.xx.xx.xx
```

第一次连接会看到：

```text
Are you sure you want to continue connecting?
```

输入：

```text
yes
```

---

# 12.4 强烈建议配置 SSH Key

本地生成：

```bash
ssh-keygen -t ed25519
```

一路回车。

会得到：

```text
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

把 `.pub` 公钥放到服务器：

```text
~/.ssh/authorized_keys
```

以后可以通过密钥登录。

注意：

> 私钥 `id_ed25519` 永远不要提交到 Git。

---

# 第十七章：服务器安装 Git 和 Docker

# 13.1 更新系统

SSH 登录服务器：

```bash
sudo apt update
sudo apt upgrade -y
```

---

# 13.2 安装 Git

```bash
sudo apt install git -y
```

验证：

```bash
git --version
```

---

# 13.3 安装 Docker：先删除可能冲突的软件包

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg
done
```

没有安装过时出现“未安装”提示可以忽略。

---

# 13.4 添加 Docker 官方仓库

安装基础依赖：

```bash
sudo apt update
sudo apt install -y ca-certificates curl
```

创建 Key 目录：

```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

下载 Docker 官方 GPG Key：

```bash
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
```

设置读取权限：

```bash
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

添加软件源：

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

更新：

```bash
sudo apt update
```

---

# 13.5 安装 Docker Engine + Compose

```bash
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

---

# 13.6 验证 Docker

```bash
sudo systemctl status docker
```

如果没有运行：

```bash
sudo systemctl start docker
```

设置开机启动：

```bash
sudo systemctl enable docker
```

测试：

```bash
sudo docker run hello-world
```

查看 Compose：

```bash
sudo docker compose version
```

---

# 第十八章：把项目 Docker 化

这里使用一个语言无关的思路：

```text
代码
 ↓
Dockerfile
 ↓
docker build
 ↓
Docker Image
 ↓
Container
```

不同语言主要区别只是 `Dockerfile`。

---

# 14.1 示例目录

```text
course-platform/
├── src/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
└── README.md
```

---

# 14.2 `.gitignore`

例如：

```gitignore
.env
.env.*
node_modules/
venv/
__pycache__/
target/
dist/
logs/
*.log
.idea/
.vscode/
```

绝对不要提交：

```text
数据库真实密码
阿里云 AccessKey
SSH 私钥
生产 Token
JWT Secret
.env 生产配置
```

---

# 14.3 Dockerfile 思路

例如 Python Web 应用：

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "app.py"]
```

Node.js：

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Java Spring Boot：

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY target/app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

你只需要使用与你项目技术栈匹配的一种。

---

# 14.4 Docker Compose

假设应用内部监听：

```text
8000
```

创建：

```yaml
services:
  app:
    build:
      context: .
    container_name: course-platform
    restart: unless-stopped
    env_file:
      - .env.production
    ports:
      - "127.0.0.1:8000:8000"
```

这里故意绑定：

```text
127.0.0.1
```

而不是：

```text
0.0.0.0
```

表示应用端口只允许服务器本机访问。

外部用户必须经过 Nginx。

---

# 第十九章：安装和配置 Nginx

# 15.1 安装

服务器：

```bash
sudo apt install nginx -y
```

启动：

```bash
sudo systemctl start nginx
```

开机启动：

```bash
sudo systemctl enable nginx
```

检查：

```bash
sudo systemctl status nginx
```

---

# 15.2 创建站点配置

创建：

```bash
sudo nano /etc/nginx/sites-available/course-platform
```

写入：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }
}
```

如果暂时没有域名：

```nginx
server_name _;
```

---

# 15.3 启用配置

```bash
sudo ln -s \
  /etc/nginx/sites-available/course-platform \
  /etc/nginx/sites-enabled/course-platform
```

如果默认站点冲突：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

---

# 15.4 检查配置

一定先执行：

```bash
sudo nginx -t
```

看到：

```text
syntax is ok
test is successful
```

才可以：

```bash
sudo systemctl reload nginx
```

---

# 第二十章：第一次正式部署到阿里云

现在正式把：

```text
本地 master
```

部署到：

```text
阿里云生产服务器
```

---

# 16.1 推荐生产目录

服务器：

```bash
sudo mkdir -p /opt/course-platform
```

修改所有者：

```bash
sudo chown -R $USER:$USER /opt/course-platform
```

进入：

```bash
cd /opt/course-platform
```

---

# 16.2 生产服务器配置 Git SSH Key

生产服务器生成专门的部署 Key：

```bash
ssh-keygen -t ed25519
```

查看公钥：

```bash
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 Git 平台。

最好使用：

```text
Deploy Key / 只读仓库权限
```

而不是把开发者个人高权限账号长期放服务器。

---

# 16.3 Clone 生产代码

```bash
cd /opt
```

执行：

```bash
git clone git@your-git-server.com:team/course-platform.git
```

进入：

```bash
cd course-platform
```

---

# 16.4 切换到生产 Tag

生产部署最好不是简单：

```bash
git checkout master
```

而是部署明确版本：

```bash
git fetch --all --tags
git checkout v1.0.0
```

检查：

```bash
git log -1
```

确认 Commit。

再：

```bash
git describe --tags --always
```

应该看到：

```text
v1.0.0
```

---

# 16.5 创建生产环境变量

服务器本地创建：

```bash
nano .env.production
```

示例：

```env
APP_ENV=production
APP_PORT=8000

DB_HOST=10.0.0.10
DB_PORT=3306
DB_NAME=course_platform
DB_USER=course_app
DB_PASSWORD=CHANGE_ME

JWT_SECRET=CHANGE_ME
```

注意：

```text
.env.production
```

必须在：

```text
.gitignore
```

中。

---

# 16.6 第一次 Build

执行：

```bash
sudo docker compose build
```

观察是否报错。

---

# 16.7 启动

```bash
sudo docker compose up -d
```

---

# 16.8 查看容器

```bash
sudo docker compose ps
```

应该看到服务状态：

```text
Up
```

---

# 16.9 查看日志

```bash
sudo docker compose logs -f --tail=100
```

确认：

- 没有启动异常；
- 数据库连接正常；
- 没有配置缺失；
- 端口监听正常。

退出实时日志：

```text
Ctrl + C
```

不会停止容器。

---

# 16.10 服务器本机测试应用

先测试应用：

```bash
curl http://127.0.0.1:8000
```

或者：

```bash
curl http://127.0.0.1:8000/health
```

如果返回成功，说明应用本身正常。

---

# 16.11 再测试 Nginx

```bash
curl http://127.0.0.1
```

再从自己的电脑：

```text
http://服务器公网IP
```

或：

```text
https://你的域名
```

---

# 第二十一章：以后发布新版本到底怎么做

假设现在生产：

```text
v1.0.0
```

新迭代经过：

```text
feature
 ↓
develop
 ↓
test
 ↓
QA PASS
 ↓
master
```

准备发布：

```text
v1.1.0
```

---

# 17.1 本地合并 master

```bash
git switch master
git pull origin master
git merge --no-ff test
git push origin master
```

---

# 17.2 本地打 Tag

```bash
git tag -a v1.1.0 -m "release v1.1.0"
git push origin v1.1.0
```

---

# 17.3 登录生产服务器

```bash
ssh ubuntu@47.xx.xx.xx
```

---

# 17.4 进入项目

```bash
cd /opt/course-platform
```

---

# 17.5 记录当前版本

一定先：

```bash
git describe --tags --always
```

例如：

```text
v1.0.0
```

记下来。

这是你的回滚点。

---

# 17.6 获取新代码

```bash
git fetch origin
git fetch --tags
```

切换：

```bash
git checkout v1.1.0
```

验证：

```bash
git describe --tags --always
```

---

# 17.7 构建新镜像

```bash
sudo docker compose build
```

最好：

```bash
sudo docker compose build --pull
```

---

# 17.8 启动新版本

```bash
sudo docker compose up -d
```

Docker Compose 会按配置更新服务。

---

# 17.9 检查

```bash
sudo docker compose ps
```

然后：

```bash
sudo docker compose logs --tail=200
```

测试：

```bash
curl http://127.0.0.1:8000/health
```

再访问域名验证：

```text
登录
课程搜索
课程详情
创建订单
我的课程
```

---

# 第二十二章：Hotfix 线上紧急修复

假设生产版本：

```text
v1.1.0
```

线上发现：

> 用户支付成功后偶发没有课程权限。

严重影响付费用户。

不能等下个迭代。

---

# 18.1 从 master 创建 Hotfix

本地：

```bash
git switch master
git pull origin master
```

创建：

```bash
git switch -c hotfix/course-permission
```

---

# 18.2 修改 Bug

完成以后：

```bash
git status
git diff
```

测试：

```bash
pytest
```

提交：

```bash
git add .
git commit -m "fix(order): repair course permission after payment"
```

推送：

```bash
git push -u origin hotfix/course-permission
```

---

# 18.3 Hotfix 先测试

推荐：

```text
hotfix/course-permission
        ↓
      test
        ↓
    紧急回归
```

如果测试环境当前有下一版本代码，团队也可以部署一个独立 Hotfix 验证环境，避免把未上线功能带入 Hotfix。

核心原则：

> Hotfix 最终生产包只能基于当前生产版本 + 本次修复。

---

# 18.4 合并回 master

测试通过：

```bash
git switch master
git pull origin master
git merge --no-ff hotfix/course-permission
git push origin master
```

---

# 18.5 打补丁版本 Tag

原版本：

```text
v1.1.0
```

修复版：

```bash
git tag -a v1.1.1 -m "hotfix course permission"
git push origin v1.1.1
```

---

# 18.6 部署 Hotfix

服务器：

```bash
cd /opt/course-platform

git fetch --all --tags

git checkout v1.1.1

sudo docker compose build

sudo docker compose up -d
```

检查：

```bash
sudo docker compose ps
sudo docker compose logs --tail=200
curl http://127.0.0.1:8000/health
```

---

# 18.7 非常重要：Hotfix 同步回 develop

否则下一次版本上线可能把 Bug 带回来。

执行：

```bash
git switch develop
git pull origin develop
git merge --no-ff hotfix/course-permission
git push origin develop
```

---

# 18.8 同步 test

```bash
git switch test
git pull origin test
git merge --no-ff hotfix/course-permission
git push origin test
```

然后才可以删除 Hotfix：

```bash
git branch -d hotfix/course-permission
git push origin --delete hotfix/course-permission
```

---

# 第二十三章：生产环境怎么回滚

这是技术负责人必须掌握的能力。

假设：

```text
v1.1.0 正常
v1.2.0 上线后出严重问题
```

最快的应用版本回滚方式：

---

# 19.1 服务器先确认版本

```bash
cd /opt/course-platform
git describe --tags --always
```

看到：

```text
v1.2.0
```

---

# 19.2 切回旧 Tag

```bash
git fetch --tags
git checkout v1.1.0
```

---

# 19.3 重新构建

```bash
sudo docker compose build
sudo docker compose up -d
```

---

# 19.4 验证

```bash
sudo docker compose ps
sudo docker compose logs --tail=200
curl http://127.0.0.1:8000/health
```

业务回归：

```text
登录
课程详情
订单
支付
我的课程
```

---

# 19.5 数据库回滚要特别谨慎

应用代码能切 Tag。

数据库不能简单：

```text
git checkout
```

如果 v1.2.0 执行过数据库结构变更：

```sql
ALTER TABLE ...
```

必须提前准备：

```text
向前兼容方案
数据库迁移脚本
备份
Rollback 脚本
```

生产发布前必须明确：

> 新代码回滚以后，旧代码还能不能读取新数据库结构？

这是发布设计的重要部分。

---

# 第二十四章：生产发布前 Checklist

每次正式发布都建议逐项确认：

- [ ] 当前需求已经完成代码评审
- [ ] Feature 已进入 develop
- [ ] develop 已进入 test
- [ ] 测试环境部署成功
- [ ] QA 已完成测试
- [ ] P0 / P1 Bug 已处理
- [ ] 回归测试通过
- [ ] 数据库变更脚本已评审
- [ ] 数据库备份方案已确认
- [ ] `.env.production` 已确认
- [ ] 新版本已进入 master
- [ ] 已创建正式 Git Tag
- [ ] 已记录旧生产版本 Tag
- [ ] 已准备回滚方案
- [ ] 发布负责人明确
- [ ] 测试负责人明确
- [ ] 发布时间已确定
- [ ] 监控已经打开
- [ ] 发布后核心业务验证项已准备

---

# 第四篇：日常研发、发布流程与练习

# 第二十五章：技术负责人完整发布流程

现在把整条链路串起来。

## 阶段 A：需求开发

```text
develop
  ↓
feature/*
```

开发完成：

```text
feature/*
  ↓ PR
develop
```

---

## 阶段 B：集成

技术负责人确认：

```text
代码 Review
单元测试
接口兼容
数据库脚本
配置变更
```

---

## 阶段 C：提测

```text
develop
  ↓
test
```

CI/CD 部署：

```text
test.course.example.com
```

---

## 阶段 D：测试

测试：

```text
冒烟
功能
接口
回归
性能（必要时）
```

Bug：

```text
fix/*
 ↓
develop
 ↓
test
```

---

## 阶段 E：发布

测试通过：

```text
test
 ↓
master
```

打：

```text
v1.2.0
```

---

## 阶段 F：服务器部署

```text
阿里云 ECS
 ↓
git fetch --tags
 ↓
checkout v1.2.0
 ↓
docker compose build
 ↓
docker compose up -d
 ↓
health check
 ↓
业务验证
```

---

## 阶段 G：监控

重点观察：

```text
HTTP 5xx
接口响应时间
CPU
内存
磁盘
数据库连接
错误日志
登录成功率
下单成功率
支付成功率
```

---

# 第二十六章：推荐进一步升级成 CI/CD

当你已经把手工流程彻底做懂以后，再自动化。

最终可以变成：

```text
开发 Push Feature
       ↓
PR / MR
       ↓
自动单元测试
       ↓
合并 develop
       ↓
自动部署开发环境
       ↓
合并 test
       ↓
自动部署测试环境
       ↓
QA PASS
       ↓
Merge master + Tag
       ↓
审批
       ↓
自动构建 Docker Image
       ↓
推送镜像仓库
       ↓
部署 ECS
       ↓
Health Check
       ↓
发布完成
```

真实企业更推荐：

> 构建一次镜像，然后让同一个镜像从测试环境晋级到生产环境。

这样可以减少：

```text
测试环境构建的是 A
生产环境重新构建成了 B
```

这种环境漂移问题。

---

# 第二十七章：推荐目录与部署脚本

生产服务器可以保持：

```text
/opt/course-platform/
├── docker-compose.yml
├── .env.production
├── deploy.sh
└── ...
```

---

# 27.1 一个简单 deploy.sh

```bash
#!/usr/bin/env bash

set -euo pipefail

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: ./deploy.sh v1.2.0"
  exit 1
fi

echo "==> Fetch code"
git fetch origin --tags

echo "==> Checkout $VERSION"
git checkout "$VERSION"

echo "==> Build"
sudo docker compose build

echo "==> Start"
sudo docker compose up -d

echo "==> Status"
sudo docker compose ps

echo "==> Done: $VERSION"
```

增加执行权限：

```bash
chmod +x deploy.sh
```

以后：

```bash
./deploy.sh v1.2.0
```

---

# 第二十八章：完整练习任务

你可以现在真正从零做一遍。

## 任务 1：初始化仓库

做到：

```text
master
develop
test
```

三个远程分支都存在。

---

## 任务 2：做一个 Feature

创建：

```text
feature/login
```

至少做三个 Commit：

```text
feat(auth): add login api
feat(auth): add login validation
test(auth): add login tests
```

---

## 任务 3：进入 develop

模拟 PR/MR。

最终：

```text
feature/login
    ↓
develop
```

---

## 任务 4：进入 test

```text
develop
  ↓
test
```

模拟测试。

---

## 任务 5：发现 Bug

创建：

```text
fix/login-lock
```

修复并重新：

```text
develop
 ↓
test
```

---

## 任务 6：正式发布

```text
test
 ↓
master
```

打：

```text
v1.0.0
```

---

## 任务 7：部署阿里云

服务器：

```bash
git checkout v1.0.0
sudo docker compose build
sudo docker compose up -d
```

验证：

```bash
sudo docker compose ps
curl http://127.0.0.1:8000/health
```

浏览器验证公网服务。

---

## 任务 8：制造一个线上 Bug

从：

```text
master
```

创建：

```text
hotfix/login-error
```

修复。

测试后：

```text
hotfix
 ↓
master
```

打：

```text
v1.0.1
```

生产部署。

最后同步：

```text
develop
test
```

---

# 第二十九章：Git 命令速查表

| 目的 | 命令 |
|---|---|
| 查看当前状态 | `git status` |
| 查看当前分支 | `git branch` |
| 查看所有分支 | `git branch -a` |
| 切换分支 | `git switch develop` |
| 新建并切换 | `git switch -c feature/login` |
| 拉取 | `git pull origin develop` |
| 查看差异 | `git diff` |
| 添加全部修改 | `git add .` |
| 提交 | `git commit -m "feat: xxx"` |
| 推送 | `git push` |
| 首次推分支 | `git push -u origin feature/login` |
| 合并 | `git merge --no-ff feature/login` |
| 拉取远程信息 | `git fetch origin` |
| 查看 Tag | `git tag` |
| 创建 Tag | `git tag -a v1.0.0 -m "release"` |
| 推 Tag | `git push origin v1.0.0` |
| 查看图形历史 | `git log --oneline --graph --all` |
| 放弃未暂存修改 | `git restore file` |
| 取消暂存 | `git restore --staged file` |
| 安全撤销公共提交 | `git revert <commit>` |

---

# 第三十章：你必须真正理解的 11 条原则

1. `master` = 生产。
2. `develop` = 开发集成。
3. `feature/*` = 单个需求。
4. `test` = 当前正式测试候选版本。
5. `release/*` = 测试通过后、正式上线前的发布准备分支（冻结功能 + 回归 + 定版本号）。
6. `hotfix/*` = 从生产版本修线上紧急 Bug。
7. Feature 从 `develop` 创建。
8. Hotfix 从 `master` 创建。
9. 测试通过以后，`test` / `release/*` 才能进入 `master`。
10. 每个正式生产版本必须有 Tag。
11. 生产部署应该部署明确版本，而不是“服务器随便 pull 一下最新代码”。

---

# 最终效果校验

如果你已经真正掌握本教程，你应该可以不看答案完成：

- [ ] 从 0 创建 Git 仓库
- [ ] 创建 master/develop/test
- [ ] 创建 Feature
- [ ] 正确提交多个 Commit
- [ ] Feature 合并 develop
- [ ] develop 合并 test
- [ ] 模拟测试 Bug 修复
- [ ] test 合并 master
- [ ] 创建 v1.0.0
- [ ] 创建阿里云 ECS
- [ ] 正确配置 22/80/443
- [ ] SSH 登录
- [ ] 安装 Git
- [ ] 安装 Docker Engine
- [ ] 使用 Docker Compose 启动应用
- [ ] 配置 Nginx
- [ ] 从生产 Tag 发布
- [ ] 通过日志、Health Check 验证发布
- [ ] 创建 Hotfix
- [ ] 发布 v1.0.1
- [ ] 把 Hotfix 同步回 develop/test
- [ ] 使用旧 Tag 完成生产回滚

当上面的过程你能够独立完成两遍，Git 就不再只是几个命令，而会成为你真正理解的“团队研发和发布系统”。

---

---

# 第五篇：企业级 DevOps 与 CI/CD 基础

# 第三十一章：企业级 Git 项目管理总体架构

## 31.1 为什么前面的“手工发布”还不够

前面你已经学会：

```text
本地开发
→ Feature
→ Develop
→ Test
→ Master
→ Tag
→ SSH 登录服务器
→ Git Checkout
→ Docker Build
→ Docker Compose Up
```

这套流程非常重要，因为它让你真正理解代码从本地到生产经历了什么。

但是企业项目不能长期依赖“某个人 SSH 上服务器手工执行命令”。

因为手工发布会带来：

- 每个人执行步骤可能不一样；
- 容易漏命令；
- 不容易审计；
- Secret 容易散落；
- 构建环境不一致；
- 无法稳定复现；
- 出问题以后很难知道谁发布了什么；
- 多台服务器时操作成本非常高；
- 无法做到标准化回滚。

所以企业级目标应该变成：

```text
Developer
   ↓ Push Feature
GitLab / GitHub
   ↓
Merge Request
   ↓
Code Review
   ↓
CI 自动检查
   ├── Lint
   ├── Unit Test
   ├── Security Scan
   └── Build
   ↓
Merge Develop
   ↓
自动部署开发环境
   ↓
Merge Test
   ↓
自动部署测试环境
   ↓
QA 测试通过
   ↓
Merge Master
   ↓
Git Tag
   ↓
构建不可变 Docker 镜像
   ↓
推送阿里云 ACR
   ↓
生产发布审批
   ↓
阿里云 ECS / Kubernetes
   ↓
Health Check
   ↓
业务验证
   ↓
监控 + 日志 + 告警
```

企业发布体系的核心不是“自动”，而是：

> **标准化、可重复、可审计、可回滚。**

---

# 第三十二章：企业级多环境体系

## 32.1 企业为什么不能只有“测试”和“生产”

建议至少区分：

```text
local
dev
test
staging
prod
```

---

## 32.2 Local 本地环境

用途：

```text
开发者个人调试
单元测试
本地接口验证
```

特点：

- 数据可以随便造；
- 可以开 Debug；
- 日志可以非常详细；
- 不允许使用生产密码；
- 不应该连接生产数据库。

---

## 32.3 Dev 开发联调环境

对应：

```text
develop
```

用途：

- 多开发集成；
- 前后端联调；
- 快速验证 Feature 合并结果。

地址可以是：

```text
https://dev.course.example.com
```

这里允许版本变化频繁。

---

## 32.4 Test 测试环境

对应：

```text
test
```

用途：

- QA 正式测试；
- 回归测试；
- 接口自动化；
- UI 自动化；
- 必要的性能基准验证。

地址：

```text
https://test.course.example.com
```

测试期间不要让开发随意把未经确认的新 Feature 推进来。

---

## 32.5 Staging 预生产环境

这是企业项目非常推荐增加的一层。

用途：

```text
正式发布前最后验证
```

它应该尽量接近生产：

- 操作系统版本相同；
- Docker/Kubernetes 版本接近；
- Nginx 配置接近；
- 环境变量结构相同；
- 中间件版本一致；
- 数据库结构一致；
- 第三方服务使用沙箱或正式测试账号。

地址：

```text
https://staging.course.example.com
```

注意：

> Staging 不代表可以复制真实生产敏感数据。

如需生产数据脱敏副本，必须遵循企业数据安全制度。

---

## 32.6 Prod 生产环境

对应：

```text
master + release tag
```

特点：

- 只运行正式发布版本；
- 禁止 Debug；
- 禁止开发直接改代码；
- 禁止开发直接改数据库；
- Secret 受控；
- 发布必须有记录；
- 必须有监控；
- 必须有回滚方案。

---

# 第三十三章：企业级分支保护、权限和 CODEOWNERS

## 33.1 为什么一定要保护分支

企业最危险的操作之一就是：

```bash
git push origin master
```

如果任何开发都能直接 Push：

```text
未 Review 的代码
未测试的代码
临时 Debug 代码
错误配置
```

都可能直接进入生产。

因此：

```text
master
develop
test
```

都建议设置 Protected Branch。

`release/*` 是临时发布分支，通常不需要长期加入保护名单；但在发布准备窗口内，同样建议只有发布负责人 / Tech Lead 能往上面合并，避免开发随手把新功能塞进即将上线的版本。

---

## 33.2 推荐权限

### master

建议：

```text
Developer：
不能直接 Push
不能 Force Push
不能删除
不能绕过 MR

Maintainer / Release Manager：
可以在满足规则后 Merge
```

推荐至少：

```text
1~2 人 Code Review
CI 必须成功
Code Owner 必须批准关键目录
```

---

## 33.3 develop

建议：

```text
Developer：
可以创建 Feature
可以提交 MR

develop：
禁止直接 Push
MR 通过才可进入
```

---

## 33.4 test

建议：

只有：

```text
Release Manager
Tech Lead
CI/CD Service Account
```

能够合并。

普通开发不建议随便操作。

---

## 33.5 CODEOWNERS

当项目变大以后，一个 Tech Lead 不可能 Review 所有模块。

例如：

```text
后端用户模块 → 用户团队
支付模块 → 交易团队
前端 → Web 团队
CI/CD → DevOps
数据库 Migration → DBA / Tech Lead
```

可以创建：

```text
CODEOWNERS
```

示意：

```text
/src/payment/       @payment-team
/src/auth/          @backend-team
/frontend/          @frontend-team
/.gitlab-ci.yml     @devops-team
/db/migrations/     @backend-lead @dba
```

这样修改高风险目录时，会自动要求对应负责人 Review。

---

# 第三十四章：企业级 CI/CD：从代码提交到自动检查

## 34.1 CI 和 CD 分别是什么

CI：

```text
Continuous Integration
持续集成
```

核心：

```text
代码一提交
↓
自动检查
↓
尽快告诉开发代码有没有问题
```

CD：

```text
Continuous Delivery / Deployment
持续交付 / 持续部署
```

核心：

```text
测试通过的版本
↓
自动准备部署
↓
经过审批或自动发布到环境
```

---

## 34.2 推荐 Pipeline 阶段

企业项目建议：

```text
validate
  ↓
test
  ↓
security
  ↓
build
  ↓
package
  ↓
deploy_dev/test
  ↓
deploy_staging
  ↓
approve_prod
  ↓
deploy_prod
  ↓
verify
```

---

# 34.3 一个完整 `.gitlab-ci.yml` 示例

下面用 Docker 项目举例。

```yaml
stages:
  - validate
  - test
  - build
  - deploy_test
  - deploy_prod

variables:
  IMAGE_NAME: "$CI_REGISTRY_IMAGE"
  IMAGE_TAG: "$CI_COMMIT_SHORT_SHA"

validate:
  stage: validate
  script:
    - echo "run lint"
    - echo "run format check"

unit_test:
  stage: test
  script:
    - echo "run unit tests"
    - pytest

build_image:
  stage: build
  script:
    - docker build -t "$IMAGE_NAME:$IMAGE_TAG" .
    - docker push "$IMAGE_NAME:$IMAGE_TAG"
  only:
    - develop
    - test
    - master

deploy_test:
  stage: deploy_test
  script:
    - echo "deploy test environment"
  only:
    - test

deploy_prod:
  stage: deploy_prod
  when: manual
  script:
    - echo "deploy production"
  only:
    - master
```

这只是教学骨架。

真实企业还要加入：

```text
Secret
权限
Runner
ACR 登录
环境保护
审批
健康检查
失败回滚
通知
```

---

## 34.4 Pipeline 失败怎么办

原则：

> CI 失败就不允许继续向下游发布。

例如：

```text
Unit Test Failed
```

不应该：

```text
“没关系，先上线看看。”
```

正确流程：

```text
Pipeline 红色
↓
开发查看日志
↓
本地复现
↓
修复
↓
重新 Commit
↓
重新 Pipeline
↓
全部绿色
```

---

# 第三十五章：企业级 Docker 镜像管理与阿里云 ACR

## 35.1 为什么生产不应该在 ECS 现场 Build

学习阶段这样做：

```bash
git checkout v1.0.0
docker compose build
```

有助于理解流程。

但成熟生产环境推荐：

```text
CI Build
↓
生成 Docker Image
↓
Push Registry
↓
测试
↓
生产 Pull 同一个 Image
```

为什么？

因为：

```text
测试验证的是 Image A
生产部署的也必须是 Image A
```

而不是：

```text
测试服务器重新 Build 一次
生产服务器又重新 Build 一次
```

两次 Build 可能产生差异。

---

## 35.2 使用阿里云 ACR

ACR：

```text
Alibaba Cloud Container Registry
```

可以用来保存：

```text
course-platform:v1.0.0
course-platform:v1.1.0
course-platform:v1.1.1
```

企业推荐同时保留：

```text
版本号 Tag
Git Commit SHA
```

例如：

```text
course-platform:v1.2.0
course-platform:7ac42fd
```

---

## 35.3 不建议只使用 latest

不要生产只依赖：

```text
course-platform:latest
```

因为你很难知道：

```text
latest 到底是哪次构建？
```

推荐：

```text
registry.example.com/course-platform:v1.2.0
```

---

## 35.4 Build

```bash
docker build \
  -t registry.example.com/course-platform:v1.2.0 .
```

---

## 35.5 Push

登录镜像仓库后：

```bash
docker push \
  registry.example.com/course-platform:v1.2.0
```

---

## 35.6 生产环境 Pull

ECS：

```bash
docker pull \
  registry.example.com/course-platform:v1.2.0
```

`docker-compose.yml`：

```yaml
services:
  app:
    image: registry.example.com/course-platform:v1.2.0
    restart: unless-stopped
```

生产服务器不再需要：

```text
源代码
编译器
Node 构建环境
Maven
Python Build Toolchain
```

减少攻击面和环境差异。

---

# 第三十六章：企业级 Secret 和配置管理

## 36.1 什么是 Secret

例如：

```text
数据库密码
Redis 密码
JWT Secret
支付宝/微信支付密钥
阿里云 AccessKey
短信 Secret
第三方 API Token
SSH 私钥
```

这些不能写进 Git。

---

## 36.2 绝对不要这样做

```python
DB_PASSWORD = "123456"
```

然后：

```bash
git add .
git commit
git push
```

一旦进入 Git 历史：

```text
你后来删掉文件也不代表 Secret 安全了。
```

应该立即：

```text
撤销/轮换 Secret
```

而不是只改 Git。

---

## 36.3 CI Secret

使用 GitLab/GitHub CI Variables。

例如：

```text
DB_PASSWORD
ACR_USERNAME
ACR_PASSWORD
SSH_PRIVATE_KEY
JWT_SECRET
```

不要：

```yaml
variables:
  DB_PASSWORD: "real_password"
```

直接写在 CI 文件里。

---

## 36.4 生产环境变量

ECS 可以保存：

```text
.env.production
```

但必须：

```text
chmod 600
```

例如：

```bash
chmod 600 .env.production
```

并限制：

```text
只有部署账号可读
```

更成熟的系统可以使用：

```text
Vault
阿里云 KMS / Secret 管理
Kubernetes Secrets + 外部 Secret 管理
```

---

# 第三十七章：HTTPS、域名与生产 Nginx

## 37.1 为什么生产必须 HTTPS

HTTP 明文传输。

登录密码、Token、Cookie、用户数据都有风险。

生产应该：

```text
HTTPS
```

---

## 37.2 域名解析

假设：

```text
course.example.com
```

DNS A 记录指向：

```text
47.xx.xx.xx
```

等待解析生效。

检查：

```bash
nslookup course.example.com
```

---

## 37.3 Nginx HTTP 配置

```nginx
server {
    listen 80;
    server_name course.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 37.4 HTTPS 证书

企业可使用：

```text
阿里云 SSL 证书
Let's Encrypt
商业证书
```

配置完成以后：

```text
https://course.example.com
```

必须验证：

- 证书有效；
- 域名正确；
- 未过期；
- HTTP 自动跳 HTTPS；
- API 不出现 Mixed Content。

---

## 37.5 Nginx HTTPS 示例

```nginx
server {
    listen 80;
    server_name course.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name course.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

改完：

```bash
sudo nginx -t
```

成功后：

```bash
sudo systemctl reload nginx
```

---

# 第三十八章：数据库 Migration 企业规范

## 38.1 为什么数据库发布比代码发布更危险

代码：

```text
v1.2.0 → v1.1.0
```

可以快速换镜像。

数据库却可能已经：

```text
新增字段
删除字段
改类型
修改大量数据
```

所以数据库版本必须独立治理。

---

## 38.2 Migration 工具

不同技术栈常见：

```text
Java：Flyway / Liquibase
Python：Alembic / Django Migration
Node：Prisma / Sequelize / TypeORM Migration
```

原则是：

> 数据库结构变更必须成为代码仓库里可追踪的版本文件。

---

## 38.3 禁止生产手工随便执行 SQL

错误：

```text
开发：
“我 SSH 上去直接改一下表。”
```

企业推荐：

```text
Migration Script
↓
Code Review
↓
测试环境执行
↓
验证
↓
备份
↓
生产审批
↓
Migration
↓
验证
```

---

## 38.4 Expand / Migrate / Contract

这是非常重要的生产兼容思想。

假设：

```text
原字段：user_name
新字段：display_name
```

不要一次直接：

```sql
DROP COLUMN user_name;
```

推荐：

### 第一步 Expand

新增：

```text
display_name
```

旧字段继续存在。

---

### 第二步 Migrate

新旧代码兼容。

数据逐步迁移：

```text
user_name → display_name
```

---

### 第三步 Contract

确认旧版本不再依赖：

```text
user_name
```

以后再删除。

这样生产回滚风险明显降低。

---

# 第三十九章：企业级发布策略：滚动、蓝绿和灰度

## 39.1 为什么不能永远“停服务 → 更新 → 启动”

单服务器学习环境：

```bash
docker compose down
docker compose up -d
```

可以理解流程。

真实生产用户很多时：

```text
停机
```

意味着用户直接不可用。

---

## 39.2 Rolling Update 滚动发布

假设：

```text
4 个实例
```

逐台替换：

```text
V1 V1 V1 V1

↓

V2 V1 V1 V1

↓

V2 V2 V1 V1

↓

V2 V2 V2 V1

↓

V2 V2 V2 V2
```

优势：

```text
不中断全部服务
```

---

## 39.3 Blue-Green 蓝绿发布

生产当前：

```text
Blue = v1.1.0
```

另外搭：

```text
Green = v1.2.0
```

验证 Green：

```text
Health Check
Smoke Test
```

然后流量：

```text
Blue → Green
```

如果出问题：

```text
Green → Blue
```

回滚非常快。

---

## 39.4 Canary 灰度发布

例如：

```text
5%
↓
20%
↓
50%
↓
100%
```

每一步观察：

```text
错误率
响应时间
登录成功率
支付成功率
课程播放成功率
```

异常立即：

```text
停止放量
回滚
```

---

## 39.5 课程平台推荐核心灰度指标

至少关注：

```text
HTTP 5xx
P95 响应时间
登录失败率
下单失败率
支付成功率
课程权限开通成功率
视频播放失败率
退款接口失败率
```

---

# 第四十章：Health Check 与自动验证

## 40.1 为什么应用启动不等于可用

容器显示：

```text
Up
```

不代表：

```text
数据库正常
Redis 正常
关键依赖正常
业务可用
```

应该提供：

```text
/health
```

---

## 40.2 基础 Health Check

响应：

```json
{
  "status": "UP"
}
```

---

## 40.3 Docker Healthcheck

```dockerfile
HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

---

## 40.4 发布后自动 Smoke Test

至少：

```bash
curl -f https://course.example.com/health
```

然后运行：

```text
登录
课程搜索
课程详情
```

更成熟可以执行一套：

```text
production-smoke-tests
```

只测试不产生破坏性数据的关键链路。

---

# 第四十一章：监控、日志与告警

## 41.1 企业发布完成以后最怕什么

不是：

```text
发布命令报错
```

而是：

```text
发布命令显示成功
但真实用户已经大量失败
```

因此发布必须配监控。

---

## 41.2 三大观测体系

### Metrics 指标

例如：

```text
CPU
Memory
Load
Disk
HTTP QPS
HTTP 5xx
P95/P99
DB Connections
Redis Connections
```

工具：

```text
Prometheus
Grafana
阿里云云监控
```

---

### Logs 日志

推荐至少有：

```text
access log
application log
error log
audit log
```

集中日志：

```text
ELK
OpenSearch
Loki
阿里云日志服务 SLS
```

---

### Traces 链路追踪

微服务项目推荐：

```text
OpenTelemetry
Jaeger
SkyWalking
```

可以看到：

```text
用户下单
↓
Order Service
↓
Payment Service
↓
Course Permission Service
↓
Database
```

哪个环节慢或失败。

---

## 41.3 日志必须带什么

建议：

```text
timestamp
level
service
trace_id
request_id
user_id（注意脱敏）
uri
error_code
message
```

不要写：

```text
明文密码
完整 Token
银行卡敏感信息
支付密钥
身份证明文
```

---

## 41.4 告警不要只告警 CPU

业务告警非常重要。

例如：

```text
5 分钟支付成功率 < 95%
课程权限开通失败 > 10 次
HTTP 5xx > 阈值
P95 > 2s
```

通知：

```text
钉钉
企业微信
短信
电话
PagerDuty 等
```

---

# 第四十二章：发布审批、审计与变更管理

## 42.1 谁可以发生产

企业不建议：

```text
所有开发都能随时 Deploy Prod
```

推荐：

```text
Developer
  ↓
MR
  ↓
Reviewer
  ↓
QA PASS
  ↓
Release Approval
  ↓
CI/CD Service Account
  ↓
Production
```

---

## 42.2 一次正式发布应该记录什么

至少：

```text
版本号
Git Tag
Commit SHA
镜像 Digest / Tag
需求列表
Bug 列表
数据库 Migration
配置变更
发布人
审批人
测试负责人
开始时间
结束时间
回滚版本
最终结果
```

---

## 42.3 发布单模板

```markdown
# Release v1.2.0

## 基本信息

- Version: v1.2.0
- Git Commit:
- Docker Image:
- Release Time:
- Release Owner:

## Changes

- COURSE-102：课程搜索
- ORDER-203：优惠券结算
- LEARN-108：学习进度

## Database

- Migration: V20260825_01.sql
- Backup: Done

## Verification

- Unit Test: PASS
- API Test: PASS
- QA Regression: PASS
- Staging: PASS

## Risk

- 支付模块有修改
- 需要重点监控支付成功率

## Rollback

- Previous Version: v1.1.3
- Previous Image:
```

---

# 第四十三章：生产故障响应与回滚 SOP

## 43.1 发布后发现问题先做什么

不是马上找人背锅。

先判断：

```text
影响范围
严重程度
是否继续放量
是否回滚
```

---

## 43.2 推荐故障等级

例如：

```text
P0：系统整体不可用 / 支付大面积失败
P1：核心业务严重受损
P2：部分用户或非核心功能异常
P3：轻微问题
```

---

## 43.3 发布事故 SOP

```text
告警
↓
确认影响
↓
暂停继续发布
↓
通知负责人
↓
判断回滚还是 Hotfix
↓
恢复服务
↓
确认业务恢复
↓
保留日志/证据
↓
事故复盘
```

核心原则：

> **先恢复服务，再慢慢分析根因。**

---

## 43.4 什么时候优先回滚

例如：

```text
P0/P1
原因暂时不明确
新版本刚上线
旧版本可以安全恢复
```

优先：

```text
Rollback
```

而不是在生产环境现场 Debug 半小时。

---

## 43.5 事故复盘

复盘不要只写：

```text
某某粗心。
```

应该问：

```text
为什么代码能进入 master？
为什么 CI 没发现？
为什么测试环境没发现？
为什么监控晚发现？
为什么回滚慢？
```

最终产生：

```text
Action Item
Owner
Deadline
```

例如：

```text
增加订单幂等自动化用例
增加支付成功率告警
支付模块要求 Code Owner Review
增加数据库 Migration 检查
```

---

# 第四十四章：企业级安全发布基础

## 44.1 CI/CD 权限最小化

Runner / Deploy Account 只给需要的权限。

例如生产部署账号：

```text
可以 Pull 指定镜像
可以重启应用
```

不一定需要：

```text
整个阿里云账号 Administrator 权限
```

---

## 44.2 阿里云 AccessKey

不要：

```text
使用主账号 AccessKey
写进 Git
写进镜像
写死在 Dockerfile
```

应该：

```text
RAM 子账号 / RAM Role
最小权限
定期轮换
```

---

## 44.3 镜像安全

建议 CI 做：

```text
依赖漏洞扫描
镜像漏洞扫描
Secret 扫描
SAST
```

发现高危漏洞时：

```text
阻止发布
```

具体是否阻断，由企业安全策略决定。

---

## 44.4 基础镜像

不要随便：

```dockerfile
FROM something:latest
```

推荐固定版本：

```dockerfile
FROM python:3.12.5-slim
```

生产更严格时可以锁：

```text
Image Digest
```

保证构建可复现。

---

# 第四十五章：从 Docker Compose 演进到 Kubernetes

## 45.1 什么时候不需要 Kubernetes

如果只有：

```text
1~2 台服务器
几个服务
流量不大
团队很小
```

Docker Compose 完全可以用。

不要为了“高级”强行 Kubernetes。

---

## 45.2 什么时候开始考虑 Kubernetes

例如：

```text
服务越来越多
实例越来越多
需要自动扩缩容
需要滚动更新
需要自动恢复
多环境复杂
发布频繁
```

这时 Kubernetes 价值会明显增加。

---

## 45.3 Kubernetes 核心对象

先理解：

```text
Pod
Deployment
Service
ConfigMap
Secret
Ingress
HPA
```

---

## 45.4 Deployment 示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: course-platform
spec:
  replicas: 3

  selector:
    matchLabels:
      app: course-platform

  template:
    metadata:
      labels:
        app: course-platform

    spec:
      containers:
        - name: app
          image: registry.example.com/course-platform:v1.2.0

          ports:
            - containerPort: 8000

          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
```

---

## 45.5 Kubernetes 发布

修改：

```text
v1.1.0
```

为：

```text
v1.2.0
```

然后：

```bash
kubectl apply -f deployment.yaml
```

查看：

```bash
kubectl rollout status deployment/course-platform
```

历史：

```bash
kubectl rollout history deployment/course-platform
```

回滚：

```bash
kubectl rollout undo deployment/course-platform
```

---

# 第四十六章：企业级完整 CI/CD 参考实现

## 46.1 最终目标

```text
Feature Commit
  ↓
Lint
  ↓
Unit Test
  ↓
SAST / Dependency Scan
  ↓
Merge Request Review
  ↓
Develop
  ↓
Build Image
  ↓
Push ACR
  ↓
Deploy Dev
  ↓
Integration Test
  ↓
Test
  ↓
Deploy Test
  ↓
API/UI Regression
  ↓
Staging
  ↓
Smoke Test
  ↓
QA Sign-off
  ↓
Master
  ↓
Release Tag
  ↓
Manual Production Approval
  ↓
Deploy Immutable Image
  ↓
Health Check
  ↓
Canary / Rolling
  ↓
Production Smoke Test
  ↓
Monitoring
```

---

## 46.2 一个更完整的 Pipeline 骨架

```yaml
stages:
  - lint
  - unit_test
  - security
  - build
  - deploy_test
  - integration_test
  - deploy_staging
  - deploy_prod
  - verify

lint:
  stage: lint
  script:
    - ./scripts/lint.sh

unit_test:
  stage: unit_test
  script:
    - ./scripts/unit-test.sh

security_scan:
  stage: security
  script:
    - ./scripts/security-scan.sh

build:
  stage: build
  script:
    - ./scripts/build-image.sh
  artifacts:
    reports:
      dotenv: build.env

deploy_test:
  stage: deploy_test
  script:
    - ./scripts/deploy-test.sh
  rules:
    - if: '$CI_COMMIT_BRANCH == "test"'

integration_test:
  stage: integration_test
  script:
    - ./scripts/api-regression.sh

deploy_staging:
  stage: deploy_staging
  script:
    - ./scripts/deploy-staging.sh
  rules:
    - if: '$CI_COMMIT_BRANCH == "master"'

deploy_prod:
  stage: deploy_prod
  when: manual
  environment:
    name: production
  script:
    - ./scripts/deploy-prod.sh
  rules:
    - if: '$CI_COMMIT_TAG'

verify:
  stage: verify
  script:
    - ./scripts/prod-smoke-test.sh
```

重点不是复制。

你需要理解每个 Stage 为什么存在。

---

# 第四十七章：企业级目录建议

项目可以组织为：

```text
course-platform/
├── src/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── db/
│   └── migrations/
├── deploy/
│   ├── dev/
│   ├── test/
│   ├── staging/
│   └── prod/
├── docker/
├── scripts/
│   ├── lint.sh
│   ├── unit-test.sh
│   ├── build-image.sh
│   ├── deploy-test.sh
│   ├── deploy-prod.sh
│   ├── rollback.sh
│   └── smoke-test.sh
├── docs/
│   ├── architecture.md
│   ├── runbook.md
│   └── release.md
├── .gitignore
├── .dockerignore
├── .gitlab-ci.yml
├── CODEOWNERS
├── Dockerfile
└── README.md
```

---

# 第四十八章：企业级发布 Runbook

## 48.1 什么是 Runbook

Runbook：

> 当某件事情发生时，任何合格工程师都能按照步骤完成操作。

避免：

```text
“只有老王知道怎么发布。”
```

---

## 48.2 Production Deployment Runbook

### 发布前

```text
1. 确认 Release Tag
2. 确认镜像
3. QA Sign-off
4. 检查 Migration
5. 检查备份
6. 检查监控
7. 确认回滚版本
8. 发布审批
```

### 发布中

```text
1. 开始发布
2. 观察 Pipeline
3. 观察实例
4. Health Check
5. Smoke Test
6. 观察 Metrics
```

### 发布后

```text
1. 业务验证
2. 观察 5xx
3. 观察 P95
4. 观察业务成功率
5. QA 确认
6. 发布结束
```

### 异常

```text
1. 停止放量
2. 判断严重程度
3. Rollback
4. 验证恢复
5. 通知
6. 事故复盘
```

---

# 第四十九章：企业级 Git + DevOps 最终规范

## 49.1 分支规范

```text
master
develop
test
feature/*
fix/*
release/*
hotfix/*
```

> `release/*` 用于测试通过之后、正式上线之前的发布准备阶段，把 `develop` 中已完成的功能锁定成某一候选版本，回归、定版本号后再合并进 `master` 并打 Tag。

---

## 49.2 Commit 规范

推荐 Conventional Commit 风格：

```text
feat:
fix:
refactor:
test:
docs:
chore:
perf:
ci:
build:
```

例如：

```text
feat(course): add course search
fix(order): prevent duplicate payment callback
perf(course): optimize course query
ci: add image security scan
```

---

## 49.3 版本规范

```text
v1.0.0
v1.1.0
v1.1.1
```

生产只能部署明确版本。

---

## 49.4 构建规范

```text
一次构建
多环境晋级
```

不建议：

```text
每个环境重新 Build。
```

---

## 49.5 配置规范

```text
代码与配置分离
Secret 不入 Git
生产配置权限受控
```

---

## 49.6 发布规范

```text
有审批
有版本
有测试
有回滚
有监控
有记录
```

---

## 49.7 数据库规范

```text
Migration 入库
Review
测试环境先执行
生产备份
兼容回滚
禁止随意手改
```

---

## 49.8 安全规范

```text
最小权限
Secret 管理
依赖扫描
镜像扫描
Protected Branch
Code Owner
审计
```

---

## 49.9 观测规范

```text
Metrics
Logs
Traces
Alerts
```

---

# 项目实战前置：三环境 URL 与最终交付目标

在进入 4 项目 GitHub Actions 综合实战之前，先明确最终要交付什么，并把测试/生产 URL、DNS、Nginx、HTTPS 的完整搭建方式走通。

# 最终交付目标：拿到两个真实可访问的 URL

这份教程最终不是以“Git 命令执行成功”作为结束，而是以**测试环境和生产环境都可以通过浏览器正常访问**作为最终交付结果。

## 最终你应该拿到的两个地址

教学示例统一使用：

```text
测试环境：
https://test.course.example.com

生产环境：
https://course.example.com
```

如果你还没有正式域名，也可以先用阿里云 ECS 公网 IP 验证：

```text
测试环境：
http://<TEST_ECS_PUBLIC_IP>

生产环境：
http://<PROD_ECS_PUBLIC_IP>
```

但企业正式上线推荐使用：

```text
https://test.course.example.com
https://course.example.com
```

而不是长期让用户直接访问 IP。

---

## 环境与 Git 分支的最终对应关系

| 环境 | Git 来源 | 推荐 URL | 用途 |
|---|---|---|---|
| 本地 Local | `feature/*` | `http://localhost:8000` | 开发个人调试 |
| 开发 Dev | `develop` | `https://dev.course.example.com` | 开发联调 |
| 测试 Test | `test` | `https://test.course.example.com` | QA 正式测试 |
| 预生产 Staging | `master` 候选版本 / RC Tag | `https://staging.course.example.com` | 上线前最终验证 |
| 生产 Prod | `master` + Release Tag | `https://course.example.com` | 正式用户访问 |

本教程最重要的最终两个地址是：

```text
https://test.course.example.com
https://course.example.com
```

---

# 测试环境 URL 从零搭建

## 1. 准备测试 ECS

假设测试服务器信息：

```text
名称：course-platform-test
公网 IP：47.100.10.20
系统：Ubuntu 24.04
```

注意：

> `47.100.10.20` 是教学示例。请替换成你自己的阿里云测试 ECS 公网 IP。

---

## 2. 配置测试域名 DNS

假设你已经拥有：

```text
example.com
```

在域名 DNS 控制台添加：

```text
记录类型：A
主机记录：test
记录值：47.100.10.20
TTL：默认
```

最终：

```text
test.course.example.com
```

如果你的主域名实际上是：

```text
mycompany.com
```

你可以设计：

```text
test.course.mycompany.com
```

或者更简单：

```text
test.mycompany.com
```

教程中的域名只是示例，企业应按照自己的域名规划替换。

---

## 3. 验证 DNS

本地电脑执行：

```bash
nslookup test.course.example.com
```

或者：

```bash
ping test.course.example.com
```

重点不是 Ping 一定成功，而是域名解析出来的 IP 应该是测试 ECS：

```text
47.100.10.20
```

---

## 4. 测试服务器 Nginx 配置

创建：

```bash
sudo nano /etc/nginx/sites-available/course-platform-test
```

写入：

```nginx
server {
    listen 80;
    server_name test.course.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用：

```bash
sudo ln -s \
  /etc/nginx/sites-available/course-platform-test \
  /etc/nginx/sites-enabled/course-platform-test
```

检查：

```bash
sudo nginx -t
```

成功后：

```bash
sudo systemctl reload nginx
```

---

## 5. 测试环境 Docker Compose

测试服务器：

```yaml
services:
  app:
    image: registry.example.com/course-platform:test
    container_name: course-platform-test
    restart: unless-stopped

    env_file:
      - .env.test

    ports:
      - "127.0.0.1:8000:8000"
```

测试环境变量：

```env
APP_ENV=test
APP_PORT=8000

DB_HOST=<TEST_DB_HOST>
DB_NAME=course_platform_test
DB_USER=<TEST_DB_USER>
DB_PASSWORD=<TEST_DB_PASSWORD>
```

原则：

```text
测试环境必须连接测试数据库。
```

绝对不能因为“方便”连接生产数据库。

---

## 6. test 分支部署

代码流程：

```text
feature/*
   ↓
develop
   ↓
test
```

CI/CD 识别：

```text
test 分支
```

然后部署测试环境。

手工学习阶段可以：

```bash
git switch test
git pull origin test

sudo docker compose -f docker-compose.test.yml pull
sudo docker compose -f docker-compose.test.yml up -d
```

---

## 7. 测试服务器本机验证

先：

```bash
curl http://127.0.0.1:8000/health
```

预期：

```json
{
  "status": "UP"
}
```

再：

```bash
curl http://127.0.0.1
```

如果 Nginx 正常，应返回应用内容。

---

## 8. 浏览器验证测试 URL

在自己的电脑浏览器打开：

```text
http://test.course.example.com
```

HTTP 能访问以后再配置 HTTPS。

最终要求：

```text
https://test.course.example.com
```

---

## 9. 测试环境最终验收

访问：

```text
https://test.course.example.com
```

至少验证：

1. 首页正常打开；
2. 登录正常；
3. 课程搜索正常；
4. 课程详情正常；
5. 创建测试订单正常；
6. 接口请求域名正确；
7. 数据写入测试数据库；
8. 页面不存在明显 404 / 502 / 500；
9. HTTPS 证书有效；
10. 测试数据不会进入生产库。

完成以后，你真正得到了：

```text
测试环境 URL：
https://test.course.example.com
```

---

# 生产环境 URL 从零搭建

## 1. 准备独立生产 ECS

教学示例：

```text
名称：course-platform-prod
公网 IP：47.100.20.30
系统：Ubuntu 24.04
```

生产和测试推荐使用不同服务器。

企业更不能出现：

```text
同一个 Docker Compose
同一个数据库
同一个 .env
```

同时给 Test 和 Prod 使用。

---

## 2. 配置生产域名 DNS

添加：

```text
记录类型：A
主机记录：course
记录值：47.100.20.30
```

最终：

```text
course.example.com
```

如果你希望直接使用主域名：

```text
www.example.com
```

也完全可以。

本教程只是统一采用：

```text
course.example.com
```

方便区分业务。

---

## 3. 验证生产 DNS

```bash
nslookup course.example.com
```

应该解析到：

```text
47.100.20.30
```

---

## 4. 生产 Nginx

```bash
sudo nano /etc/nginx/sites-available/course-platform-prod
```

写入：

```nginx
server {
    listen 80;
    server_name course.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用：

```bash
sudo ln -s \
  /etc/nginx/sites-available/course-platform-prod \
  /etc/nginx/sites-enabled/course-platform-prod
```

验证：

```bash
sudo nginx -t
```

重载：

```bash
sudo systemctl reload nginx
```

---

## 5. 生产环境必须部署 Release Tag

测试环境可以跟：

```text
test
```

生产环境不要简单跟着：

```text
master latest
```

推荐：

```text
master
↓
v1.0.0
↓
Docker Image
```

例如：

```bash
git tag -a v1.0.0 -m "release v1.0.0"
git push origin v1.0.0
```

CI 生成：

```text
course-platform:v1.0.0
```

生产部署的也是：

```text
course-platform:v1.0.0
```

---

## 6. 生产 Docker Compose

```yaml
services:
  app:
    image: registry.example.com/course-platform:v1.0.0
    container_name: course-platform-prod
    restart: unless-stopped

    env_file:
      - .env.production

    ports:
      - "127.0.0.1:8000:8000"
```

生产变量：

```env
APP_ENV=production
APP_PORT=8000

DB_HOST=<PROD_DB_HOST>
DB_NAME=course_platform_prod
DB_USER=<PROD_DB_USER>
DB_PASSWORD=<PROD_DB_PASSWORD>
```

这些值不能提交 Git。

---

## 7. 发布生产

生产服务器：

```bash
cd /opt/course-platform
```

拉镜像：

```bash
sudo docker compose -f docker-compose.prod.yml pull
```

启动：

```bash
sudo docker compose -f docker-compose.prod.yml up -d
```

检查：

```bash
sudo docker compose -f docker-compose.prod.yml ps
```

日志：

```bash
sudo docker compose -f docker-compose.prod.yml logs --tail=200
```

---

## 8. 生产本机 Health Check

```bash
curl http://127.0.0.1:8000/health
```

预期：

```json
{
  "status": "UP"
}
```

---

## 9. Nginx 验证

```bash
curl http://127.0.0.1
```

---

## 10. 浏览器验证生产 URL

访问：

```text
http://course.example.com
```

然后完成 HTTPS。

最终地址：

```text
https://course.example.com
```

---

# 给测试和生产分别配置 HTTPS

## 1. 测试环境

证书需要覆盖：

```text
test.course.example.com
```

Nginx 最终：

```nginx
server {
    listen 80;
    server_name test.course.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name test.course.example.com;

    ssl_certificate     /etc/nginx/ssl/test/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/test/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

最终：

```text
https://test.course.example.com
```

---

## 2. 生产环境

证书覆盖：

```text
course.example.com
```

Nginx：

```nginx
server {
    listen 80;
    server_name course.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name course.example.com;

    ssl_certificate     /etc/nginx/ssl/prod/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/prod/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

最终：

```text
https://course.example.com
```

---

# 企业级最终发布结果

整个教程做完以后，你不是提交一份“Git 操作截图”。

真正的最终产出应该是下面这些。

## 交付物 1：代码仓库

```text
master
develop
test
feature/*
fix/*
release/*
hotfix/*
```

---

## 交付物 2：测试环境

```text
Environment：TEST
Git Branch：test

URL：
https://test.course.example.com
```

验证人员：

```text
开发
测试
产品（必要时）
```

---

## 交付物 3：生产环境

```text
Environment：PROD
Git Source：master
Release：v1.0.0

URL：
https://course.example.com
```

访问人员：

```text
正式用户
```

---

## 交付物 4：版本记录

例如：

```text
Test:
Branch = test
Commit = 7ac42fd

Production:
Branch = master
Tag = v1.0.0
Commit = a8132cd
Image = course-platform:v1.0.0
```

---

# 企业验收时最终应该这样汇报

可以直接按照下面格式整理：

```markdown
# Course Platform Deployment Result

## Test Environment

Environment: TEST

Branch:
test

Version:
test-20260825

URL:
https://test.course.example.com

Status:
PASS

Verification:
- 首页：PASS
- 登录：PASS
- 课程搜索：PASS
- 创建订单：PASS
- 我的课程：PASS


## Production Environment

Environment: PROD

Branch:
master

Release:
v1.0.0

Docker Image:
course-platform:v1.0.0

URL:
https://course.example.com

Status:
PASS

Verification:
- Health Check：PASS
- 首页：PASS
- 登录：PASS
- 课程搜索：PASS
- 创建订单：PASS
- 我的课程：PASS
```

---

# 最终成功标准

只有同时满足下面条件，这个项目才算真正完成：

- [ ] `feature/*` 开发流程跑通
- [ ] `develop` 集成流程跑通
- [ ] `test` 分支部署完成
- [ ] `master` 正式发布完成
- [ ] Release Tag 创建完成
- [ ] Docker 镜像有明确版本
- [ ] 测试数据库和生产数据库隔离
- [ ] 测试 Secret 和生产 Secret 隔离
- [ ] Nginx 配置完成
- [ ] HTTPS 配置完成
- [ ] 阿里云安全组配置完成
- [ ] 测试 URL 可以公网访问
- [ ] 生产 URL 可以公网访问
- [ ] 测试环境核心流程验证通过
- [ ] 生产 Smoke Test 通过
- [ ] 有日志
- [ ] 有监控
- [ ] 有回滚版本

最终你必须能够把这两个地址交给团队：

```text
测试环境：
https://test.course.example.com

生产环境：
https://course.example.com
```

> 当测试人员可以拿测试 URL 开始测试，正式用户可以通过生产 URL 使用系统，这才是真正意义上的“从本地代码部署到生产完成”。

# 第六篇：4 项目 GitHub Actions 综合实战

# 第五十章：综合项目实战——4 个真实项目 + GitHub Actions + Dev/Test/Prod

> 本章是整套教程的最终综合实战。  
> 你将使用 4 个真实技术栈项目，完成从 Git 分支、GitHub Actions、Docker 镜像、阿里云 ECS、MySQL、Redis、Nginx、HTTPS，一直到开发、测试、生产 URL 最终交付的完整闭环。

## 53.1 本次实战项目

我们假设你已经拥有下面 4 个独立项目：

```text
1. mobile-uniapp
   └── 移动端：uni-app

2. web-next
   └── PC 用户网站：Next.js + React

3. api-fastapi
   └── API：FastAPI + MySQL + Redis

4. admin-react
   └── 管理后台：React
```

企业中这 4 个项目建议分别建立独立 GitHub Repository：

```text
your-org/mobile-uniapp
your-org/web-next
your-org/api-fastapi
your-org/admin-react
```

这样每个项目可以：

- 独立开发；
- 独立 Code Review；
- 独立构建；
- 独立发布；
- 独立回滚；
- 独立控制权限；
- 独立查看 GitHub Actions 历史。

---

# 第五十一章：先确定最终交付结果

## 54.1 三套环境最终 URL

本实战最终要交付的不只是服务器，而是下面这些真正能打开的 URL。

### Development

```text
移动端 H5：
https://m-dev.course.example.com

PC 网站：
https://dev.course.example.com

API：
https://api-dev.course.example.com

API 文档：
https://api-dev.course.example.com/docs

Admin：
https://admin-dev.course.example.com
```

### Testing

```text
移动端 H5：
https://m-test.course.example.com

PC 网站：
https://test.course.example.com

API：
https://api-test.course.example.com

API 文档：
https://api-test.course.example.com/docs

Admin：
https://admin-test.course.example.com
```

### Production

```text
移动端 H5：
https://m.course.example.com

PC 网站：
https://course.example.com

API：
https://api.course.example.com

Admin：
https://admin.course.example.com
```

生产环境建议关闭或限制：

```text
https://api.course.example.com/docs
```

避免把完整 API 文档直接暴露给所有公网用户。

---

## 54.2 uni-app 原生 APP 怎么处理

uni-app 项目可能最终不是 H5，而是：

```text
Android APK / AAB
iOS IPA
```

本教程为了让三套环境都能够用 URL 验收，先把 uni-app 的 **H5 构建结果** 部署出来：

```text
m-dev.course.example.com
m-test.course.example.com
m.course.example.com
```

它有两个用途：

1. QA 可以快速从浏览器验证移动端主要业务；
2. GitHub Actions 可以在 Linux Runner 中完成 Web 构建和发布。

如果你的最终产品是 Android/iOS 原生包：

```text
Development / Testing：
可以继续使用 H5 URL 做快速验证，
同时由 HBuilderX CLI 或专用 Self-hosted Runner 生成测试包。

Production：
再走 Android/iOS 正式签名和应用商店发布流程。
```

> 原生 APP 签名证书、iOS Profile、Android Keystore 都属于 Secret，绝对不能提交进 Git。

---

# 第五十二章：整体企业架构

## 55.1 最终拓扑

```text
                        GitHub Organization
                               │
       ┌───────────────────────┼────────────────────────┐
       │                       │                        │
 mobile-uniapp             web-next               admin-react
       │                       │                        │
       └───────────────┐       │       ┌────────────────┘
                       │       │       │
                     api-fastapi
                           │
                    GitHub Actions
                           │
                 Build Docker Images
                           │
                    Alibaba Cloud ACR
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
      DEV ECS            TEST ECS           PROD ECS
        │                  │                  │
      Nginx              Nginx              Nginx
        │                  │                  │
 ┌──────┼─────┐     ┌──────┼─────┐     ┌──────┼─────┐
 │      │     │     │      │     │     │      │     │
Mobile  PC   Admin  Mobile  PC   Admin  Mobile  PC   Admin
        │                  │                  │
        └──── API ─────────┴──── API ─────────┴──── API
               │                    │                 │
          MySQL + Redis        MySQL + Redis     MySQL + Redis
```

---

## 55.2 企业生产推荐

为了让小白能够完整做出来，本教程允许：

```text
DEV：1 台 ECS
TEST：1 台 ECS
PROD：1 台 ECS
```

但是正式企业生产更推荐：

```text
SLB / ALB
   ↓
多台 ECS / ACK Kubernetes
   ↓
API
   ↓
RDS MySQL
Redis 云数据库
```

也就是说：

> 教程先把“整条发布链路”跑通，再根据业务规模升级高可用。

---

# 第五十三章：4 个仓库的分支统一规范

每个 Repository 都使用相同规则：

```text
master
develop
test
feature/*
fix/*
release/*
hotfix/*
```

## 56.1 分支和环境对应

```text
feature/*
   ↓ PR
develop
   ↓
Development

develop
   ↓
test
   ↓
Testing

test
   ↓ QA PASS
release/vX.Y.Z（可选：发布准备 / Staging 收尾）
   ↓ 回归通过
master
   ↓ Tag vX.Y.Z
Production
```

> 团队规模较大、需要严格控制“这版带什么上线”时，在 `test → master` 之间加一层 `release/vX.Y.Z`，用于冻结功能、回归、定版本号。

---

## 56.2 生产不要“master 一 Push 就自动上线”

推荐：

```text
master 合并
   ↓
创建 Release Tag
   ↓
GitHub Actions Build
   ↓
Production Environment
   ↓
人工审批
   ↓
部署
```

这样：

```text
合并代码 ≠ 立即上线
```

生产发布仍然有一个明确 Release 动作。

---

# 第五十四章：GitHub Environments 配置

每个仓库进入：

```text
Repository
→ Settings
→ Environments
```

创建：

```text
development
testing
production
```

---

## 57.1 development

允许：

```text
develop
```

部署。

配置 URL，例如 PC 仓库：

```text
https://dev.course.example.com
```

---

## 57.2 testing

允许：

```text
test
```

部署。

URL：

```text
https://test.course.example.com
```

---

## 57.3 production

建议：

```text
只允许 protected branch / tag
```

如果你的 GitHub 套餐与仓库类型支持 Required Reviewers，则给 Production 配置审批人员。

推荐：

```text
Tech Lead
Release Manager
```

并开启：

```text
Prevent self-review
```

也就是：

> 发起生产部署的人不能自己审批自己的生产发布。

---

# 第五十五章：GitHub Variables 与 Secrets 设计

## 58.1 Variable 和 Secret 的区别

普通信息：

```text
APP_NAME
DEPLOY_PATH
SERVER_PORT
PUBLIC_API_URL
```

使用：

```text
Variables
```

敏感信息：

```text
SSH_PRIVATE_KEY
ACR_PASSWORD
DB_PASSWORD
REDIS_PASSWORD
JWT_SECRET
```

使用：

```text
Secrets
```

---

## 58.2 每个 Environment 建议 Variables

### development

```text
SERVER_HOST=<DEV_ECS_PUBLIC_IP>
DEPLOY_PATH=/opt/course-platform
API_BASE_URL=https://api-dev.course.example.com
```

### testing

```text
SERVER_HOST=<TEST_ECS_PUBLIC_IP>
DEPLOY_PATH=/opt/course-platform
API_BASE_URL=https://api-test.course.example.com
```

### production

```text
SERVER_HOST=<PROD_ECS_PUBLIC_IP>
DEPLOY_PATH=/opt/course-platform
API_BASE_URL=https://api.course.example.com
```

---

## 58.3 Environment Secrets

每个 Environment 分别保存：

```text
SERVER_USER
SERVER_SSH_KEY

ACR_REGISTRY
ACR_USERNAME
ACR_PASSWORD
```

API 项目额外：

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
```

---

## 58.4 三套环境必须使用三套 Secret

错误：

```text
development/test/production
共用一个 DATABASE_URL
```

正确：

```text
development DATABASE_URL
testing DATABASE_URL
production DATABASE_URL
```

即使 Secret 名字相同：

```text
DATABASE_URL
```

它们实际值必须不同。

---

# 第五十六章：阿里云资源准备

## 59.1 学习阶段最低配置

准备：

```text
ECS-DEV
ECS-TEST
ECS-PROD
```

例如：

```text
DEV  ：10.0.1.10 / 公网 IP A
TEST ：10.0.2.10 / 公网 IP B
PROD ：10.0.3.10 / 公网 IP C
```

系统统一：

```text
Ubuntu 24.04
```

---

## 59.2 安全组

开放：

```text
22
80
443
```

其中：

```text
22
```

尽量只允许：

```text
办公公网 IP
VPN 出口 IP
运维跳板机
```

---

## 59.3 MySQL / Redis

### 学习阶段

DEV / TEST 可以用 Docker：

```text
mysql:8
redis:7
```

### 正式企业生产

推荐：

```text
Alibaba Cloud RDS MySQL
Alibaba Cloud Redis
```

生产数据库不要开放公网：

```text
API ECS
   ↓ VPC 内网
RDS / Redis
```

---

# 第五十七章：服务器统一目录

三台 ECS 都创建：

```bash
sudo mkdir -p /opt/course-platform
sudo chown -R $USER:$USER /opt/course-platform
```

结构：

```text
/opt/course-platform/
├── compose/
│   └── docker-compose.yml
├── env/
│   ├── api.env
│   ├── web.env
│   ├── admin.env
│   └── mobile.env
├── nginx/
│   └── conf.d/
└── scripts/
    ├── deploy.sh
    └── rollback.sh
```

---

# 第五十八章：统一 Docker Compose

下面的 Compose 同时运行 4 个项目。

```yaml
services:

  api:
    image: ${ACR}/course-api:${API_VERSION}
    container_name: course-api
    restart: unless-stopped
    env_file:
      - ../env/api.env
    expose:
      - "8000"
    networks:
      - course-net

  web:
    image: ${ACR}/course-web:${WEB_VERSION}
    container_name: course-web
    restart: unless-stopped
    env_file:
      - ../env/web.env
    expose:
      - "3000"
    depends_on:
      - api
    networks:
      - course-net

  admin:
    image: ${ACR}/course-admin:${ADMIN_VERSION}
    container_name: course-admin
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - course-net

  mobile:
    image: ${ACR}/course-mobile:${MOBILE_VERSION}
    container_name: course-mobile
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - course-net

  nginx:
    image: nginx:alpine
    container_name: course-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ../nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
      - web
      - admin
      - mobile
    networks:
      - course-net

networks:
  course-net:
    driver: bridge
```

生产 MySQL/Redis 如果使用 RDS/云 Redis，不需要放进这个 Compose。

---

# 第五十九章：API 项目 FastAPI Docker 化

Repository：

```text
api-fastapi
```

## 62.1 推荐目录

```text
api-fastapi/
├── app/
│   ├── main.py
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── core/
├── tests/
├── alembic/
├── requirements.txt
├── Dockerfile
└── .github/
    └── workflows/
```

---

## 62.2 Health API

在 FastAPI 中至少提供：

```python
@app.get("/health")
async def health():
    return {
        "status": "UP"
    }
```

更成熟的 Health Check 还可以检查：

```text
MySQL
Redis
```

但不要在公开接口里泄露数据库密码、IP 等敏感信息。

---

## 62.3 Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD [
  "uvicorn",
  "app.main:app",
  "--host",
  "0.0.0.0",
  "--port",
  "8000",
  "--proxy-headers"
]
```

---

## 62.4 `.dockerignore`

```text
.git
.github
.venv
venv
__pycache__
.pytest_cache
.env
.env.*
tests
*.log
```

---

## 62.5 `api.env`

DEV：

```env
APP_ENV=development
DATABASE_URL=mysql+pymysql://course_dev:***@mysql-dev:3306/course_dev
REDIS_URL=redis://:***@redis-dev:6379/0
JWT_SECRET=***
```

TEST：

```env
APP_ENV=testing
DATABASE_URL=mysql+pymysql://course_test:***@mysql-test:3306/course_test
REDIS_URL=redis://:***@redis-test:6379/0
JWT_SECRET=***
```

PROD：

```env
APP_ENV=production
DATABASE_URL=mysql+pymysql://course_prod:***@prod-rds:3306/course_prod
REDIS_URL=redis://:***@prod-redis:6379/0
JWT_SECRET=***
```

---

# 第六十章：PC 项目 Next.js Docker 化

Repository：

```text
web-next
```

Next.js 自托管可以使用 Node.js Server，本教程使用 Docker 运行。

---

## 63.1 环境变量设计

不要把 API 写死：

```ts
fetch("https://api.course.example.com/...")
```

应该根据环境配置：

```text
NEXT_PUBLIC_API_BASE_URL
```

DEV：

```env
NEXT_PUBLIC_API_BASE_URL=https://api-dev.course.example.com
```

TEST：

```env
NEXT_PUBLIC_API_BASE_URL=https://api-test.course.example.com
```

PROD：

```env
NEXT_PUBLIC_API_BASE_URL=https://api.course.example.com
```

---

## 63.2 `next.config.js/ts`

如果你的 Next.js 版本和项目模式支持 standalone，可以配置：

```js
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

---

## 63.3 多阶段 Dockerfile

```dockerfile
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

如果你的项目没有启用 standalone，可以使用：

```text
npm run build
npm run start
```

对应方式构建。

---

# 第六十一章：Admin React Docker 化

Repository：

```text
admin-react
```

假设你的 React 工程最终：

```bash
npm run build
```

输出：

```text
dist/
```

如果你的工程输出：

```text
build/
```

则把后面的 Dockerfile 路径替换掉。

---

## 64.1 Admin API 地址

Vite 项目常见：

```env
VITE_API_BASE_URL=https://api-test.course.example.com
```

Create React App 可能是：

```env
REACT_APP_API_BASE_URL=...
```

你必须根据自己的脚手架实际规则调整。

---

## 64.2 Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

## 64.3 React Router 刷新 404

`nginx.conf`：

```nginx
server {
    listen 80;

    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

这一步可以避免：

```text
/admin/users
```

直接刷新时出现 Nginx 404。

---

# 第六十二章：uni-app H5 Docker 化

Repository：

```text
mobile-uniapp
```

## 65.1 为什么实战先部署 H5

GitHub Actions 最容易标准化：

```text
npm install
npm run build:h5
```

然后把 H5 静态文件打成 Nginx 镜像。

实际命令要以你的 `package.json` 为准。

常见可能是：

```bash
npm run build:h5
```

或者：

```bash
npm run build:h5 -- --mode production
```

---

## 65.2 环境 API

例如 Vite/uni-app：

```env
VITE_API_BASE_URL=https://api-dev.course.example.com
```

TEST：

```env
VITE_API_BASE_URL=https://api-test.course.example.com
```

PROD：

```env
VITE_API_BASE_URL=https://api.course.example.com
```

---

## 65.3 Dockerfile

假设构建目录：

```text
dist/build/h5
```

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build:h5


FROM nginx:alpine

COPY --from=builder \
  /app/dist/build/h5 \
  /usr/share/nginx/html

EXPOSE 80
```

如果你实际输出路径不同，先：

```bash
npm run build:h5
```

然后检查：

```bash
find dist -maxdepth 3 -type d
```

确认真实目录再改 Dockerfile。

---

# 第六十三章：ACR 镜像命名规范

建议：

```text
course-api
course-web
course-admin
course-mobile
```

例如：

```text
registry.cn-hangzhou.aliyuncs.com/course/course-api
registry.cn-hangzhou.aliyuncs.com/course/course-web
registry.cn-hangzhou.aliyuncs.com/course/course-admin
registry.cn-hangzhou.aliyuncs.com/course/course-mobile
```

---

## 66.1 DEV Tag

```text
dev-<commit-sha>
```

例如：

```text
course-api:dev-a83c172
```

---

## 66.2 TEST Tag

```text
test-<commit-sha>
```

---

## 66.3 PROD Tag

必须用明确版本：

```text
v1.3.0
```

最好同时记录 Git SHA。

不要依赖：

```text
latest
```

判断生产版本。

---

# 第六十四章：GitHub Actions 公共 CI 思路

每个项目的 CI 分为：

```text
Pull Request：
lint
unit test
build check

develop：
CI
Build Image
Deploy Development

test：
CI
Build Image
Deploy Testing

v* Tag：
CI
Build Release Image
Production Approval
Deploy Production
Smoke Test
```

---

# 第六十五章：FastAPI GitHub Actions 完整示例

文件：

```text
api-fastapi/.github/workflows/ci-cd.yml
```

```yaml
name: api-ci-cd

on:
  pull_request:
    branches:
      - develop
      - test
      - master

  push:
    branches:
      - develop
      - test

    tags:
      - "v*"

  workflow_dispatch:

permissions:
  contents: read

jobs:

  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest -q

  deploy-development:
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    needs:
      - test

    runs-on: ubuntu-latest

    environment:
      name: development
      url: https://api-dev.course.example.com

    concurrency:
      group: api-development
      cancel-in-progress: true

    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: |
          IMAGE_TAG="dev-${GITHUB_SHA::7}"

          echo "${{ secrets.ACR_PASSWORD }}" \
            | docker login "${{ secrets.ACR_REGISTRY }}" \
                -u "${{ secrets.ACR_USERNAME }}" \
                --password-stdin

          docker build \
            -t "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}" .

          docker push \
            "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}"

          echo "IMAGE_TAG=${IMAGE_TAG}" >> "$GITHUB_ENV"

      - name: Deploy development
        env:
          SSH_KEY: ${{ secrets.SERVER_SSH_KEY }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
          SERVER_HOST: ${{ vars.SERVER_HOST }}
        run: |
          install -m 600 /dev/null /tmp/deploy_key
          printf '%s\n' "$SSH_KEY" > /tmp/deploy_key

          ssh \
            -i /tmp/deploy_key \
            -o StrictHostKeyChecking=yes \
            "${SERVER_USER}@${SERVER_HOST}" \
            "cd /opt/course-platform && \
             API_VERSION='${IMAGE_TAG}' \
             ./scripts/deploy-api.sh development '${IMAGE_TAG}'"

          rm -f /tmp/deploy_key

  deploy-testing:
    if: github.event_name == 'push' && github.ref == 'refs/heads/test'
    needs:
      - test

    runs-on: ubuntu-latest

    environment:
      name: testing
      url: https://api-test.course.example.com

    concurrency:
      group: api-testing
      cancel-in-progress: true

    steps:
      - uses: actions/checkout@v4

      - name: Build and push testing image
        run: |
          IMAGE_TAG="test-${GITHUB_SHA::7}"

          echo "${{ secrets.ACR_PASSWORD }}" \
            | docker login "${{ secrets.ACR_REGISTRY }}" \
                -u "${{ secrets.ACR_USERNAME }}" \
                --password-stdin

          docker build \
            -t "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}" .

          docker push \
            "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}"

          echo "IMAGE_TAG=${IMAGE_TAG}" >> "$GITHUB_ENV"

      - name: Deploy testing
        env:
          SSH_KEY: ${{ secrets.SERVER_SSH_KEY }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
          SERVER_HOST: ${{ vars.SERVER_HOST }}
        run: |
          install -m 600 /dev/null /tmp/deploy_key
          printf '%s\n' "$SSH_KEY" > /tmp/deploy_key

          ssh \
            -i /tmp/deploy_key \
            -o StrictHostKeyChecking=yes \
            "${SERVER_USER}@${SERVER_HOST}" \
            "cd /opt/course-platform && \
             ./scripts/deploy-api.sh testing '${IMAGE_TAG}'"

          rm -f /tmp/deploy_key

  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    needs:
      - test

    runs-on: ubuntu-latest

    environment:
      name: production
      url: https://api.course.example.com

    concurrency:
      group: api-production
      cancel-in-progress: false

    steps:
      - uses: actions/checkout@v4

      - name: Build release image
        run: |
          IMAGE_TAG="${GITHUB_REF_NAME}"

          echo "${{ secrets.ACR_PASSWORD }}" \
            | docker login "${{ secrets.ACR_REGISTRY }}" \
                -u "${{ secrets.ACR_USERNAME }}" \
                --password-stdin

          docker build \
            -t "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}" .

          docker push \
            "${{ secrets.ACR_REGISTRY }}/course-api:${IMAGE_TAG}"

          echo "IMAGE_TAG=${IMAGE_TAG}" >> "$GITHUB_ENV"

      - name: Deploy production
        env:
          SSH_KEY: ${{ secrets.SERVER_SSH_KEY }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
          SERVER_HOST: ${{ vars.SERVER_HOST }}
        run: |
          install -m 600 /dev/null /tmp/deploy_key
          printf '%s\n' "$SSH_KEY" > /tmp/deploy_key

          ssh \
            -i /tmp/deploy_key \
            -o StrictHostKeyChecking=yes \
            "${SERVER_USER}@${SERVER_HOST}" \
            "cd /opt/course-platform && \
             ./scripts/deploy-api.sh production '${IMAGE_TAG}'"

          rm -f /tmp/deploy_key

      - name: Production smoke test
        run: |
          curl --fail \
               --retry 10 \
               --retry-delay 5 \
               https://api.course.example.com/health
```

---

## 68.1 关于 SSH Host Key

上面的：

```text
StrictHostKeyChecking=yes
```

是企业安全意识的一部分。

GitHub Runner 必须提前知道服务器 Host Key。

实际项目可以通过：

```text
known_hosts
```

Secret 或可信初始化步骤配置。

不要为了省事长期使用：

```text
StrictHostKeyChecking=no
```

否则会降低 SSH 主机身份校验能力。

---

# 第六十六章：Next.js GitHub Actions

PC 项目与 API 基本相同，差异主要在 Build 参数。

```yaml
name: web-ci-cd

on:
  pull_request:
    branches:
      - develop
      - test
      - master

  push:
    branches:
      - develop
      - test
    tags:
      - "v*"

permissions:
  contents: read

jobs:

  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npm test --if-present

      - run: npm run build

  deploy-development:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest

    environment:
      name: development
      url: https://dev.course.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          IMAGE_TAG="dev-${GITHUB_SHA::7}"

          echo "${{ secrets.ACR_PASSWORD }}" |
            docker login "${{ secrets.ACR_REGISTRY }}" \
            -u "${{ secrets.ACR_USERNAME }}" \
            --password-stdin

          docker build \
            --build-arg NEXT_PUBLIC_API_BASE_URL="${{ vars.API_BASE_URL }}" \
            -t "${{ secrets.ACR_REGISTRY }}/course-web:${IMAGE_TAG}" .

          docker push \
            "${{ secrets.ACR_REGISTRY }}/course-web:${IMAGE_TAG}"

          echo "IMAGE_TAG=${IMAGE_TAG}" >> "$GITHUB_ENV"

      # SSH 部署步骤与 API 项目相同
```

Testing：

```text
environment = testing
URL = https://test.course.example.com
API_BASE_URL = https://api-test.course.example.com
```

Production：

```text
environment = production
URL = https://course.example.com
API_BASE_URL = https://api.course.example.com
Tag = vX.Y.Z
```

---

# 第六十七章：Admin React GitHub Actions

核心 CI：

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: actions/setup-node@v4
    with:
      node-version: "22"
      cache: npm

  - run: npm ci

  - run: npm run lint --if-present

  - run: npm test --if-present

  - run: npm run build
```

Docker Build：

```bash
docker build \
  --build-arg VITE_API_BASE_URL="${API_BASE_URL}" \
  -t "${ACR}/course-admin:${IMAGE_TAG}" .
```

环境 URL：

```text
development:
https://admin-dev.course.example.com

testing:
https://admin-test.course.example.com

production:
https://admin.course.example.com
```

---

# 第六十八章：uni-app GitHub Actions

## 71.1 H5 CI

```yaml
name: mobile-h5-ci-cd

on:
  pull_request:
    branches:
      - develop
      - test
      - master

  push:
    branches:
      - develop
      - test

    tags:
      - "v*"

permissions:
  contents: read

jobs:

  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm

      - run: npm ci

      - run: npm run build:h5
```

---

## 71.2 Build Docker Image

DEV：

```bash
IMAGE_TAG="dev-${GITHUB_SHA::7}"

docker build \
  --build-arg VITE_API_BASE_URL="https://api-dev.course.example.com" \
  -t "${ACR}/course-mobile:${IMAGE_TAG}" .
```

TEST：

```text
https://api-test.course.example.com
```

PROD：

```text
https://api.course.example.com
```

---

## 71.3 最终移动端 URL

```text
DEV:
https://m-dev.course.example.com

TEST:
https://m-test.course.example.com

PROD:
https://m.course.example.com
```

---

# 第六十九章：服务器部署脚本

ECS 创建：

```text
/opt/course-platform/scripts/deploy-api.sh
```

示例：

```bash
#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT="${1:?environment required}"
VERSION="${2:?version required}"

cd /opt/course-platform/compose

echo "Deploy API"
echo "Environment: ${ENVIRONMENT}"
echo "Version: ${VERSION}"

export API_VERSION="${VERSION}"

docker compose pull api

docker compose up -d api

sleep 5

docker compose ps api

docker compose logs \
  --tail=100 \
  api
```

授权：

```bash
chmod +x \
  /opt/course-platform/scripts/deploy-api.sh
```

---

## 72.1 Web

```text
deploy-web.sh
```

核心：

```bash
export WEB_VERSION="$VERSION"

docker compose pull web
docker compose up -d web
```

---

## 72.2 Admin

```bash
export ADMIN_VERSION="$VERSION"

docker compose pull admin
docker compose up -d admin
```

---

## 72.3 Mobile

```bash
export MOBILE_VERSION="$VERSION"

docker compose pull mobile
docker compose up -d mobile
```

---

# 第七十章：一个非常重要的问题——4 个项目版本如何协调

真实项目中可能出现：

```text
API v2.4.0
PC v1.8.0
Admin v1.5.1
Mobile v3.2.0
```

不应该强迫 4 个仓库永远使用相同版本号。

推荐创建一份“Release Manifest”。

例如：

```yaml
release: course-platform-2026.08.25

api:
  version: v2.4.0

web:
  version: v1.8.0

admin:
  version: v1.5.1

mobile:
  version: v3.2.0
```

生产服务器最终 Compose 使用：

```env
API_VERSION=v2.4.0
WEB_VERSION=v1.8.0
ADMIN_VERSION=v1.5.1
MOBILE_VERSION=v3.2.0
```

这样才能回答：

> “2026-08-25 这次平台整体发布，4 个项目分别是什么版本？”

---

# 第七十一章：Nginx 多域名路由

以 TEST 环境为例。

## 74.1 PC

```nginx
server {
    listen 80;
    server_name test.course.example.com;

    location / {
        proxy_pass http://web:3000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 74.2 API

```nginx
server {
    listen 80;
    server_name api-test.course.example.com;

    location / {
        proxy_pass http://api:8000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 74.3 Admin

```nginx
server {
    listen 80;
    server_name admin-test.course.example.com;

    location / {
        proxy_pass http://admin:80;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 74.4 Mobile

```nginx
server {
    listen 80;
    server_name m-test.course.example.com;

    location / {
        proxy_pass http://mobile:80;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

DEV / PROD 使用完全一样的结构，只替换域名。

---

# 第七十二章：跨域 CORS 配置

API 必须限制允许来源。

DEV：

```text
https://dev.course.example.com
https://admin-dev.course.example.com
https://m-dev.course.example.com
```

TEST：

```text
https://test.course.example.com
https://admin-test.course.example.com
https://m-test.course.example.com
```

PROD：

```text
https://course.example.com
https://admin.course.example.com
https://m.course.example.com
```

FastAPI 示例：

```python
from fastapi.middleware.cors import CORSMiddleware

allowed_origins = [
    "https://course.example.com",
    "https://admin.course.example.com",
    "https://m.course.example.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

生产不要图省事长期：

```python
allow_origins=["*"]
```

特别是同时启用 Cookie/Credential 时更要严格控制来源。

---

# 第七十三章：MySQL 三环境隔离

推荐：

```text
course_dev
course_test
course_prod
```

最好实例级也隔离。

---

## 76.1 Development

允许：

```text
开发测试数据
快速重置
Seed
```

---

## 76.2 Testing

QA 专用。

测试自动化可以创建：

```text
AUTO_TEST_*
```

数据。

---

## 76.3 Production

禁止：

```text
开发测试账号随便写入
自动化脚本直接清库
```

生产 Migration 必须：

```text
Review
Backup
Approval
Execution
Verification
```

---

# 第七十四章：Redis 三环境隔离

不要只是：

```text
Redis DB 0
Redis DB 1
Redis DB 2
```

来模拟企业强隔离。

生产最好使用独立 Redis 实例或严格资源隔离。

Key 建议仍然加前缀：

```text
course:dev:
course:test:
course:prod:
```

例如：

```text
course:prod:user:123:session
```

方便排查和治理。

---

# 第七十五章：数据库 Migration 加入 GitHub Actions

API Repository：

```text
alembic/
```

本地开发创建 Migration：

```bash
alembic revision \
  --autogenerate \
  -m "add course order table"
```

提交到 Git：

```bash
git add alembic
git commit \
  -m "feat(db): add course order migration"
```

---

## 78.1 TEST

部署 API 前：

```bash
alembic upgrade head
```

---

## 78.2 PROD

不要直接无脑自动执行。

推荐：

```text
Production Approval
       ↓
Database Backup
       ↓
Migration Job
       ↓
Migration PASS
       ↓
Deploy API
```

如果 Migration 失败：

```text
停止发布
```

---

# 第七十六章：4 项目完整开发流程实战

现在真的做一次。

需求：

> 新增课程收藏功能。

涉及：

```text
mobile
web
api
admin
```

---

## 79.1 API

```bash
git switch develop
git pull origin develop

git switch -c feature/course-favorite
```

实现：

```text
POST /course/{id}/favorite
DELETE /course/{id}/favorite
GET /user/favorites
```

提交：

```bash
git add .

git commit \
  -m "feat(course): add course favorite api"

git push -u origin feature/course-favorite
```

创建 PR：

```text
feature/course-favorite
→ develop
```

---

## 79.2 PC

同样：

```bash
git switch develop
git pull origin develop

git switch -c feature/course-favorite
```

开发：

```text
课程详情收藏按钮
个人中心收藏列表
```

---

## 79.3 Mobile

开发：

```text
课程详情收藏
我的收藏
```

---

## 79.4 Admin

如果收藏不需要后台管理：

```text
Admin 本次可能不改
```

这很正常。

4 个项目不是每次需求都必须同时发版。

---

# 第七十七章：Development 自动部署

当 API Feature 合并：

```text
develop
```

GitHub Actions 自动：

```text
pytest
↓
Docker Build
↓
Push ACR
↓
SSH DEV ECS
↓
Pull Image
↓
docker compose up -d
↓
health check
```

最终：

```text
https://api-dev.course.example.com
```

更新。

---

PC：

```text
https://dev.course.example.com
```

Mobile：

```text
https://m-dev.course.example.com
```

Admin：

```text
https://admin-dev.course.example.com
```

前后端现在可以在 Development 联调。

---

# 第七十八章：Testing 提测

开发联调完成。

API：

```text
develop
↓ PR
test
```

PC：

```text
develop
↓
test
```

Mobile：

```text
develop
↓
test
```

GitHub Actions 分别部署 Testing。

最终 QA 拿到：

```text
PC：
https://test.course.example.com

Mobile：
https://m-test.course.example.com

Admin：
https://admin-test.course.example.com

API：
https://api-test.course.example.com
```

---

## 81.1 QA 验证

至少：

```text
注册
登录
课程列表
课程详情
收藏
取消收藏
个人收藏列表
不同账号隔离
未登录权限
接口
数据库
Redis 缓存
PC
Mobile
```

---

# 第七十九章：Testing Bug Fix

QA 发现：

> Mobile 收藏后 PC 收藏状态没有更新。

先判断：

```text
前端缓存？
API？
Redis？
数据库？
```

如果 API Bug：

```bash
git switch develop
git pull origin develop

git switch -c fix/favorite-cache
```

修复。

然后：

```text
fix/*
↓
develop
↓
test
```

GitHub Actions 自动重新部署。

QA 回归。

---

# 第八十章：Production 发布

测试全部通过以后，各项目分别：

```text
test
↓ PR
master
```

---

## 83.1 API

例如：

```bash
git switch master
git pull origin master

git tag -a v2.4.0 \
  -m "release api v2.4.0"

git push origin v2.4.0
```

GitHub Actions：

```text
Build course-api:v2.4.0
↓
Push ACR
↓
等待 Production Approval
↓
Deploy
```

---

## 83.2 Web

```text
v1.8.0
```

---

## 83.3 Mobile

```text
v3.2.0
```

---

## 83.4 Admin

本次没有变化：

```text
继续运行 v1.5.1
```

不需要为了“版本统一”重新发布一次。

---

# 第八十一章：生产 Smoke Test

4 个项目生产完成后：

## API

```bash
curl -f \
  https://api.course.example.com/health
```

---

## PC

打开：

```text
https://course.example.com
```

验证：

```text
首页
登录
课程详情
收藏
```

---

## Mobile

```text
https://m.course.example.com
```

---

## Admin

```text
https://admin.course.example.com
```

---

# 第八十二章：4 项目回滚实战

假设：

```text
API v2.4.0
```

上线后有严重问题。

上一个：

```text
v2.3.4
```

生产不需要回滚其他三个项目。

只回滚 API：

```bash
./scripts/deploy-api.sh \
  production \
  v2.3.4
```

然后：

```bash
curl -f \
  https://api.course.example.com/health
```

业务验证。

这就是：

> 微服务/多项目独立版本的重要价值。

---

# 第八十三章：生产发布不要把源码 Clone 到服务器

到这一阶段，推荐正式升级成：

```text
GitHub Actions
      ↓
Docker Image
      ↓
ACR
      ↓
ECS Pull Image
```

ECS 不需要：

```text
git clone
npm build
pip install
```

生产服务器只负责：

```text
pull
run
health check
rollback
```

这样更符合：

```text
Build Once
Deploy Many
```

原则。

---

# 第八十四章：GitHub Actions 企业安全加固

## 87.1 第三方 Action

企业项目不要随意复制：

```text
uses: some-user/some-action@master
```

建议：

```text
优先官方 Action
评估第三方 Action
固定可信版本
高安全要求时固定完整 Commit SHA
```

---

## 87.2 GITHUB_TOKEN

Workflow 顶层默认尽可能：

```yaml
permissions:
  contents: read
```

如果某个 Job 需要额外权限：

```text
只给这个 Job
```

不要无脑：

```text
write-all
```

---

## 87.3 Secret

不要：

```bash
echo "$DATABASE_URL"
```

不要：

```text
上传 .env.production 到 Artifact
```

不要：

```text
把 Secret 写进 Docker Image Layer
```

---

## 87.4 Production Approval

Production Job：

```yaml
environment:
  name: production
```

利用 GitHub Environment Protection Rule 进行生产门禁。

---

## 87.5 Concurrency

防止同一个环境同时发生两个部署：

```yaml
concurrency:
  group: course-api-production
  cancel-in-progress: false
```

TEST 可以：

```yaml
cancel-in-progress: true
```

因为新测试版本往往可以替换旧部署任务。

PROD：

```text
不要随便 cancel 正在执行的生产部署。
```

---

# 第八十五章：GitHub Actions 复用 Workflow

当 4 个项目越来越多以后，会发现：

```text
登录 ACR
SSH
部署
Smoke Test
```

大量重复。

企业可以把它抽成：

```text
Reusable Workflow
```

例如单独建：

```text
your-org/devops-workflows
```

里面：

```text
.github/workflows/deploy-ecs.yml
```

4 个 Repo 只负责传：

```text
service_name
image_name
environment
url
```

这样升级部署逻辑时只需要修改一套。

---

# 第八十六章：域名 DNS 最终配置表

假设三台 ECS。

## DEV

```text
dev.course.example.com
api-dev.course.example.com
admin-dev.course.example.com
m-dev.course.example.com
```

全部 A 记录：

```text
→ DEV ECS Public IP
```

---

## TEST

```text
test.course.example.com
api-test.course.example.com
admin-test.course.example.com
m-test.course.example.com
```

全部：

```text
→ TEST ECS Public IP
```

---

## PROD

```text
course.example.com
api.course.example.com
admin.course.example.com
m.course.example.com
```

全部：

```text
→ PROD ECS / SLB
```

---

# 第八十七章：最终项目交付表

做完这个实战以后，你应该能够向开发、测试和产品直接提供：

## Development

```text
PC:
https://dev.course.example.com

Mobile:
https://m-dev.course.example.com

Admin:
https://admin-dev.course.example.com

API:
https://api-dev.course.example.com

API Docs:
https://api-dev.course.example.com/docs
```

---

## Testing

```text
PC:
https://test.course.example.com

Mobile:
https://m-test.course.example.com

Admin:
https://admin-test.course.example.com

API:
https://api-test.course.example.com

API Docs:
https://api-test.course.example.com/docs
```

---

## Production

```text
PC:
https://course.example.com

Mobile:
https://m.course.example.com

Admin:
https://admin.course.example.com

API:
https://api.course.example.com
```

---

# 第八十八章：最终版本记录示例

一次完整生产发布：

```yaml
platform_release: 2026.08.25

api:
  git_tag: v2.4.0
  image: course-api:v2.4.0
  url: https://api.course.example.com

web:
  git_tag: v1.8.0
  image: course-web:v1.8.0
  url: https://course.example.com

mobile:
  git_tag: v3.2.0
  image: course-mobile:v3.2.0
  url: https://m.course.example.com

admin:
  git_tag: v1.5.1
  image: course-admin:v1.5.1
  url: https://admin.course.example.com
```

---

# 第八十九章：这个实战真正达到企业标准的验收清单

## GitHub

- [ ] 4 个独立 Repository
- [ ] master/develop/test
- [ ] feature/fix/release/hotfix
- [ ] Branch Protection
- [ ] Pull Request
- [ ] Code Review
- [ ] Tag
- [ ] Release

## GitHub Actions

- [ ] PR 自动 CI
- [ ] develop 自动部署 Development
- [ ] test 自动部署 Testing
- [ ] Tag 触发 Production
- [ ] Production 人工审批
- [ ] Environment Secret
- [ ] Environment Variable
- [ ] Deployment URL
- [ ] Concurrency
- [ ] Smoke Test

## Mobile

- [ ] uni-app H5 Build
- [ ] DEV URL
- [ ] TEST URL
- [ ] PROD URL
- [ ] API 环境隔离
- [ ] 原生签名 Secret 不入 Git

## PC

- [ ] Next.js Build
- [ ] Docker Image
- [ ] DEV
- [ ] TEST
- [ ] PROD
- [ ] API URL 正确

## API

- [ ] FastAPI Docker
- [ ] `/health`
- [ ] Pytest
- [ ] MySQL
- [ ] Redis
- [ ] Alembic Migration
- [ ] CORS
- [ ] DEV/TEST/PROD DB 隔离
- [ ] DEV/TEST/PROD Redis 隔离

## Admin

- [ ] React Build
- [ ] Nginx
- [ ] Router Refresh
- [ ] DEV/TEST/PROD
- [ ] API 环境切换

## AliCloud

- [ ] DEV ECS
- [ ] TEST ECS
- [ ] PROD ECS
- [ ] Security Group
- [ ] ACR
- [ ] DNS
- [ ] HTTPS
- [ ] RDS/Redis 生产隔离

## Production

- [ ] 明确 Release Tag
- [ ] 不使用 latest 判断生产版本
- [ ] 一次构建
- [ ] ACR 拉镜像
- [ ] Production Approval
- [ ] Health Check
- [ ] Smoke Test
- [ ] Logs
- [ ] Metrics
- [ ] Rollback
- [ ] Release Manifest

---

# 第九十章：综合实战最终闭环

最终你应该能够画出下面这张流程：

```text
开发者
  │
  ├── mobile-uniapp
  ├── web-next
  ├── api-fastapi
  └── admin-react
          │
          ↓
     feature/*
          │
          ↓
     Pull Request
          │
          ↓
   GitHub Actions CI
          │
          ↓
       develop
          │
          ↓
   Development Deploy
          │
          ↓
  4 个 Development URL
          │
          ↓
        test
          │
          ↓
     Testing Deploy
          │
          ↓
    4 个 Testing URL
          │
          ↓
       QA PASS
          │
          ↓
       master
          │
          ↓
      Release Tag
          │
          ↓
   GitHub Actions Build
          │
          ↓
       Aliyun ACR
          │
          ↓
 Production Approval
          │
          ↓
     Production ECS
          │
          ↓
        Nginx
          │
          ↓
 ┌────────┼──────────┬───────────┐
 │        │          │           │
PC       Mobile     Admin       API
 │        │          │           │
 ↓        ↓          ↓           ↓
course    m.course   admin       api
.example  .example   .course     .course
.com      .com       .example    .example
                     .com        .com
```

做到这里，这套项目就不再只是：

```text
“我会用 GitHub Actions。”
```

而是：

```text
“我可以把一个真实的前后端多项目系统，
从开发环境、测试环境一直交付到生产环境，
并且每个环境有明确 URL、版本、镜像、Secret、审批和回滚。”
```

这才是企业级 CI/CD 项目实战真正应该达到的效果。


---

# 第七篇：企业级毕业实战与最终验收

# 第九十一章：最终企业级毕业实战

现在你要完整做一次。

假设需求：

> 课程平台新增优惠券购课功能。

---

## 第一步：需求开发

```bash
git switch develop
git pull origin develop

git switch -c feature/course-coupon
```

完成：

```text
代码
单元测试
Migration
接口测试
```

---

## 第二步：提交

```bash
git status
git diff

git add .

git commit -m "feat(order): add course coupon support"

git push -u origin feature/course-coupon
```

---

## 第三步：MR

```text
feature/course-coupon
→ develop
```

要求：

```text
CI PASS
Review PASS
CODEOWNER PASS
```

---

## 第四步：开发环境

合并后：

```text
自动构建镜像
自动 Deploy Dev
```

前后端联调。

---

## 第五步：正式提测

```text
develop
→ test
```

自动：

```text
Deploy Test
API Regression
```

QA：

```text
功能
接口
数据库
回归
```

---

## 第六步：Bug Fix

```text
fix/coupon-calc
→ develop
→ test
```

直到：

```text
QA PASS
```

---

## 第七步：Staging

发布：

```text
Staging
```

验证：

```text
Migration
配置
支付沙箱
Nginx
HTTPS
Smoke Test
```

---

## 第八步：正式 Release

```text
test
→ master
```

Tag：

```bash
git tag -a v1.3.0 -m "release v1.3.0"
git push origin v1.3.0
```

---

## 第九步：CI 构建

产生：

```text
course-platform:v1.3.0
```

推：

```text
阿里云 ACR
```

记录：

```text
Tag
Commit SHA
Image Digest
```

---

## 第十步：生产审批

确认：

```text
QA PASS
Migration
Backup
Rollback
Monitoring
Release Window
```

点击：

```text
Deploy Production
```

---

## 第十一步：灰度

例如：

```text
10%
```

观察：

```text
5xx
P95
下单成功率
支付成功率
优惠券核销成功率
```

稳定：

```text
50%
```

再：

```text
100%
```

---

## 第十二步：生产验证

执行：

```text
登录
搜索课程
领取优惠券
创建订单
支付
我的课程
```

全部 PASS。

---

## 第十三步：监控

持续观察：

```text
Metrics
Logs
Alerts
```

---

## 第十四步：异常回滚

如果：

```text
支付成功率突然下降
```

立即：

```text
停止放量
回滚到 v1.2.x
验证恢复
```

然后：

```text
Hotfix
```

---

# 第九十二章：最终能力验收表

如果下面所有项目你都能独立完成，说明你已经不只是“会 Git”，而是理解了企业级代码交付体系。

## Git

- [ ] 初始化仓库
- [ ] Feature 分支
- [ ] Develop
- [ ] Test
- [ ] Release 分支
- [ ] Master
- [ ] Hotfix
- [ ] MR / PR
- [ ] Code Review
- [ ] 冲突处理
- [ ] Revert
- [ ] Tag

## 工程规范

- [ ] Protected Branch
- [ ] CODEOWNERS
- [ ] Commit 规范
- [ ] Semantic Version
- [ ] Release Notes

## CI/CD

- [ ] Pipeline
- [ ] Lint
- [ ] Unit Test
- [ ] Integration Test
- [ ] Security Scan
- [ ] Docker Build
- [ ] Registry Push
- [ ] Deploy
- [ ] Smoke Test
- [ ] Manual Approval

## 阿里云

- [ ] ECS
- [ ] Security Group
- [ ] SSH Key
- [ ] Docker
- [ ] Docker Compose
- [ ] ACR
- [ ] Nginx
- [ ] HTTPS
- [ ] 域名

## 数据库

- [ ] Migration
- [ ] Backup
- [ ] Rollback Plan
- [ ] Expand / Migrate / Contract

## 发布

- [ ] Dev
- [ ] Test
- [ ] Staging
- [ ] Prod
- [ ] Rolling
- [ ] Blue-Green
- [ ] Canary
- [ ] Rollback

## 可观测性

- [ ] Metrics
- [ ] Logs
- [ ] Traces
- [ ] Alerts
- [ ] Business Metrics

## 安全

- [ ] Secret 不入 Git
- [ ] 最小权限
- [ ] RAM / Role
- [ ] 镜像扫描
- [ ] 依赖扫描
- [ ] 审计日志

## 高可用与 Kubernetes

- [ ] Deployment
- [ ] Service
- [ ] Ingress
- [ ] Readiness
- [ ] Rolling Update
- [ ] Rollback

---

# 第九十三章：技术负责人最终总结

一个成熟的企业级发布系统，不应该依赖：

```text
“谁记得命令”
“谁经验丰富”
“谁今天正好在公司”
```

它应该依赖：

```text
规范
自动化
权限
检查
审批
监控
回滚
审计
```

最终你要建立的是：

```text
代码有分支
提交有规范
变更有 Review
合并有门禁
构建有产物
镜像有版本
配置有隔离
Secret 有保护
测试有自动化
发布有审批
生产有监控
异常可回滚
操作可审计
事故可复盘
```

如果你能够亲手把本教程里的手工发布流程做通，再把 CI/CD、ACR、HTTPS、Migration、监控、灰度、Kubernetes 一层层加上去，你就真正完成了从：

```text
“会用 Git 的开发者”
```

到：

```text
“理解企业研发交付体系的工程师”
```

的升级。


---



---

# 最终交付地址（请替换为你的真实域名）

```text
测试环境 URL：
https://test.course.example.com

生产环境 URL：
https://course.example.com
```

如果你暂时只有 ECS、还没有域名，则第一阶段可以先交付：

```text
测试环境 URL：
http://<TEST_ECS_PUBLIC_IP>

生产环境 URL：
http://<PROD_ECS_PUBLIC_IP>
```

拿到正式域名与证书后再升级为 HTTPS 域名访问。

**企业最终验收以两个 HTTPS URL 都能正常访问，并且测试/生产的数据、配置、Secret、版本完全隔离为准。**
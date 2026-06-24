# 通勤助手 - Supabase + Vercel 部署指南

## 前置条件
- GitHub 账号
- Vercel 账号（用 GitHub 登录 https://vercel.com）
- Supabase 账号（https://supabase.com）
- 高德地图 Web 服务 API Key（已有）

## 步骤 1：创建 Supabase 项目

1. 打开 https://supabase.com → New Project
2. 填写项目名 `commute-assistant`，设置数据库密码（记下来）
3. Region 选 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
4. 等待项目创建完成（约 2 分钟）

## 步骤 2：配置数据库

1. 打开 Supabase Dashboard → SQL Editor
2. 复制 `supabase/migrations/001_schema.sql` 全部内容
3. 粘贴到 SQL Editor → 点击 Run
4. 确认表创建成功（左侧 Table Editor 能看到 push_subscriptions, commute_settings, vapid_keys）

## 步骤 3：生成 VAPID 密钥

在 SQL Editor 执行：

```sql
-- 生成 VAPID 密钥对（在浏览器控制台运行，然后复制结果）
-- 打开浏览器控制台，粘贴以下代码：
```

然后访问 https://tools.reactpwa.com/vapid 生成 VAPID 密钥对，执行：

```sql
INSERT INTO vapid_keys (id, public_key, private_key) VALUES
  (1, '你的公钥', '你的私钥');
```

## 步骤 4：获取 Supabase 连接信息

Supabase Dashboard → Settings → API：
- Project URL → 填到 `.env` 的 `VITE_SUPABASE_URL`
- anon/public key → 填到 `.env` 的 `VITE_SUPABASE_ANON_KEY`
- service_role key → 记下来，后面需要

## 步骤 5：部署 Edge Functions

在项目根目录执行：

```bash
npm install -g supabase
supabase login
supabase link --project-ref <你的 Supabase 项目 ID>
supabase secrets set AMAP_WEB_KEY=be7d5d77e21e5d17bc60723603bd5ab7
supabase secrets set SUPABASE_URL=<你的 Supabase URL>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<你的 service_role key>
supabase functions deploy amap-proxy
supabase functions deploy send-reminder
```

## 步骤 6：部署前端到 Vercel

1. 把整个 `projects/` 目录推送到 GitHub 仓库
2. 打开 https://vercel.com → New Project → 导入 GitHub 仓库
3. Build 设置：
   - Framework: Vite
   - Build Command: `pnpm build`
   - Output Directory: `dist`
4. 环境变量（Environment Variables）填入：
   - `VITE_SUPABASE_URL` = Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon key
   - `VITE_API_BASE` = Supabase Edge Function URL（如 `https://xxx.supabase.co/functions/v1/amap-proxy/api`）
5. Deploy → 等待完成 → 获得 `https://xxx.vercel.app` 地址

## 步骤 7：手机端操作

1. **安装到桌面**：
   - 手机浏览器打开 Vercel 给的 URL
   - Chrome：地址栏会出现安装图标 → 点击"添加到主屏幕"
   - iOS Safari：底部 ↗ → "添加到主屏幕"

2. **设置通勤提醒**：
   - 打开 App → 点击顶部"提醒"按钮
   - 设置起点、终点、提醒时间、工作日
   - 点击"开启推送通知" → 允许通知权限
   - 点击"保存设置"

3. **查看通知**：
   - 到设定时间时，手机会弹出"通勤提醒"通知
   - 点击通知直接打开 App 查看路线

## 可选：升级到免费 Postgres 定时任务

pg_cron 是 Supabase 自带扩展，自动运行。如果不行，可以用 Vercel Cron Jobs（也是免费）：

在 `vercel.json` 添加：
```json
{ "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }] }
```
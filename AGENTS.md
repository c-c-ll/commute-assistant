# 项目上下文

## 技术栈

- **核心**: Vite 7, React 19, TypeScript, Express
- **UI**: Tailwind CSS
- **构建**: @vitejs/plugin-react-swc

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由（含高德地图代理）
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── components/     # React 组件
│   │   ├── Header.tsx
│   │   ├── SearchPanel.tsx
│   │   ├── RouteResults.tsx
│   │   └── SavedAddresses.tsx
│   ├── hooks/          # 自定义 Hooks
│   │   └── useLocalStorage.ts
│   ├── types/          # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/          # 工具函数
│   │   └── amap.ts     # 高德地图 API 封装
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # React 入口
│   └── index.css       # 全局样式
├── .env                # 环境变量（AMAP_WEB_KEY）
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 环境变量

- `AMAP_WEB_KEY`：高德地图 Web 服务 API Key（必需，用于公交路线规划和地理编码）

## API 接口

- `GET /api/transit` - 公交路线规划（代理高德地图）
- `GET /api/geocode` - 地理编码（地址转坐标）
- `GET /api/health` - 健康检查

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

- 使用 Tailwind CSS 进行样式开发
- React 组件使用函数式组件 + Hooks
- TypeScript strict 模式

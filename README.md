# AiCloset — 智能电子衣橱

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

数字化管理你的衣橱，AI 根据天气、场合、穿搭记忆，推荐每日穿搭方案。

## 核心亮点

### 1. 多级记忆系统（L1–L4）

参考 TikTok / Netflix / Spotify 的多时间维度推荐架构，自研四级分层偏好引擎：

| 层级 | 维度 | 半衰期 | 解决的问题 |
|------|------|--------|-----------|
| **L1** 实时上下文 | 天气 · 场合 · 近3天穿着 | 不持久化 | 今天下雨、有面试 |
| **L2** 短期偏好 | 14天滑动窗口 | 7天 | “最近降温，更爱穿毛衣” |
| **L3** 长期档案 | 春夏秋冬独立偏好向量 | 90天 | “夏天爱穿裙子，冬天爱穿羽绒服” |
| **L4** 关系记忆 | 物品共现矩阵 + 品类搭配模式 | 不衰减 | “这件衬衫常搭那条牛仔裤” |

每次穿着或反馈，L2/L3/L4 三级同步更新。推荐时指数衰减融合，season 间的 0.3x 过渡权重处理换季场景。

### 2. 混合推荐架构（Pipeline + LLM）

```
用户请求 → 意图识别 → 上下文采集 → 规则粗筛 → LLM 精排 → 反馈闭环
```

- **规则负责硬约束**：温度范围、天气条件、季节匹配、近期避免重复
- **LLM 负责软判断**：配色协调、风格统一、场合适配、自然语言推荐理由
- LLM 不可用时自动降级为偏好加权的规则引擎

### 3. 自由拖拽搭配画布

推荐结果不再是僵硬的内容框——每件衣物以去底 PNG 呈现，支持自由拖拽和缩放，直观感受搭配效果。上衣在上、下装在下、鞋在底部、配饰在侧边，所见即所得。

### 4. 视觉识别自动录入

上传衣物照片，阿里云 SegmentCloth 自动抠图 + 通义千问 VL 识别品类/颜色/风格，支持单张多件衣物批量识别。批量模式下每件可独立编辑全部字段。

### 5. 12 品类精细化体系

从宽泛的“上衣/下装”升级为 12 个精确品类：衬衫/罩衫、T恤/背心、卫衣、毛衣/针织、外套/大衣、裤装、短裤、半身裙、连衣裙、鞋靴、包袋、配饰。每个品类有独立子品类、推荐部位映射和默认画布坐标。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + TanStack Query + React Router 6 |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + SQLite (WAL) |
| 鉴权 | JWT (HS256, 7天过期) + bcrypt 密码哈希 |
| AI / ML | DeepSeek API（穿搭推荐）· 通义千问 VL（视觉分类）· SegmentCloth（服饰分割） |
| 外部 API | 高德天气 · DeepSeek LLM · 阿里云 DashScope · 阿里云图像分割 |

## 快速开始

### 环境变量

在 `backend/` 目录创建 `.env`（参考 `.env.example`）：

```bash
DEEPSEEK_API_KEY=sk-xxx        # DeepSeek（穿搭推荐 LLM，可选）
DASHSCOPE_API_KEY=sk-xxx       # 阿里云 DashScope（视觉识别，可选）
ALIBABA_CLOUD_ACCESS_KEY_ID=xxx   # 阿里云服饰分割（可选）
ALIBABA_CLOUD_ACCESS_KEY_SECRET=xxx
AMAP_API_KEY=xxx               # 高德天气 API（可选，无 key 使用 mock 数据）
JWT_SECRET=xxx                 # JWT 签名密钥（可选，默认使用开发密钥）
```

不配置外部 API Key 也能启动——天气使用 mock 数据，推荐降级为规则引擎，分类/分割功能跳过。

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`，注册账号后即可使用。

### 运行测试

```bash
cd backend
pytest tests/ -v
```

> 测试覆盖衣橱 CRUD、穿着记录、搭配管理、推荐接口共 13 个用例。

## 目录结构

```
AiCloset/
├── frontend/                     # React 前端
│   ├── src/
│   │   ├── api/client.ts         # Axios 实例 + 拦截器 + 全部 API 函数
│   │   ├── App.tsx               # 路由配置（/login, /wardrobe, /outfits, /recommend, /stats）
│   │   ├── main.tsx              # React 入口（Ant Design ConfigProvider + Router）
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # 鉴权上下文（login/register/logout + JWT 持久化）
│   │   ├── components/
│   │   │   ├── Layout.tsx        # 全局布局（顶部标题栏 + 底部 Tab Bar）
│   │   │   ├── ItemCard.tsx      # 衣物卡片（缩略图 + 删除 + 穿着记录）
│   │   │   ├── ItemForm.tsx      # 衣物录入表单（单件/批量编辑 + 拍照识别）
│   │   │   ├── OutfitCard.tsx    # 搭配展示卡片
│   │   │   ├── OutfitComposer.tsx # 拖拽缩放搭配画布
│   │   │   └── RecommendCard.tsx # 推荐结果（天气条 + 搭配画布 + 推荐理由）
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx     # 登录/注册页
│   │   │   ├── WardrobePage.tsx  # 衣橱管理（品类筛选 + 搜索 + 排序 + 详情弹窗）
│   │   │   ├── OutfitsPage.tsx   # 搭配管理（创建弹窗 + 衣物选择 + 位置分配）
│   │   │   ├── RecommendPage.tsx # AI 穿搭推荐（日常模式 + 场景模式）
│   │   │   └── StatsPage.tsx     # 统计看板（概览 + 品类分布 + 颜色分布 + 高频/沉睡）
│   │   ├── types/index.ts       # TS 类型 + 12品类/22风格/42颜色/26材质常量
│   │   └── styles/global.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts           # Vite 配置（含 /api 和 /uploads 代理到后端 8000）
├── backend/                      # FastAPI 后端
│   ├── main.py                   # 应用入口（CORS + StaticFiles + 路由注册 + 自动建表）
│   ├── config.py                 # 环境变量配置
│   ├── app/
│   │   ├── auth.py               # JWT 签发与验证（get_current_user 依赖）
│   │   ├── database.py           # SQLAlchemy 引擎 + WAL 模式 + 自动迁移
│   │   ├── models.py             # 6 个 ORM 模型（User, ClothingItem, Outfit, WearRecord, Recommendation, UserProfile）
│   │   ├── schemas.py            # Pydantic 请求/响应模型
│   │   ├── routers/
│   │   │   ├── auth.py           # /api/auth（注册、登录、获取当前用户）
│   │   │   ├── wardrobe.py       # /api/wardrobe（衣橱 CRUD + 自动分类 + 图片上传 + 统计 + 穿着记录）
│   │   │   ├── outfits.py        # /api/outfits（搭配 CRUD）
│   │   │   └── recommend.py      # /api/recommend（日常推荐 + 场景推荐 + 反馈）
│   │   ├── services/
│   │   │   ├── wardrobe.py       # 衣橱业务逻辑
│   │   │   ├── recommend.py      # 推荐流水线（天气 → 过滤 → LLM/降级）
│   │   │   └── preferences.py    # 多级偏好引擎（L2/L3/L4 更新 + LLM格式化 + 加权评分）
│   │   └── agent/
│   │       ├── llm.py            # DeepSeek LLM 客户端
│   │       ├── weather.py        # 高德天气 API + mock 降级
│   │       ├── matcher.py        # 规则引擎（硬过滤 + 加权随机选取）
│   │       ├── vision.py         # 通义千问 VL 衣物识别
│   │       └── segmentation.py   # SegmentCloth 服饰抠图
│   ├── uploads/                  # 本地图片存储
│   ├── data/                     # SQLite 数据库文件
│   ├── tests/
│   │   └── test_api.py           # 13 个集成测试
│   ├── requirements.txt
│   └── .env.example
├── PRD.md                        # 产品需求文档
├── CLAUDE.md                     # AI 助手指南
└── LICENSE
```

## API 概览

### 鉴权

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册（phone + password + nickname） |
| `/api/auth/login` | POST | 登录，返回 JWT token |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 衣橱

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/wardrobe/items` | GET | 衣物列表（筛选：category/season/style/search，排序：sort） |
| `/api/wardrobe/items` | POST | 新增衣物 |
| `/api/wardrobe/items/{id}` | GET/PUT/DELETE | 衣物 CRUD |
| `/api/wardrobe/items/{id}/images` | POST | 追加图片 |
| `/api/wardrobe/auto-classify` | POST | 上传照片自动识别（支持多件批量） |
| `/api/wardrobe/stats` | GET | 衣橱统计看板 |
| `/api/wardrobe/wear-records` | GET/POST | 穿着记录查询/记录 |

### 搭配

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/outfits` | GET/POST | 搭配列表/创建 |
| `/api/outfits/{id}` | DELETE | 删除搭配 |

### 推荐

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/recommend/daily` | POST | 日常推荐（city + occasion） |
| `/api/recommend/scenario` | POST | 场景推荐（自然语言 description + city） |
| `/api/recommend/{id}/feedback` | POST | 推荐反馈（liked/disliked） |

> 除 `/api/auth/*` 外，所有接口需要在请求头携带 `Authorization: Bearer <token>`。

## 多级记忆运作流程

```
穿着记录 / 推荐反馈
        │
        ▼
  update_preferences_on_wear()
        │
        ├── L2: 短期向量衰减后叠加新数据（7天半衰期）
        ├── L3: 当前季节 +1.0 → 相邻季节 +0.3，EMA 学习温度舒适区间
        ├── L4: 物品共现对 + 品类搭配模式（Top-100 容量裁剪）
        │
        ▼
  推荐请求
        │
        ├── filter_candidates() 温度/季节/天气 硬过滤
        ├── format_preferences_for_llm() 结构化三级 prompt
        │   ├── 近期偏好（风格/品类/颜色 Top 3）
        │   ├── 季节偏好（当前+相邻季节融合）
        │   └── 经典搭配（高频共现 Top 3）
        ├── LLM 精排 / 规则引擎降级
        └── score_items_by_preferences() 多级融合加权
            ├── L2 短期 boost（风格 0.08 + 颜色 0.05 + 品类 0.06）
            ├── L3 季节 boost（风格 0.04 + 颜色 0.03 + 品类 0.03）
            ├── L4 共现亲和 × 0.10
            └── 不喜欢物品 × 0.15
```

## 冷启动机制

| 记忆层级 | 激活阈值 | 激活前行为 |
|----------|---------|-----------|
| L2 短期偏好 | 7天内 ≥ 2次穿着 | 不展示“近期偏好”段落 |
| L3 季节档案 | 当前季节 ≥ 2次穿着 | 不展示“季节偏好”段落 |
| L4 关系记忆 | ≥ 3对共现 | 不展示“经典搭配”段落 |

渐进式个性化——数据越丰富，推荐越精准。

## 常见问题

### 图片不显示？

Vite 开发服务器已将 `/uploads` 代理到后端 `http://localhost:8000`，确保后端已启动且 `backend/uploads/` 目录存在。

### LLM 推荐返回空？

检查 `DEEPSEEK_API_KEY` 是否正确配置。未配置时系统会自动降级为规则引擎推荐。

### 天气数据不准确？

检查 `AMAP_API_KEY`。未配置时使用各城市各季节的基准 mock 数据。

### 导入 requirements.txt 报错？

部分阿里云 SDK 包名含版本号（如 `alibabacloud_imageseg20191230`），如果 pip 安装失败，可逐个安装：

```bash
pip install fastapi uvicorn sqlalchemy python-multipart Pillow httpx openai python-dotenv pytest bcrypt PyJWT
pip install alibabacloud_imageseg20191230 alibabacloud_tea_openapi alibabacloud_tea_util
```

## 开源许可

MIT License © 2026

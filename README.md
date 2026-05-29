# AiCloset — 智能电子衣橱

数字化管理你的衣橱，AI 根据天气、场合、穿搭记忆，推荐每日穿搭方案。

## 功能特性

### 衣橱管理
- **12 品类精细化体系**：衬衫/罩衫、T恤/背心、卫衣、毛衣/针织、外套/大衣、裤装、短裤、半身裙、连衣裙、鞋靴、包袋、配饰，每品类有独立子品类库
- **多维度筛选排序**：按品类、季节、风格、颜色、状态筛选，支持穿着频次和创建时间排序，关键词搜索
- **AI 拍照识别**：上传衣服照片，通义千问 VL 自动识别品类、颜色、风格标签、材质、季节、温度范围，支持单张多件批量识别
- **服饰抠图**：阿里云 SegmentCloth 自动去除背景，生成透明 PNG
- **CSV 导出**：衣橱数据一键导出，UTF-8 BOM 兼容 Excel

### 搭配管理
- **自由拖拽画布**：衣物以去底图片呈现在画布上，支持拖拽移动和缩放，直观感受搭配效果
- **部位分配**：按上衣/下装/外套/连衣裙/鞋靴/配饰/包袋分配位置
- **场景标签**：为搭配打上通勤、约会、运动等场景标签，支持筛选搜索

### AI 穿搭推荐
- **日常推荐**：输入城市，获取基于实时天气和偏好的穿搭方案，含推荐理由
- **场景推荐**：自然语言描述需求（"明天面试"、"周末约会"），自动识别场合并推荐
- **出行胶囊**：输入目的地、天数、场合，生成打包清单和每日穿搭计划
- **混合架构**：LLM（DeepSeek）负责审美判断和推荐理由，规则引擎负责温度/天气硬约束，LLM 不可用时自动降级
- **反馈闭环**：点赞/点踩反馈实时写入偏好引擎

### 多级记忆偏好引擎（L1-L4）

| 层级 | 维度 | 半衰期 | 解决的问题 |
|------|------|--------|-----------|
| **L1** 实时上下文 | 天气 · 场合 · 近3天穿着 | 不持久化 | 今天下雨、有面试 |
| **L2** 短期偏好 | 14天滑动窗口 | 7天 | "最近降温，更爱穿毛衣" |
| **L3** 长期档案 | 春夏秋冬独立偏好向量 | 90天 | "夏天爱穿裙子，冬天爱穿羽绒服" |
| **L4** 关系记忆 | 物品共现矩阵 + 品类搭配模式 | 不衰减 | "这件衬衫常搭那条牛仔裤" |

渐进式个性化——数据越丰富，推荐越精准。冷启动阈值：L2 ≥ 2次穿着，L3 ≥ 2次穿着，L4 ≥ 3对共现。

### 风格人格画像
- **四维人格雷达图**：风格取向（经典→潮流）、色彩倾向（克制→大胆）、搭配复杂度（简约→层次）、功能导向（实用→个性）
- **六种风格原型**：极简主义者、潮流先锋、复古灵魂、都市时髦、自由灵魂、活力运动
- **AI 动漫画像**：根据人格维度调用 qwen-image-2.0-pro 生成动漫风格人物画像，hash 缓存避免重复生成

### 数据看板
- **KPI 概览**：衣物总数、总价值、沉睡单品数、平均单次穿着成本
- **品类/颜色分布**：柱状图 + 标签云
- **穿着日历**：月度热力图，每日展示穿着衣物缩略图
- **衣橱缺口分析**：12 件基础款覆盖率检查，评分和建议

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + TanStack Query + React Router 6 |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + SQLite (WAL) |
| 鉴权 | JWT access token + httpOnly refresh cookie + bcrypt + token_version 失效 |
| AI | DeepSeek（穿搭推荐）· 通义千问 VL（视觉识别）· qwen-image-2.0-pro（风格画像）· SegmentCloth（服饰抠图） |
| 外部 API | 高德天气 · DeepSeek · 阿里云 DashScope · 阿里云图像分割 |

## 快速开始

### 环境变量

在 `backend/` 创建 `.env`（参考 `.env.example`）：

```bash
DEEPSEEK_API_KEY=sk-xxx        # DeepSeek（穿搭推荐 LLM，可选）
DASHSCOPE_API_KEY=sk-xxx       # 阿里云 DashScope（视觉识别 + 画像生成，可选）
ALIBABA_CLOUD_ACCESS_KEY_ID=xxx   # 阿里云服饰分割（可选）
ALIBABA_CLOUD_ACCESS_KEY_SECRET=xxx
AMAP_API_KEY=xxx               # 高德天气 API（可选，无 key 使用模拟数据）
JWT_SECRET=xxx                 # JWT 签名密钥（可选，默认使用开发密钥）
```

不配置外部 API Key 也能启动——天气使用模拟数据，推荐降级为规则引擎，分类/分割功能跳过。

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

访问 `http://localhost:5173` 注册账号即可使用。

### 运行测试

```bash
cd backend
pytest tests/ -v
```

## 目录结构

```
AiCloset/
├── frontend/                        # React 前端
│   ├── src/
│   │   ├── api/client.ts            # Axios 实例 + 拦截器 + 全部 API 函数
│   │   ├── App.tsx                  # 路由配置
│   │   ├── main.tsx                 # React 入口
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # 鉴权上下文
│   │   ├── components/
│   │   │   ├── ui/                  # 通用 UI 组件（Button, Card, Tag, Typography, SearchBar, EmptyState, ImageBlock）
│   │   │   ├── Layout.tsx           # 响应式全局布局（桌面侧栏 / 平板图标栏 / 手机顶栏+底栏）
│   │   │   ├── WardrobeView.tsx     # 衣橱浏览（筛选 + 搜索 + 详情弹窗 + 批量录入）
│   │   │   ├── StatsView.tsx        # 统计看板（KPI + 品类/颜色分布 + 高频/沉睡 + 缺口分析 + 穿着日历）
│   │   │   ├── ItemCard.tsx         # 衣物卡片
│   │   │   ├── ItemForm.tsx         # 衣物录入表单（含 AI 识别 + 批量模式）
│   │   │   ├── OutfitCard.tsx       # 搭配卡片
│   │   │   ├── OutfitComposer.tsx   # 拖拽缩放搭配画布
│   │   │   ├── RecommendCard.tsx    # 推荐结果（天气条 + 搭配画布 + 推荐理由 + 操作按钮）
│   │   │   ├── StyleRadar.tsx       # SVG 四维人格雷达图（点击维度查看详情）
│   │   │   └── WearCalendar.tsx     # 月度穿着日历
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx        # 登录/注册
│   │   │   ├── WardrobePage.tsx     # 衣橱管理（衣橱 + 统计 双标签）
│   │   │   ├── OutfitsPage.tsx      # 搭配管理
│   │   │   ├── RecommendPage.tsx    # AI 穿搭推荐（日常 + 场景 + 胶囊）
│   │   │   └── ProfilePage.tsx      # 个人中心（风格画像 + 编辑资料 + 密码 + API Key + 关于）
│   │   ├── hooks/
│   │   │   └── useResponsive.ts     # 响应式断点 hook
│   │   ├── utils/
│   │   │   ├── styleProfile.ts      # 风格人格计算引擎
│   │   │   ├── imageUrl.ts          # 图片路径解析
│   │   │   ├── export.ts            # CSV 导出
│   │   │   └── exportImage.ts       # 搭配卡片 PNG 导出
│   │   ├── styles/
│   │   │   ├── tokens.ts            # 设计令牌（色板/阴影/圆角/间距/字体/动效）
│   │   │   └── global.css           # 全局样式
│   │   └── types/index.ts           # TypeScript 类型 + 12品类/30+风格/40+颜色/27材质常量
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts               # Vite 配置（/api 和 /uploads 代理到后端 8000）
├── backend/                         # FastAPI 后端
│   ├── main.py                      # 应用入口（CORS + StaticFiles + 路由注册 + 自动建表）
│   ├── config.py                    # 环境变量配置
│   ├── app/
│   │   ├── auth.py                  # JWT 签发与验证 + 刷新令牌 Cookie
│   │   ├── crypto.py                # API Key Fernet 加解密
│   │   ├── database.py              # SQLAlchemy 引擎 + WAL + 自动迁移
│   │   ├── models.py                # 6 个 ORM 模型（User, ClothingItem, Outfit, WearRecord, Recommendation, UserProfile）
│   │   ├── schemas.py               # Pydantic 请求/响应模型
│   │   ├── routers/
│   │   │   ├── auth.py              # /api/auth（注册/登录/刷新/登出）
│   │   │   ├── wardrobe.py          # /api/wardrobe（衣橱 CRUD + 自动分类 + 统计 + 缺口分析 + 穿着记录）
│   │   │   ├── outfits.py           # /api/outfits（搭配 CRUD）
│   │   │   ├── recommend.py         # /api/recommend（日常推荐 + 场景推荐 + 胶囊 + 反馈）
│   │   │   ├── user.py              # /api/user（API Key + 资料 + 密码 + 头像）
│   │   │   └── style_portrait.py    # /api/user/style-portrait（AI 动漫画像生成）
│   │   ├── services/
│   │   │   ├── wardrobe.py          # 衣橱业务逻辑
│   │   │   ├── recommend.py         # 推荐流水线（天气 → 过滤 → LLM/降级 → 持久化）
│   │   │   └── preferences.py       # 多级偏好引擎（L2/L3/L4 更新 + LLM格式化 + 加权评分）
│   │   └── agent/
│   │       ├── llm.py               # DeepSeek LLM 客户端（推荐 + 胶囊）
│   │       ├── weather.py           # 高德天气 API + 模拟数据降级
│   │       ├── matcher.py           # 规则引擎（硬过滤 + 加权随机 + 模板理由）
│   │       ├── vision.py            # 通义千问 VL 衣物识别
│   │       ├── segmentation.py      # SegmentCloth 服饰抠图
│   │       └── image_gen.py         # qwen-image-2.0-pro 动漫画像生成
│   ├── uploads/                     # 本地图片存储
│   ├── data/                        # SQLite 数据库文件
│   ├── tests/test_api.py            # 集成测试
│   ├── requirements.txt
│   └── .env.example
├── CLAUDE.md                        # AI 助手指南
└── README.md
```

## API 概览

### 鉴权
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册（限流 5次/分钟） |
| `/api/auth/login` | POST | 登录，返回 JWT + httpOnly refresh cookie |
| `/api/auth/refresh` | POST | 静默刷新 access token |
| `/api/auth/logout` | POST | 登出，token_version 自增失效 |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 衣橱
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/wardrobe/items` | GET | 衣物列表（筛选：category/season/style/search/status，排序：sort） |
| `/api/wardrobe/items` | POST | 新增衣物 |
| `/api/wardrobe/items/{id}` | GET/PUT/DELETE | 衣物 CRUD |
| `/api/wardrobe/items/{id}/images` | POST | 追加图片 |
| `/api/wardrobe/auto-classify` | POST | 上传照片 AI 识别（支持多件批量） |
| `/api/wardrobe/stats` | GET | 衣橱统计看板 |
| `/api/wardrobe/gap-analysis` | GET | 基础款缺口分析 |
| `/api/wardrobe/wear-records` | GET/POST | 穿着记录查询/记录 |

### 搭配
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/outfits` | GET/POST | 搭配列表/创建 |
| `/api/outfits/{id}` | GET/PUT/DELETE | 搭配 CRUD |

### 推荐
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/recommend/daily` | POST | 日常推荐（city + occasion） |
| `/api/recommend/scenario` | POST | 场景推荐（自然语言 + city） |
| `/api/recommend/capsule` | POST | 出行胶囊（destination + days + occasions） |
| `/api/recommend/{id}/feedback` | POST | 反馈（liked/disliked） |

### 用户
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/user/profile` | GET/PUT | 个人资料 |
| `/api/user/password` | PUT | 修改密码 |
| `/api/user/avatar` | POST | 上传头像 |
| `/api/user/keys` | GET/PUT | API Key 管理（加密存储） |
| `/api/user/style-portrait` | POST | AI 动漫画像生成（hash 缓存） |

> 除 `/api/auth/*` 外，所有接口需携带 `Authorization: Bearer <token>`。

## 常见问题

### 图片不显示？
Vite 开发服务器已将 `/uploads` 代理到后端 `http://localhost:8000`，确保后端已启动且 `backend/uploads/` 目录存在。

### LLM 推荐返回空？
检查 `DEEPSEEK_API_KEY` 是否正确配置。未配置时系统自动降级为规则引擎推荐。

### 天气数据不准确？
检查 `AMAP_API_KEY`。未配置时使用各城市季节基准模拟数据。

### 导入 requirements.txt 报错？
部分阿里云 SDK 包名含版本号（如 `alibabacloud_imageseg20191230`），如果 pip 安装失败，可逐个安装：

```bash
pip install fastapi uvicorn sqlalchemy python-multipart Pillow httpx openai python-dotenv pytest bcrypt PyJWT cryptography slowapi
pip install alibabacloud_imageseg20191230 alibabacloud_tea_openapi alibabacloud_tea_util
```

## 开源许可

MIT License

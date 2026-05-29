# AiCloset 代码库优化检查报告

检查日期：2026-05-29  
检查范围：前端 React/Vite/TypeScript、后端 FastAPI/SQLAlchemy、测试、配置、Docker 与仓库产物。

## 总体判断

项目已经从 Phase 0 进入了一个较完整的 MVP 雏形：前端页面、鉴权、衣橱 CRUD、搭配、推荐、偏好记忆、图片识别/分割、Docker 配置和基础测试都已经存在。当前最值得优先处理的不是继续堆功能，而是把鉴权后的测试体系、数据库迁移、数据约束、配置一致性和工程产物管理补齐。否则后续功能越多，回归成本会快速上升。

## P0：应优先修复

### 1. 后端测试已与鉴权逻辑脱节

现象：执行 `$env:JWT_SECRET='test-secret'; python -m pytest backend\tests -q` 后，13 个测试中 12 个失败，失败原因均为访问受保护接口时返回 `401 Unauthorized`。

涉及文件：
- `backend/tests/test_api.py`
- `backend/app/routers/wardrobe.py`
- `backend/app/routers/outfits.py`
- `backend/app/routers/recommend.py`

建议：
- 在测试中增加注册/登录 fixture，统一返回带 `Authorization: Bearer <token>` 的客户端。
- 或者在服务层单元测试中覆盖 `get_current_user` 依赖，但集成测试仍应保留真实鉴权链路。
- 使用临时 SQLite 数据库，避免测试污染 `backend/data/aicloset.db`。
- 增加鉴权相关用例：注册、登录、刷新、登出、密码修改后旧 token 失效。

### 2. 数据库迁移逻辑存在静默失败风险

`backend/app/database.py` 中 `_migrate_users_token_version()` 和 `_migrate_user_api_keys()` 使用了 `text(...)`，但函数内部没有导入 `text`，文件顶部也没有统一导入。由于异常被 `except Exception: pass` 吞掉，已有数据库缺列时可能不会真正迁移，而且没有任何日志。

建议：
- 在文件顶部统一 `from sqlalchemy import create_engine, event, text`。
- 不要裸 `except Exception: pass`，至少记录 debug/warning 日志。
- 用 `PRAGMA table_info` 先判断列是否存在，再执行 `ALTER TABLE`。
- 尽快引入 Alembic，将当前 ad-hoc 迁移固化为可追踪版本。

### 3. README 与实际鉴权配置不一致

README 描述 `JWT_SECRET` 可选、默认开发密钥；但 `backend/app/auth.py` 在缺少 `JWT_SECRET` 时会直接 `raise RuntimeError`。这会造成新开发者按文档启动失败。

建议：
- 二选一：要么文档明确 `JWT_SECRET` 必填，要么代码在开发环境提供显式的 dev fallback。
- `.env.example` 中保留 `JWT_SECRET` 必填说明，并补充最小长度/生成方式。
- Docker、README、本地启动说明保持一致。

## P1：高价值结构优化

### 4. ORM 缺少外键与关系约束

当前 `user_id`、`outfit_id` 等字段多为普通 `Integer`，没有 `ForeignKey`；删除衣物时也没有处理搭配、穿着记录、推荐记录中的引用。

风险：
- 删除衣物后，搭配中的 `item_id` 可能悬空。
- 用户数据隔离依赖业务查询，数据库层无法兜底。
- 后续切 PostgreSQL 时，数据一致性问题会放大。

建议：
- 为 `ClothingItem.user_id`、`Outfit.user_id`、`WearRecord.user_id`、`Recommendation.user_id`、`UserProfile.user_id` 添加外键。
- 明确删除策略：衣物归档优先于硬删除；硬删除时清理搭配引用或阻止删除。
- 为常用查询字段加组合索引，例如 `(user_id, status, created_at)`、`(user_id, wear_date)`。

### 5. 输入校验偏弱

多个字段目前是自由字符串，例如 `category`、`status`、`feedback`、`sort`、`position`、`occasion`。`RecommendationFeedback.feedback` 也没有限制为 `liked/disliked`。

建议：
- 使用 `Literal` 或枚举约束固定值。
- 对 `temp_min <= temp_max`、`purchase_price >= 0`、`days` 范围、手机号格式增加 Pydantic 校验。
- 对 `sort` 这种查询参数使用白名单，非法值返回 422，而不是静默 fallback。

### 6. 服务层存在重复查询与边界问题

例子：
- `list_items()` 和 `get_stats()` 都手写了“批量计算最后穿着日期”的逻辑，可抽成内部 helper。
- `record_wear()` 通过 `outfit_id` 查询搭配时没有限制 `user_id`，理论上可能引用其他用户的搭配。
- `record_wear()` 增加衣物穿着次数时也没有限制 `user_id`。

建议：
- 所有业务查询都带上 `user_id` 约束。
- 抽出 `_get_last_worn_map(db, user_id, item_ids)`。
- 对穿着记录创建增加校验：`item_ids` 必须属于当前用户，`outfit_id` 必须属于当前用户。

## P2：工程化与可维护性

### 7. 仓库中存在不应提交的生成产物

本次扫描看到：
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/__pycache__/`、`backend/app/**/__pycache__/`
- `backend/data/aicloset.db`
- `backend/uploads/*`

`.gitignore` 已经配置忽略这些路径，但本地仍存在大量生成产物。建议确认它们是否已经被 Git 跟踪；如果已跟踪，应从索引中移除。

建议命令：
```powershell
git ls-files frontend/node_modules frontend/dist backend/data backend/uploads
git ls-files | Select-String "__pycache__|\.pyc$"
```

### 8. 前端构建在当前沙箱下未能完成

执行 `npm run build` 时，`tsc -b` 阶段未报错，随后 Vite 加载配置失败：

```text
Cannot read directory "../../..": Access is denied.
Could not resolve "C:\Users\chengtao\Desktop\AiCloset\frontend\vite.config.ts"
```

这更像当前 Windows 沙箱/权限问题，而不是 TypeScript 代码问题。但建议在本机正常终端或 CI 中再跑一次，确认不是 Vite/esbuild 与路径权限的环境兼容问题。

### 9. 前端 API 层可以更类型安全

`frontend/src/api/client.ts` 已集中管理 API，这是好方向。后续可以继续优化：
- 为 `AxiosError` 做统一错误解析，避免页面层重复处理 `error.response?.data?.detail`。
- 给 `_retry` 扩展 Axios config 类型，减少隐式 any/私有字段。
- 将 auth、wardrobe、outfits、recommend、user 拆成多个 API 模块，降低单文件增长压力。

### 10. 编码与文档显示需要统一验证

PowerShell 默认读取时出现中文乱码，但 Python/pytest 能正确显示中文测试数据，说明源码本身大概率是 UTF-8，主要是终端显示编码问题。不过 README、注释、日志中中文很多，建议统一：
- 所有文本文件保存为 UTF-8。
- 在 Windows 开发说明中补充 `chcp 65001` 或使用 UTF-8 终端。
- CI 中增加基本的编码/格式检查，避免混入非 UTF-8 文件。

## P3：产品与架构演进建议

### 11. 推荐引擎需要可观测性

推荐链路包含天气、规则筛选、LLM、fallback、偏好注入。现在日志较多，但缺少结构化追踪。

建议：
- 为每次推荐生成 `request_id`。
- 记录候选数量、过滤原因、LLM 是否启用、fallback 原因、耗时。
- 推荐结果持久化时保存关键版本信息，例如规则版本、模型名、天气来源。

### 12. AI 外部服务调用需要超时、重试和降级标准化

建议为 DeepSeek、Amap、DashScope、SegmentCloth 建立统一客户端规范：
- 默认 timeout。
- 可控重试，避免图片接口重复扣费。
- 明确错误分类：配置缺失、网络失败、服务返回失败、解析失败。
- 对用户展示可理解的降级提示。

### 13. 图片存储路径建议进一步收敛

当前上传文件使用本地 `uploads/`，并存储类似 `uploads/xxx.png` 的路径。建议：
- 统一图片 URL/path 规范，不在多个层中拼接路径。
- 保存原图、分割图、头像图时区分目录。
- 增加孤儿文件清理任务。
- 为后续 OSS 迁移预留 `storage_key` 与 `public_url` 分离。

## 建议实施顺序

1. 修复测试鉴权 fixture，并让后端测试全部通过。
2. 修复迁移 `text` 导入与异常吞噬，补日志。
3. 统一 README、`.env.example`、代码中的 `JWT_SECRET` 行为。
4. 为关键输入增加 Pydantic 枚举/范围校验。
5. 补齐 `record_wear()`、搭配、删除衣物相关的数据归属校验。
6. 引入 Alembic，建立正式迁移基线。
7. 清理被 Git 跟踪的生成产物，建立 CI：后端 pytest + 前端 typecheck/build。

## 本次验证记录

已执行：
- `python -m py_compile backend\main.py backend\app\auth.py backend\app\database.py backend\tests\test_api.py`：通过。
- `$env:JWT_SECRET='test-secret'; python -m pytest backend\tests -q`：1 通过，12 失败，失败集中在未认证访问受保护 API。
- `npm run build`：TypeScript 阶段未显示错误，Vite 加载配置时遇到当前环境访问权限问题。


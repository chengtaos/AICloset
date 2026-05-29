# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概况

AiCloset — 智能电子衣橱，帮助用户数字化管理衣物，并通过 AI Agent 根据天气、场合、个人偏好推荐穿搭方案。详见 [PRD.md](PRD.md)。

## 技术架构

- **前端**：React + Vite + TypeScript
- **后端**：Python FastAPI
- **数据库**：SQLite（MVP）→ PostgreSQL
- **图片存储**：本地文件系统（MVP）→ OSS
- **外部 API**：和风天气（天气数据）、Codex API / OpenAI API（LLM 推荐）

## 目录结构（规划）

```
AiCloset/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/       # 后端 API 调用
│   └── package.json
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── routers/   # API 路由
│   │   ├── models/    # SQLAlchemy 数据模型
│   │   ├── services/  # 业务逻辑
│   │   └── agent/     # AI Agent 引擎
│   ├── requirements.txt
│   └── main.py
└── PRD.md             # 产品需求文档
```

## Agent 引擎架构

推荐引擎采用 **Pipeline + LLM** 混合架构：

1. **意图识别** — 解析用户输入（日常推荐 / 场景推荐 / 出行打包）
2. **上下文采集** — 获取实时天气、用户偏好画像、穿着历史
3. **候选筛选** — 基于规则（温度范围、场合标签）粗筛到 10-20 件
4. **LLM 精排** — 由 LLM 完成审美判断和最终搭配，生成推荐理由
5. **反馈闭环** — 用户点赞/点踩反馈回写偏好画像

规则负责硬约束（温度、场合、避免近期重复），LLM 负责软判断（搭配和谐度、审美）。详见 PRD.md 第 5.2 节。

## 项目阶段

当前处于 Phase 0：产品设计阶段。Phase 1 MVP 开发即将开始，目标实现衣物 CRUD + 手动搭配 + 基于规则的简单天气推荐。

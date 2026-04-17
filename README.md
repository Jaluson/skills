# Skills — AI 辅助开发标准体系

## 概述

本目录包含一套完整的 AI 辅助开发 Skill 体系，覆盖从任务入口、环境管理到前后端编码、数据库设计的全链路开发流程。

## Skill 架构

```
用户任务
   ↓
dev-task-precheck（前置守门员 — 统一入口）
   ├─→ dev-env-manager（环境检测与配置）
   ├─→ database-design-standards（数据库设计）──→ springboot-dev-standards（后端实现）──→ vue3-dev-standards（前端实现）
   └─→ 通用开发流程（无匹配 skill 时的回退）
```

## Skill 列表

### dev-task-precheck — 开发任务前置守门员
**定位**：所有编码任务的统一入口
**职责**：任务意图分析 → 项目预扫描 → 环境检查 → Skill 路由 → 上下文交接
**触发时机**：用户要求写代码、改代码、新增功能、修复 bug 等任何编码任务

### dev-env-manager — 开发环境感知管理器
**定位**：环境基础层
**职责**：项目类型检测 → 环境需求解析 → 配置读取 → 环境状态检查 → 配置引导
**触发时机**：构建、运行、测试、打包等涉及项目操作的任务
**配置文件**：`.claude/project-env/.env`

### springboot-dev-standards — Spring Boot 标准化开发规范
**定位**：Spring Boot 后端开发执行流水线
**流程**：深度阅读 → 全局分析 → 方案设计 → 编码 → 编译验证 → 需求回验 → 最终审查
**参考文档**：architecture.md, code-standards.md, quality-gates.md, testing.md, workflow.md

### vue3-dev-standards — Vue 3 标准化开发规范
**定位**：Vue 3 前端开发执行流水线
**流程**：深度阅读 → 全局分析 → 方案设计 → 编码 → 编译验证 → 需求回验 → 最终审查
**参考文档**：ai-pipeline.md, architecture.md, code-standards.md, component-patterns.md, quality-gates.md, quick-ref.md, testing.md, workflow.md

### database-design-standards — 数据库设计规范
**定位**：数据库表结构设计执行流水线
**流程**：需求分析 → 方案设计 → DDL 编写 → 验证审查 → 交付输出
**参考文档**：table-design.md, data-types.md, index-design.md, sql-standards.md, anti-patterns.md

## 协作规则

### 全栈任务执行顺序

```
dev-task-precheck → database-design-standards → springboot-dev-standards → vue3-dev-standards
```

1. `dev-task-precheck` 完成前置分析，生成交接包
2. 如涉及数据库设计，先交接给 `database-design-standards`
3. 数据库设计完成后，交接给 `springboot-dev-standards` 实现后端
4. 后端完成后，交接给 `vue3-dev-standards` 实现前端
5. 每一步的产出是下一步的输入，**不可并行编码**

### 交接包协议

`dev-task-precheck` 生成的交接包包含：任务信息、项目技术栈、项目结构概览、现有资源盘点、环境状态、路由信息。下游 skill 应以交接包为参考加速 P0 阶段，但**不可跳过**各自的深度阅读和用户确认。

### 降级机制

`sprintboot-dev-standards`、`vue3-dev-standards`、`database-design-standards` 均支持流程降级：

| 级别 | 适用场景 | 底线 |
|------|---------|------|
| 完整流程 | 新增模块/多表设计 | 全部阶段 |
| 标准流程 | 新增页面/API、修改 ≤3 文件 | 分析阶段可合并，编码/验证/回验不可跳过 |
| 简化流程 | 改动 ≤3 行、加字段/索引 | 编码规则和验证不可降 |
| 紧急流程 | 线上 hotfix | 编码标准不降 + 至少做基础验证 |

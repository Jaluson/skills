# Engineer Skills

开发规约技能库，为开发团队提供标准化的开发规范指导。

## 技能列表

| 技能 | 说明 | 触发场景 |
|------|------|----------|
| **tk-start** | 任务启动与需求解析（调度器） | 任何任务、问题或需求 |
| **tk-springboot-dev-standards** | Spring Boot 开发全面规约 | Java/Spring Boot 代码审查、开发规约检查 |
| **tk-vue3-dev-standards** | Vue 3 + TypeScript 开发规约 | Vue/前端代码审查、开发规约检查 |

## tk-start（调度器）

**角色定位**：任务调度器，负责解析需求 → 识别类型 → 匹配 Skill → 调度分发。

**核心原则**：
- 只调度不执行
- 优先匹配 `tk-` 前缀的标准化 Skill
- 必须传递完整上下文
- 监控下游执行状态，不介入执行本身

**调度流程**：
```
用户提问 → 解析需求 → 匹配合适 Skill → 调度分发 → 结果汇总 → 向用户汇报
```

## tk-springboot-dev-standards

Spring Boot 开发全面规约，涵盖：
- 分层架构规约（Controller/Service/Repository）
- 代码命名规约
- RESTful API 设计规约
- 数据库操作规约（雪花ID、表命名）
- 异常处理规约
- 日志规约
- **编译验证要求**（强制）
- 测试规约
- Git 提交规范
- 代码审查检查清单

**关键规则**：
- 禁止在 Controller 层写业务逻辑
- 必须使用 `@Valid/@Validated` 参数校验
- 禁止字段注入，必须用构造方法
- **代码编写完毕后必须执行 `./mvnw compile` 验证通过**

## tk-vue3-dev-standards

Vue 3 + TypeScript 开发全面规约，涵盖：
- 项目结构规约
- 组件设计规约（拆分原则、命名、Props、事件）
- TypeScript 类型规范
- 状态管理规约（Pinia）
- 样式规范
- API 调用规范
- Git 提交规范
- 代码审查检查清单

**关键规则**：
- 组件不超过 300 行代码
- 必须使用 TypeScript 类型定义
- 样式必须使用 scoped 隔离
- **任务结束前必须进行编译检查**（`vue-tsc --noEmit`、`npm run lint`、`npm run build`）

## 共同要求

### 文档输出（任务必须）
- 接口文档（API 变更时）
- 测试文档（功能变更时）
- SQL 文档（数据库变更时）
- Curl 快捷测试命令

### 编译验证（强制）
- 代码编写完毕后必须验证编译通过
- 编译未通过前禁止提交代码

## 目录结构

```
skills/
├── tk-start/                          # 任务调度器
│   └── SKILL.md
├── tk-springboot-develop-standards/    # Spring Boot 开发规约
│   ├── SKILL.md
│   └── references/
│       ├── architecture.md
│       ├── code-standards.md
│       ├── testing.md
│       └── quality-gates.md
└── tk-vue3-dev-standards/             # Vue 3 开发规约
    ├── SKILL.md
    └── references/
        ├── architecture.md
        ├── code-standards.md
        ├── testing.md
        └── quality-gates.md
```

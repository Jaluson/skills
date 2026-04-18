# Engineer Skills

开发规约技能库，为 AI 辅助开发提供标准化的规则与检查清单。

## 技能列表

| 技能 | 说明 | 触发场景 |
|------|------|----------|
| **tk-start** | 任务启动与需求解析 | 用户提出任何任务或需求 |
| **tk-springboot-develop-standards** | Spring Boot 开发规约（强制） | Java/Spring Boot 代码编写、审查 |
| **tk-vue3-dev-standards** | Vue 3 + TypeScript 开发规约（强制） | Vue/前端代码编写、审查 |

## 设计原则

每个 Skill 的 SKILL.md 是**必须遵守的指令**，不是参考文档。结构遵循：

- **铁律前置** — 最关键的强制规则放在开头（首因效应）
- **检查清单后置** — 完成前自检放在末尾（近因效应）
- **详细示例外置** — 代码示例和详细规范放在 `references/` 目录

## 共同铁律

### 编译验证（强制）
- Spring Boot：代码编写完毕后**必须**执行 `mvn compile` 验证通过
- Vue 3：代码编写完毕后**必须**执行 `vue-tsc --noEmit` + `npm run lint` + `npm run build`
- **编译未通过禁止声称任务完成**

### 任务交付物
每个涉及代码修改的任务都必须同步输出：
- 接口文档（修改/新增 API 时）
- Curl 测试命令（修改/新增 API 时）
- SQL 文档（修改/新增表时）
- 测试用例说明（修改/新增功能时）

## 目录结构

```
skills/
├── tk-start/                          # 任务启动与需求解析
│   ├── SKILL.md
│   └── references/
│       ├── task-decomposition.md
│       ├── confirmation-patterns.md
│       ├── multi-agent-patterns.md
│       ├── scheduling-reporting.md
│       └── scheduling-verification.md
├── tk-springboot-develop-standards/    # Spring Boot 开发规约
│   ├── SKILL.md
│   └── references/
│       ├── architecture.md
│       ├── code-standards.md
│       ├── testing.md
│       ├── quality-gates.md
│       └── modern-java-features.md
└── tk-vue3-dev-standards/             # Vue 3 开发规约
    ├── SKILL.md
    └── references/
        ├── architecture.md
        ├── code-standards.md
        ├── testing.md
        └── quality-gates.md
```

# 项目扫描清单

本文档定义了 T1 阶段项目上下文预扫描的详细清单和字段提取规则。

## 一、扫描层次

项目预扫描分三个层次，由浅到深：

| 层次 | 范围 | 目的 | 耗时 |
|------|------|------|------|
| L1 顶层结构 | 项目根目录文件列表 | 判断项目类型 | 秒级 |
| L2 配置提取 | 读取 2-3 个关键配置文件 | 锁定技术栈和版本 | 秒级 |
| L3 资源盘点 | 扫描关键目录的文件名列表 | 发现可复用资源 | 秒级 |

注意：所有层次都不涉及逐行阅读代码内容。深度阅读留给下游 skill 的 P0 阶段。

## 二、L1：顶层结构扫描

### 操作

扫描项目根目录，列出所有文件和一级目录：

```
项目根/
├── pom.xml                — 标志：Java Maven 项目
├── package.json           — 标志：Node/前端项目
├── build.gradle           — 标志：Gradle 项目
├── go.mod                 — 标志：Go 项目
├── requirements.txt       — 标志：Python 项目
├── Cargo.toml             — 标志：Rust 项目
├── *.csproj / *.sln       — 标志：.NET 项目
├── composer.json          — 标志：PHP 项目
├── Gemfile                — 标志：Ruby 项目
├── nx.json                — 标志：Monorepo（Nx）
├── turbo.json             — 标志：Monorepo（Turborepo）
├── pnpm-workspace.yaml    — 标志：Monorepo（pnpm workspace）
├── lerna.json             — 标志：Monorepo（Lerna）
├── src/                   — 源码目录
├── frontend/              — 可能的前端目录
├── backend/               — 可能的后端目录
├── .env                   — 环境变量
├── .gitignore             — Git 忽略规则
├── README.md              — 项目说明
└── ...
```

### 判定规则

| 同时存在 | 判定 |
|---------|------|
| `pom.xml` + `package.json`（根目录） | 全栈项目（后端 + 前端在同一目录） |
| `pom.xml` + `frontend/package.json` | 前后端分离项目 |
| 仅 `pom.xml` | 纯后端项目 |
| 仅 `package.json` | 纯前端项目 |
| 多个 pom.xml（子目录） | 多模块 Maven 项目 |
| `Cargo.toml` | Rust 项目 |
| `*.csproj` / `*.sln` | .NET 项目 |
| `composer.json` | PHP 项目 |
| `Gemfile` | Ruby 项目 |
| `nx.json` / `turbo.json` / `pnpm-workspace.yaml` / `lerna.json` | Monorepo 项目（需进一步扫描各子模块） |

## 三、L2：配置提取

### Java/Maven 项目 — 提取规则

读取 `pom.xml`，提取以下信息：

| 目标信息 | 提取位置 | 提取方式 |
|----------|---------|---------|
| Spring Boot 版本 | `<parent>` 的 `<version>` | 直接读取 |
| Java 版本 | `<java.version>` 或 `<maven.compiler.source>` | 直接读取 |
| MyBatis/MyBatis-Plus | `<dependency>` 中搜索 `mybatis` | 存在即确认 |
| 数据库驱动 | `<dependency>` 中搜索 `mysql`/`postgresql`/`oracle` | 提取数据库类型 |
| Redis | `<dependency>` 中搜索 `spring-boot-starter-data-redis` | 存在即确认 |
| 消息队列 | `<dependency>` 中搜索 `rabbitmq`/`kafka` | 存在即确认 |
| 工具库 | `<dependency>` 中搜索 `lombok`/`hutool`/`guava`/`mapstruct` | 提取列表 |
| 项目模块 | `<modules>` 标签 | 提取模块列表 |

### Node/前端项目 — 提取规则

读取 `package.json`，提取以下信息：

| 目标信息 | 提取位置 | 提取方式 |
|----------|---------|---------|
| Vue 版本 | `dependencies.vue` | 直接读取 |
| React 版本 | `dependencies.react` | 直接读取 |
| UI 框架 | `dependencies` 中搜索 `element-plus`/`ant-design-vue`/`naive-ui` | 提取名称和版本 |
| 构建工具 | `devDependencies` 中搜索 `vite`/`webpack`/`nuxt` | 提取名称 |
| TypeScript | `devDependencies.typescript` | 存在即确认 |
| 路由 | `dependencies.vue-router` | 版本号 |
| 状态管理 | `dependencies.pinia`/`dependencies.vuex` | 提取名称和版本 |
| HTTP 库 | `dependencies.axios`/`dependencies.fetch` | 提取名称 |
| Node 版本要求 | `engines.node` | 直接读取 |

### Java/Gradle 项目 — 提取规则

读取 `build.gradle` 或 `build.gradle.kts`，提取以下信息：

| 目标信息 | 提取位置 | 提取方式 |
|----------|---------|---------|
| Java 版本 | `sourceCompatibility` / `targetCompatibility` / `jvmTarget` | 直接读取（Groovy DSL 或 Kotlin DSL 均需检查） |
| Spring Boot 版本 | `dependencies` 中的 `spring-boot-starter` 或 `plugins` 中的 `org.springframework.boot` | 从依赖或插件声明提取版本号 |
| 数据库驱动 | `dependencies` 中搜索 `mysql` / `postgresql` / `oracle` / `h2` | 提取数据库类型 |
| MyBatis/MyBatis-Plus | `dependencies` 中搜索 `mybatis` | 存在即确认 |
| Redis | `dependencies` 中搜索 `spring-boot-starter-data-redis` | 存在即确认 |
| 消息队列 | `dependencies` 中搜索 `rabbitmq` / `kafka` | 存在即确认 |
| 工具库 | `dependencies` 中搜索 `lombok` / `hutool` / `guava` / `mapstruct` | 提取列表 |
| Kotlin 版本（如适用） | `kotlin` 插件配置或 `embeddedKotlin` 版本 | 直接读取 |

### 其他配置文件快速检查

| 文件 | 检查内容 |
|------|---------|
| `tsconfig.json` | strict 模式、路径别名 |
| `.eslintrc.*` / `eslint.config.*` | 是否有 ESLint 配置 |
| `.prettierrc.*` | 是否有 Prettier 配置 |
| `vite.config.*` | 构建配置、插件 |
| `application.yml` / `application.properties` | 服务端口、数据库配置概览 |
| `Dockerfile` / `docker-compose.yml` | 容器化配置、服务编排、暴露端口 |
| `.env` / `.env.local` / `.env.production` | 环境变量配置（注意不读取敏感值，仅确认存在及变量名列表） |
| `jest.config.*` / `vitest.config.*` | 测试框架配置、覆盖率设置 |
| `tailwind.config.*` / `postcss.config.*` | CSS 工具链配置 |
| `.nvmrc` / `.node-version` | 项目指定的 Node 版本 |

## 四、L3：资源盘点

### 扫描目录

根据项目类型，扫描以下目录的**文件名列表**（不读内容）：

**前端项目**：
- `src/components/` — 通用组件
- `src/views/` 或 `src/pages/` — 页面
- `src/composables/` 或 `src/hooks/` — 组合函数
- `src/utils/` — 工具函数
- `src/types/` — 类型定义
- `src/api/` — API 函数
- `src/stores/` 或 `src/store/` — 状态管理
- `src/router/` — 路由配置
- `src/assets/` — 静态资源
- `src/directives/` — 自定义指令
- `src/plugins/` — 插件注册
- `src/constants/` — 常量定义
- `src/layouts/` — 布局组件
- `src/locales/` 或 `src/i18n/` — 国际化
- `src/styles/` 或 `src/css/` — 全局样式
- `src/middleware/` — 中间件

**后端项目**：
- `src/main/java/.../controller/` — 控制器
- `src/main/java/.../service/` — 服务层
- `src/main/java/.../mapper/` 或 `dao/` — 数据访问
- `src/main/java/.../entity/` 或 `domain/` 或 `model/` — 实体
- `src/main/java/.../dto/` — DTO
- `src/main/java/.../vo/` — VO
- `src/main/java/.../config/` — 配置类
- `src/main/java/.../common/` 或 `utils/` — 公共工具
- `src/main/resources/mapper/` — MyBatis XML
- `src/main/java/.../filter/` 或 `interceptor/` — 过滤器/拦截器
- `src/main/java/.../exception/` 或 `handler/` — 异常处理
- `src/main/java/.../enums/` — 枚举类
- `src/main/java/.../converter/` — 转换器
- `src/test/` — 测试代码

### 盘点输出格式

```markdown
### 前端资源
- 通用组件：UserSelect.vue, StatusTag.vue, SearchForm.vue（3 个）
- 页面：Dashboard.vue, UserList.vue, RoleList.vue（3 个）
- Composables：useTable.ts, useModal.ts（2 个）
- 工具函数：format.ts, validate.ts, request.ts（3 个）
- API 函数：user.ts, role.ts, auth.ts（3 个）
- Store：user.ts, app.ts（2 个）

### 后端资源
- Controller：UserController, RoleController, AuthController（3 个）
- Service：UserService, RoleService（2 个）
- Mapper：UserMapper, RoleMapper（2 个）
- Entity：User, Role, Menu（3 个）
- DTO：UserDTO, RoleDTO（2 个）
- 公共工具：Result.java, PageUtil.java（2 个）
```

## 五、技术栈快照模板

将 L1-L3 的结果汇总为技术栈快照：

```markdown
## 技术栈快照

**项目类型**：（Java Maven + Vue 3 / 纯前端 / 纯后端）
**后端**：Spring Boot 3.2.1 + MyBatis-Plus 3.5 + MySQL + Redis
**前端**：Vue 3.4 + Element Plus 2.5 + TypeScript 5.3 + Vite 5.0
**构建工具**：Maven 3.9（后端）+ Vite 5.0（前端）
**Java 版本**：17
**Node 版本要求**：18+
```

这份快照会作为交接包的一部分传递给下游 skill。

## 六、Monorepo 扫描策略

当 L1 检测到 Monorepo 标志文件（`nx.json` / `turbo.json` / `pnpm-workspace.yaml` / `lerna.json`）时，需执行额外的扫描策略。

### 6.1 确定工作区结构

根据 Monorepo 工具类型确定子模块位置：

| 工具 | 子模块发现方式 |
|------|-------------|
| pnpm workspace | 读取 `pnpm-workspace.yaml` 中的 `packages` 字段，glob 展开得到子模块目录 |
| Nx | 读取 `nx.json` 和各子目录的 `project.json` / `package.json`（`nx` 字段） |
| Turborepo | 读取 `turbo.json`，扫描 `packages/` 和 `apps/` 目录 |
| Lerna | 读取 `lerna.json` 中的 `packages` 字段 |

### 6.2 确定任务涉及的模块

用户任务可能只涉及 Monorepo 中的某个或某几个子模块，需要缩小扫描范围：

1. **关键词匹配**：用户提及的模块名、功能名与子模块的 `package.json` 中的 `name` / `description` 匹配
2. **路径暗示**：用户提及的文件路径直接指向某个子模块（如 `packages/ui/src/Button.vue`）
3. **技术栈过滤**：用户任务的技术栈与子模块的技术栈匹配（如前端任务只扫描前端子模块）
4. **默认策略**：若无法确定，先扫描所有子模块的 `package.json` 名称和描述，呈现给用户确认

### 6.3 多模块扫描流程

```
1. 读取 Monorepo 根配置 → 确定子模块列表
2. 对每个子模块执行 L1 扫描（读取子模块根目录文件列表）
3. 根据任务关键词筛选可能涉及的子模块（通常 1-3 个）
4. 对筛选后的子模块执行 L2/L3 扫描
5. 其他子模块仅记录名称和技术栈概要
```

### 6.4 多模块技术栈快照格式

```markdown
## 技术栈快照（Monorepo）

**Monorepo 工具**：pnpm workspace
**项目结构**：
  - apps/web — Vue 3 + Element Plus（前端应用）
  - apps/admin — Vue 3 + Ant Design Vue（管理后台）
  - packages/ui — Vue 3 组件库
  - packages/utils — TypeScript 工具库
  - packages/api — API 接口定义

**当前任务涉及模块**：apps/web, packages/api
  - apps/web：Vue 3.4 + Element Plus 2.5 + TypeScript 5.3 + Vite 5.0
  - packages/api：TypeScript 5.3 + Axios

**其他模块概要**：
  - apps/admin：Vue 3 + Ant Design Vue
  - packages/ui：Vue 3 + Vite（库模式）
  - packages/utils：TypeScript + Vitest
```

### 6.5 注意事项

- Monorepo 扫描耗时可能较长，高紧急度任务可只扫描根配置和目标模块
- 若子模块间有依赖关系（如 `packages/ui` 被 `apps/web` 引用），在快照中标注
- 前后端分离的 Monorepo（如 `apps/` 下同时有前端和后端）需分别按各自规则执行 L2/L3

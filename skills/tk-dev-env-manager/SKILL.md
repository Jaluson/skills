---
name: tk-dev-env-manager
description: >
  开发环境感知管理器 — 在任何开发任务开始前自动检测、配置和管理项目所需的运行时环境。
  当用户要求执行构建、运行、测试、打包等开发任务时，或者当其他 skill 需要确定正确的
  JDK、Node、Python、Go、Maven、Gradle 等工具路径时，务必使用此 skill。
  即使用户只是简单提及"编译一下""跑一下项目""构建""npm run""mvn""gradle"等
  任何涉及项目操作的指令，也应先通过此 skill 确认环境是否就绪。
  本 skill 支持：自动从项目文件解析所需环境、优先读取项目级/全局级自定义配置（.claude/project-env/.env）、
  自动下载缺失环境到项目 runtime-env/ 目录、以及作为其他 skill 的环境基础层。
  本 skill 不依赖任何脚本或特定运行时，所有检测均通过读取文件内容和系统原生命令完成。
---

# 开发环境感知管理器 (tk-dev-env-manager)

## 这个 skill 解决什么问题

不同开发者机器上的 JDK、Node、Maven 等工具的安装路径千差万别。
系统 PATH 中的版本可能和项目需要的不一致。这个 skill 的职责是：
在任何开发任务执行之前，确保使用的是项目指定的、版本正确的工具链。

## 重要原则：不使用脚本文件

本 skill **不包含任何脚本文件**。原因很简单：每个用户的系统环境不同——
Windows、Linux、macOS，有无 bash、Python、PowerShell 都不确定。

所有检测和操作都通过以下方式完成：
- **读取项目文件内容**来判断项目类型和版本需求
- **使用当前系统可用的命令**来验证工具是否就绪
- **让 Claude 根据实际环境自行选择合适的命令**，而不是预设固定的命令

具体执行什么命令，由 Claude 在运行时根据当前系统决定。

## 行为准则

**不明确就提问。** 如果无法确定项目类型、需要的工具版本、或配置方式，必须询问用户。

**分析完毕必须展示理解。** 每次检测完环境状态后，主动向用户报告发现和建议，等待确认后才继续。

**禁止擅自行动。** 未经用户确认，不执行下载、安装、修改配置等操作。

**善用已有 skill。** 检查当前环境中是否有可辅助的 skill（如 tk-springboot-dev-standards、tk-vue3-dev-standards 等），在合适的阶段使用它们。

**尊重项目现有配置。** 如果项目已有 `.tool-versions`、`.node-version`、`.python-version` 等版本固定文件，优先使用其中的版本。

**缓存检测结果。** 在同一会话中，避免重复检测同一项目的环境状态。除非用户明确要求重新检测，或项目配置文件发生了变更。

---

## 核心流程

```
用户发起开发任务
       |
       v
  ┌─────────────────────────┐
  │ 快速判断：用户是否明确    │
  │ 要求跳过环境检测？        │
  │ (如"直接运行"、"跳过")    │
  │     ↓否                  │
  │ E0: 项目类型检测          │  扫描项目标志性文件，判断项目类型
  │     ↓                    │
  │ E1: 环境需求解析          │  从项目文件中提取所需工具和版本
  │     ↓                    │
  │ 快速判断：单语言+有wrapper?│
  │ ──是──→ 跳到 E3 仅检查   │
  │         基础运行时(JDK/Node)│
  │     ↓否                  │
  │ E2: 配置文件读取          │  按优先级查找并读取 .env
  │     ↓                    │
  │ E3: 环境状态检查          │  验证所需工具是否可用
  │     ↓                    │
  │ [环境就绪?] ──是──→ 返回环境变量，继续执行任务
  │     |
  │     否
  │     ↓
  │ E4: 环境配置引导          │  引导用户完成环境配置
  │     ↓                    │
  │ [用户确认就绪] → 重新检查 → 返回环境变量
  └─────────────────────────┘
```

### 快速路径

对于简单项目，可以跳过部分步骤以加快检测速度：

**条件**：项目仅使用一种语言，且有 wrapper（如 `mvnw`/`gradlew`）
**简化流程**：跳过 E2 配置读取，直接检查基础运行时（JDK/Node/Python）是否可用

**条件**：用户明确表示"直接运行"、"环境没问题"、"跳过检测"
**处理**：完全跳过 E0-E4，直接使用系统 PATH 中的工具执行命令。如果执行失败再回退到完整检测流程。

---

## E0: 项目类型检测

### 确定项目根目录

在检测项目类型之前，首先需要确定项目根目录。用户的当前工作目录可能不是项目根目录。

**定位方法（从当前目录向上搜索）**：

1. 从当前工作目录开始，检查是否存在标志性文件（`pom.xml`、`package.json`、`build.gradle` 等）
2. 如果当前目录没有，向上逐级搜索父目录
3. 同时检查是否存在版本控制目录（`.git`）—— 通常 `.git` 所在目录就是项目根目录
4. 如果找到多个层级的标志性文件（如子目录也有 `package.json`），以包含 `.git` 的目录为根，子目录的文件作为子项目处理
5. 如果无法确定，直接询问用户项目根目录在哪里

**操作**：
```bash
# 向上查找 .git 目录确定项目根
git rev-parse --show-toplevel

# 或从当前目录检查标志性文件
ls pom.xml package.json build.gradle 2>/dev/null
```

### 检测项目类型

扫描项目根目录，通过标志性文件判断项目类型和所需的技术栈。
不需要预先定义固定的语言列表——根据项目中实际存在的文件来推断。

### 检测规则

| 标志文件 | 项目类型 | 可能需要的工具 |
|----------|----------|---------------|
| `pom.xml` | Java (Maven) | JDK, Maven |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin (Gradle) | JDK, Gradle |
| `package.json` | Node.js / 前端 | Node, npm/yarn/pnpm/bun |
| `requirements.txt` / `setup.py` / `pyproject.toml` | Python | Python, pip/poetry/uv |
| `go.mod` | Go | Go |
| `Cargo.toml` | Rust | cargo/rustc |
| `.csproj` / `.sln` | .NET | dotnet |
| `Gemfile` | Ruby | ruby/bundler |
| `Makefile` / `CMakeLists.txt` | C/C++ | gcc/make/cmake |
| `Dockerfile` / `docker-compose.yml` | 容器化项目 | Docker/Podman |
| `deno.json` / `deno.jsonc` | Deno | deno |

一个项目可能同时包含多个标志性文件（如前后端分离项目），需要检测所有相关工具。

### Monorepo 检测

如果检测到以下文件，说明项目是 monorepo 结构，需要逐个子项目检测：

| 标志文件 | Monorepo 工具 | 说明 |
|----------|---------------|------|
| `nx.json` | Nx | 支持 JS/TS 多框架 monorepo |
| `turbo.json` | Turborepo | JS/TS monorepo 构建加速 |
| `lerna.json` | Lerna | JS/TS 包管理 |
| `pnpm-workspace.yaml` | pnpm workspace | pnpm 原生多包 |
| `rush.json` | Rush | 微软的 monorepo 管理工具 |
| 包含 `packages/*` 或 `apps/*` 目录 | 通用 monorepo | 按约定识别 |

Monorepo 项目需要对每个子项目/子包分别检测环境需求，然后汇总去重。

### Docker/容器环境检测

如果项目中存在 `Dockerfile` 或 `docker-compose.yml`，还需要额外处理：

1. 读取 `Dockerfile` 内容，提取基础镜像中的运行时版本（如 `FROM node:20-alpine`）
2. 读取 `docker-compose.yml`，识别服务依赖（数据库、消息队列等）
3. 如果项目完全依赖容器化环境（如仅通过 `docker compose up` 运行），则只需检测 Docker 是否可用
4. 如果项目需要在宿主机上构建（如编译后打包进镜像），仍需检测宿主机构建工具

### 操作

1. 用 Glob 扫描项目根目录下的标志性文件
2. 用 Read 读取标志性文件内容，提取版本信息
3. 检查是否为 monorepo 结构，如果是则扫描子项目
4. 检查是否有 Docker 配置，判断是否需要容器环境
5. 向用户报告检测到的项目类型和推断所需工具，等待确认

详细的项目文件解析方法见 `references/project-detectors.md`。

---

## E1: 环境需求解析

根据 E0 检测到的项目类型，从项目文件中解析出具体需要的环境变量和版本要求。

### 解析思路（不是固定命令，由 Claude 根据系统灵活执行）

**Java/Maven 项目 (`pom.xml`)**：
- 在 pom.xml 文件内容中搜索 `java.version`、`maven.compiler.source`、`sourceCompatibility` 等关键字来提取 JDK 版本
- 检查项目是否有 `.mvn/wrapper/` 目录来判断 Maven Wrapper
- 检查 `pom.xml` 中是否有 Spring Boot parent 来识别框架
- 需要的环境变量：`JAVA_HOME`, `MAVEN_HOME` 或 `M2_HOME`

**Java/Gradle 项目 (`build.gradle` / `build.gradle.kts`)**：
- 在 build.gradle 文件内容中搜索 `sourceCompatibility`、`targetCompatibility`、`jvmTarget`、`toolchain` 等关键字
- 检查项目是否有 `gradlew` / `gradlew.bat` 来判断 Gradle Wrapper
- 从 `gradle/wrapper/gradle-wrapper.properties` 提取 Gradle 版本
- 需要的环境变量：`JAVA_HOME`, `GRADLE_HOME`

**Node 项目 (`package.json`)**：
- 读取 package.json 的 `engines.node` 字段获取版本要求
- 通过检查锁文件（`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb`）判断包管理器
- 检查 `packageManager` 字段获取精确的包管理器版本
- 检查 `.nvmrc` / `.node-version` 获取版本管理器指定版本
- 检查是否有 `nuxt.config.*`、`next.config.*`、`vite.config.*` 等来识别框架
- 需要的环境变量：`NODE_HOME`

**Deno 项目 (`deno.json` / `deno.jsonc`)**：
- 读取 `deno.json` 中的 `compilerOptions.target` 了解 TS 目标
- 检查 `import_map.json` 了解依赖
- 需要：`DENO_HOME` 或 deno 在 PATH 中

**Python 项目 (`pyproject.toml` / `requirements.txt`)**：
- 在配置文件中搜索 `python_requires`、`requires-python` 等获取版本要求
- 通过锁文件判断包管理器（`poetry.lock` → poetry, `uv.lock` → uv, `Pipfile.lock` → pipenv 等）
- 检查 `.python-version` 文件获取 pyenv 指定版本
- 需要的环境变量：`PYTHON_HOME`

**Go 项目 (`go.mod`)**：
- 读取 go.mod 前几行获取 Go 版本
- 检查 `go.sum` 是否存在（确认依赖完整）
- 需要的环境变量：`GOROOT`

**Rust 项目 (`Cargo.toml`)**：
- 检查 `rust-toolchain.toml` 获取工具链版本
- 检查是否有 wasm 目标（`wasm-pack` 配置）
- 需要的环境变量：`RUSTUP_HOME`, `CARGO_HOME`

**.NET 项目 (`.csproj` / `.sln`)**：
- 从 `global.json` 获取 SDK 版本
- 从 `.csproj` 的 `TargetFramework` 获取目标框架
- 需要的环境变量：`DOTNET_HOME`

**容器化项目 (`Dockerfile` / `docker-compose.yml`)**：
- 从 Dockerfile 的 `FROM` 指令提取基础镜像和运行时版本
- 从 docker-compose.yml 识别服务依赖（数据库、缓存等）
- 如果仅需容器运行：检测 Docker/Podman 是否可用
- 如果需要宿主机构建：仍需检测对应构建工具

### 操作

1. 用 Read 读取对应的配置文件
2. 从文件内容中提取版本要求
3. 生成所需环境变量清单
4. 向用户展示解析结果，确认是否正确

---

## E2: 配置文件读取

按优先级顺序查找并读取环境变量配置。

### 优先级（从高到低）

1. **项目级配置**：`<项目根目录>/.claude/project-env/.env`
2. **全局级配置**：`<用户主目录>/.claude/project-env/.env`
3. **系统环境变量**：从当前 shell 环境继承

### .env 格式

简单的 `KEY=VALUE` 格式，每行一个环境变量，支持 `#` 注释：

```env
# Java 环境
JAVA_HOME=C:/Users/xxx/.jdks/corretto-17.0.9
MAVEN_HOME=C:/Users/xxx/.m2/wrapper/dists/apache-maven-3.9.6

# Node 环境
NODE_HOME=C:/Users/xxx/.nvm/versions/node/v20.11.0

# Python 环境
PYTHON_HOME=C:/Users/xxx/.pyenv/versions/3.12.1
```

### .env 解析规则

解析 .env 文件时，遵循以下规则：

| 情况 | 示例 | 解析结果 | 说明 |
|------|------|----------|------|
| 标准 `KEY=VALUE` | `JAVA_HOME=/path/to/jdk` | `JAVA_HOME=/path/to/jdk` | 正常解析 |
| 值中含 `=` | `KEY=val=ue` | `KEY=val=ue` | 仅以第一个 `=` 分割 |
| 带引号的值 | `KEY="C:/Program Files/Java"` | `KEY=C:/Program Files/Java` | 去除两端引号 |
| 行内注释 | `KEY=value # comment` | `KEY=value` | `#` 后视为注释 |
| 被注释的行 | `# KEY=value` | 跳过 | 整行为注释 |
| 空行 | （空） | 跳过 | 忽略 |
| 空值 | `KEY=` | `KEY=`（空字符串） | 保留键，值为空 |
| 无等号 | `INVALID_LINE` | 跳过 | 无 `=` 的行不解析 |

### Windows 路径注意事项

- `.env` 中的路径支持正斜杠 `/` 和反斜杠 `\`
- 推荐使用正斜杠以保持跨平台兼容
- 路径分隔符用 `;`（Windows）或 `:`（Unix）
- Claude 在运行时应根据当前平台自动适配

### 读取流程

1. 用 Glob 检查 `<项目根目录>/.claude/project-env/.env` 是否存在
   - 存在 → 用 Read 读取文件内容，解析所有 `KEY=VALUE` 行（跳过 `#` 注释和空行）
   - 不存在 → 继续检查全局配置
2. 用 Glob 检查 `<用户主目录>/.claude/project-env/.env` 是否存在
   - 存在 → Read 读取并解析，与项目级配置合并（项目级优先）
3. 对于仍未配置的变量，用 Bash 执行当前系统可用的命令来检查系统环境变量
4. 生成最终的环境变量映射表

---

## E3: 环境状态检查

验证每个所需工具是否实际可用——不仅检查配置中的路径是否存在，还要验证工具能正常执行。

### 检查策略

对每个需要的环境变量，Claude 应根据当前系统选择合适的检查方式：

**路径存在性检查：**
- 如果 .env 中配置了路径 → 检查该路径目录是否存在（Glob 或 Bash ls）
- 检查路径下的可执行文件是否存在（如 `JAVA_HOME/bin/java` 或 `JAVA_HOME/bin/java.exe`）
- Windows 特有：检查 `C:\Program Files\`、`C:\Program Files (x86)\` 下的安装目录

**版本验证：**
- 尝试执行工具的版本命令，如 `java -version`、`node --version`、`python --version`、`go version`
- 如果 .env 配置了自定义路径，使用完整路径执行：`<JAVA_HOME>/bin/java -version`
- 如果版本要求已知（从 E1 解析）→ 对比实际版本是否满足
- 注意：某些工具版本命令输出到 stderr（如 `java -version`），需要正确捕获

**系统 PATH 检测（作为回退）：**
- 根据当前系统选择合适的方式查找工具路径
- 类 Unix：`which <tool>` 或 `command -v <tool>`
- Windows：`where <tool>`
- 通用方式：直接执行 `<tool> --version` 或 `<tool> version`，成功即存在

**版本管理工具检测：**
- 如果检测到 nvm/sdkman/pyenv/rbenv/asdf 等工具，尝试从中查找合适版本
- 详细检测方法见 `references/env-setup.md`

### 状态报告格式

```
环境状态报告：
+----------+-----------+----------+-----------+---------------------------+
| 工具     | 需要版本  | 实际版本 | 状态      | 来源                      |
+----------+-----------+----------+-----------+---------------------------+
| JDK      | 17+       | 17.0.9   | ✅ 就绪   | 项目 .env                 |
| Maven    | 3.8+      | 3.9.6    | ✅ 就绪   | 项目 .env                 |
| Node     | 18+       | 未找到   | ❌ 缺失   | -                         |
| npm      | -         | 未找到   | ❌ 缺失   | -                         |
+----------+-----------+----------+-----------+---------------------------+
```

状态标记说明：
- ✅ 就绪 — 工具已安装且版本满足要求
- ⚠️ 版本不匹配 — 工具已安装但版本不完全满足（警告，不阻塞）
- ❌ 缺失 — 工具未找到
- ⏭️ 跳过 — 有 wrapper 可替代，不需要全局安装

### 操作

1. 逐一检查每个所需工具
2. 生成状态报告
3. 如果所有工具就绪 → 返回环境变量，可以继续执行任务
4. 如果有缺失 → 进入 E4 环境配置引导

---

## E4: 环境配置引导

当检测到环境缺失时，自动创建配置目录和文件，然后引导用户完成配置。

### 步骤

#### 4.1 自动创建目录和模板文件

创建项目级配置目录（使用当前系统可用的方式，如 Bash 的 `mkdir -p`）：

生成带注释的模板 `.env` 文件（用 Write 工具写入）：

```env
# 开发环境配置 - 请填写实际路径后保存
# 配置完成后告知 Claude 即可继续任务

# Java 环境（从 pom.xml 检测到需要 JDK 17+）
# JAVA_HOME=

# Maven 环境
# MAVEN_HOME=

# Node 环境（从 package.json 检测到需要 Node 18+）
# NODE_HOME=
```

**安全提醒**：创建 `.env` 文件后，必须检查 `.gitignore` 中是否已包含 `.claude/project-env/`，
防止环境配置（可能包含本地路径信息）被提交到版本控制。如果 `.gitignore` 不存在或未包含，
应提醒用户添加。

#### 4.2 创建 .description 单独说明文件

除了 `.env` 配置文件外，还需要创建 `.description` 文件来单独说明用户可以自行配置的内容。
这个文件用于记录环境的配置选项、版本要求、或需要用户注意的特殊说明，不参与环境变量的解析。

创建 `<项目根目录>/.claude/project-env/.description` 文件，内容示例：

```markdown
# 开发环境说明

## 必需的运行时

- **JDK**: 17+ (LTS 版本，推荐 Amazon Corretto 或 Eclipse Temurin)
- **Node**: 18+ (推荐使用 nvm 或 fnm 管理版本)
- **Maven**: 3.8+ (项目已包含 mvnw wrapper，也可自行安装)

## 可选的本地服务

- **MySQL**: 8.0+ (如需本地开发，可通过 docker-compose 启动)
- **Redis**: 7.0+ (同上)

## 环境配置说明

1. **自动配置**: 本项目支持通过 `.env` 文件配置环境变量路径
2. **Wrapper 优先**: 建议使用项目自带的 `mvnw`/`gradlew`，只需确保 `JAVA_HOME` 正确
3. **版本要求**: 请确保本地工具版本满足上述最低要求，否则可能导致构建失败

## 常见问题

- 如遇 `JAVA_HOME` 相关错误，请检查 JDK 是否正确安装且路径已配置
- Windows 用户建议使用 Git Bash 或 WSL 执行构建命令
```

`.description` 文件的作用：
- 记录环境的配置选项和版本要求，供用户自行了解
- 说明可选的本地服务依赖（如数据库、缓存等）
- 提供常见问题的解决提示
- **不**参与环境变量解析，仅供用户阅读参考

#### 4.3 提供配置选项

向用户展示缺失的环境并询问选择哪种配置方式：

**选项 A：手动配置**
- 告知用户 .env 文件的位置（`<项目根目录>/.claude/project-env/.env`）
- 列出需要填写的变量和版本要求
- 等待用户填写完成后告知继续

**选项 B：使用系统环境变量**
- 从当前系统 PATH 中检测可用工具的路径
- 将检测到的路径自动写入 .env
- 展示结果等待用户确认

**选项 C：从版本管理工具中选取**
- 检测已安装的版本管理工具（nvm、sdkman、pyenv、asdf 等）
- 列出可用的版本供用户选择
- 将选中版本的路径写入 .env

**选项 D：自动下载到项目目录**
- 将环境下载到 `<项目根目录>/runtime-env/` 下
- 自动更新 .env 中的路径
- 支持的下载源和工具详见 `references/env-setup.md`

#### 4.4 等待用户完成

无论用户选择哪种方式，都必须等待用户明确表示"配置完成"或"可以继续"后，
才重新执行 E3 检查并继续后续任务。

---

## 命令执行方式

本 skill 返回的环境变量需要被注入到后续的命令执行中。具体方式由 Claude 根据当前系统决定。

### 推荐方式

**方式一：命令前缀（最通用）**
```bash
# Unix-like
JAVA_HOME=/path/to/jdk MAVEN_HOME=/path/to/mvn ./mvnw clean package

# Windows (Git Bash / MSYS2)
JAVA_HOME=/c/Users/xxx/.jdks/corretto-17 ./mvnw clean package

# Windows (PowerShell)
$env:JAVA_HOME = "C:\Users\xxx\.jdks\corretto-17"; .\mvnw clean package
```

**方式二：PATH 注入**
```bash
# 将工具的 bin 目录添加到 PATH 前面
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"
./mvnw clean package
```

**方式三：使用 wrapper（最优先）**
```bash
# 如果项目有 wrapper，只需设置 JAVA_HOME
./mvnw clean package     # Maven Wrapper
./gradlew build          # Gradle Wrapper
```

### 注意事项

- 优先使用项目自带的 wrapper（mvnw/gradlew），只需要确保 JAVA_HOME 正确
- 在 Windows 上使用 Git Bash 时，路径格式需要转换
- 不要修改全局环境变量，只在当前命令上下文中注入

---

## 作为其他 skill 的基础层

其他 skill（如 tk-springboot-dev-standards、tk-vue3-dev-standards 等）在执行构建、运行等任务时，
可以通过本 skill 获取正确的环境变量。

### 使用方式

1. 其他 skill 在需要执行构建/运行命令前，先调用本 skill 的环境检测流程
2. 本 skill 返回一个环境变量映射表，如：
   ```json
   {
     "JAVA_HOME": "C:/Users/xxx/.jdks/corretto-17.0.9",
     "MAVEN_HOME": "C:/Users/xxx/.m2/wrapper/dists/apache-maven-3.9.6",
     "PATH": "C:/Users/xxx/.jdks/corretto-17.0.9/bin:..."
   }
   ```
3. 其他 skill 在执行 shell 命令时，将这些环境变量注入到命令上下文中

### 集成协议

其他 skill 在需要环境信息时应遵循以下步骤：

1. **检查缓存**：如果本会话已经检测过同一项目的环境，直接使用缓存结果
2. **触发检测**：如果未检测过，按照 E0→E1→E2→E3 的流程执行
3. **获取结果**：从本 skill 获取环境变量映射表
4. **注入执行**：在后续命令中使用获取到的环境变量

---

## 环境缓存策略

为避免在同一会话中重复检测，实施以下缓存策略：

### 缓存时机

- E3 环境状态检查完成后，将结果缓存到内存中
- 缓存内容包括：检测到的工具版本、路径、环境变量映射

### 缓存失效条件

以下情况需要重新检测：
- 用户明确要求重新检测（如"重新检查环境"）
- 项目配置文件发生变更（pom.xml、package.json 等被修改）
- 用户说"环境变了"或类似表达
- `.env` 配置文件被修改

### 缓存实现

Claude 在会话中记住检测结果即可，无需写入文件。当其他 skill 或后续任务需要环境信息时，
优先使用缓存结果，仅在缓存失效时重新检测。

---

## 特殊情况处理

### 多项目类型共存

如果项目根目录同时包含 `pom.xml` 和 `package.json`（如前后端分离项目），
需要同时检测和管理两套环境。清晰地向用户展示所有所需工具。
通常后端在根目录，前端在子目录（如 `frontend/`、`web/`、`client/`）。

### Monorepo 结构

如果检测到 Nx、Turborepo、Lerna 等 monorepo 工具：
1. 扫描所有子项目/子包
2. 汇总所有子项目的环境需求
3. 去重后统一检测和配置

### 包装器优先

如果项目中有 Maven Wrapper (`mvnw`)、Gradle Wrapper (`gradlew`)、
npm 的 `npx` 等，优先使用包装器而不要求全局安装。
此时对应的环境变量不是必须的，但仍需 JDK/Node 等基础运行时。

### 版本管理工具

如果检测到用户使用版本管理工具（如 nvm、sdkman、pyenv、rbenv、asdf），
可以从这些工具管理的版本中选择合适的版本路径。

检测方式（根据系统可用命令选择）：
- nvm: 检查 `NVM_HOME` 环境变量或 `~/.nvm` 目录
- nvm-windows: 检查 `NVM_HOME` 环境变量或 `nvm version` 命令
- sdkman: 检查 `SDKMAN_DIR` 环境变量或 `~/.sdkman` 目录
- pyenv: 检查 `~/.pyenv` 目录或 `pyenv` 命令（Windows: `pyenv-win`）
- asdf: 检查 `~/.asdf` 目录
- fnm (Fast Node Manager): 检查 `fnm` 命令

### Docker/容器化开发

如果项目完全依赖容器化环境：
1. 检测 Docker 或 Podman 是否安装并运行
2. 检测 docker compose（或 docker-compose）是否可用
3. 如果仅需容器运行，可以跳过宿主机的运行时检测
4. 如果需要宿主机编译（如多阶段构建），仍需检测编译工具

### 数据库和中间件依赖

如果项目配置中包含数据库或中间件连接信息：
1. 从 `application.yml`/`application.properties`（Spring）提取数据库配置
2. 从 `.env`/`.env.local`（Node）提取数据库 URL
3. 从 `docker-compose.yml` 检测服务依赖
4. 仅做信息报告，不自动安装或启动这些服务
5. 如果服务不可达，在报告中标注警告

---

## 参考文档

| 文件 | 何时读取 | 说明 |
|------|----------|------|
| `references/project-detectors.md` | E0 项目类型检测 | 各项目类型的详细检测规则和版本解析方法 |
| `references/env-setup.md` | E4 环境配置引导 | 各工具的下载源、安装策略和路径配置 |
| `references/troubleshooting.md` | 环境检查失败时 | 常见问题的排查和解决方法 |

---

## 与其他 skill 的协作

本 skill 作为环境基础层，应该在以下 skill 执行之前被调用：

- `tk-springboot-dev-standards` — 需要 JDK/Maven/Gradle 环境
- `tk-vue3-dev-standards` — 需要 Node/npm 环境
- `spring-boot-testing` — 需要 JDK 和测试运行时
- `javascript-typescript-jest` — 需要 Node 环境
- `python-mcp-server-generator` — 需要 Python 环境
- `kotlin-springboot` — 需要 JDK/Gradle 环境
- `go-mcp-server-generator` — 需要 Go 环境
- `rust-mcp-server-generator` — 需要 Rust 环境
- 其他任何涉及构建、运行、测试的 skill

### 上游 Skill：tk-dev-task-precheck

`tk-dev-task-precheck`（开发任务前置守门员）在 T2 环境就绪检查阶段会委托本 skill
完成环境检测和配置。当被 `tk-dev-task-precheck` 调用时，可以跳过 E0（项目类型检测）
和 E1（环境需求解析），因为 `tk-dev-task-precheck` 的 T1 阶段已经完成了这些工作，
直接从 E2（配置文件读取）开始执行即可。

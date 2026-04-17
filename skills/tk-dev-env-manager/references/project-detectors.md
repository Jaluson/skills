---
name: tk-dev-env-manager-references
description: >
  tk-dev-env-manager 的参考文档 — 定义各项目类型的环境检测规则。
  包括标志性文件、版本解析方法和所需环境变量。
---

# 项目类型检测详细规则

本文档定义了各项目类型的环境检测规则，包括标志性文件、版本解析方法和所需环境变量。

---

## Java / Maven 项目

### 标志文件
- `pom.xml`（必须存在）

### 版本解析

**JDK 版本** — 从 pom.xml 中提取：
```xml
<!-- 方式 1: properties -->
<java.version>17</java.version>
<maven.compiler.source>17</maven.compiler.source>
<maven.compiler.target>17</maven.compiler.target>

<!-- 方式 2: compiler plugin -->
<source>17</source>
<target>17</target>

<!-- 方式 3: release -->
<maven.compiler.release>17</maven.compiler.release>

<!-- 方式 4: profile 中定义 -->
<profiles>
  <profile>
    <id>java17</id>
    <properties>
      <maven.compiler.source>17</maven.compiler.source>
    </properties>
  </profile>
</profiles>
```

**Maven 版本** — 从 wrapper 获取（如有）：
```properties
# .mvn/wrapper/maven-wrapper.properties
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip
```

**Spring Boot 版本**（辅助信息）：
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.4</version>
</parent>

<!-- 或直接依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
    <version>3.4.4</version>
</dependency>
```

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `JAVA_HOME` | 是 | JDK 安装路径 |
| `MAVEN_HOME` / `M2_HOME` | 否 | Maven 安装路径（有 mvnw 时非必须） |

### 构建命令模板
```bash
# 有 wrapper 时优先使用
$JAVA_HOME/bin/java -version  # 验证 JDK
./mvnw clean package            # 使用 wrapper

# 无 wrapper 时
$MAVEN_HOME/bin/mvn clean package
```

---

## Java / Gradle 项目

### 标志文件
- `build.gradle` 或 `build.gradle.kts`（必须存在）

### 版本解析

**JDK 版本** — 从 build.gradle 中提取：
```groovy
// Groovy DSL
sourceCompatibility = '17'
targetCompatibility = '17'

// 或
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

```kotlin
// Kotlin DSL
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

// 或 toolchain
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

// 或通过 kotlinOptions 设置
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions.jvmTarget = "17"
}
```

**Gradle 版本** — 从 wrapper 获取：
```properties
# gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
```

**Kotlin 版本**（辅助信息）：
```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.21"
}
```

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `JAVA_HOME` | 是 | JDK 安装路径 |
| `GRADLE_HOME` | 否 | Gradle 安装路径（有 gradlew 时非必须） |

---

## Node.js / 前端项目

### 标志文件
- `package.json`（必须存在）

### 版本解析

**Node 版本**：
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

辅助文件：
- `.nvmrc` — nvm 指定的 Node 版本
- `.node-version` — nodenv/fnm 指定的 Node 版本

**包管理器** — 通过锁文件判断：
| 锁文件 | 包管理器 |
|--------|----------|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` / `bun.lock` | bun |

**包管理器版本**（package.json 的 packageManager 字段）：
```json
{
  "packageManager": "pnpm@8.15.1"
}
```

**框架识别**（辅助信息）：
| 配置文件 | 框架 |
|----------|------|
| `next.config.*` | Next.js |
| `nuxt.config.*` | Nuxt.js |
| `vite.config.*` | Vite |
| `vue.config.*` | Vue CLI |
| `angular.json` | Angular |
| `svelte.config.*` | Svelte/SvelteKit |
| `remix.config.*` | Remix |
| `astro.config.*` | Astro |
| `quasar.conf.*` | Quasar |

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `NODE_HOME` | 是 | Node 安装路径 |

### 构建命令模板
```bash
$NODE_HOME/node --version    # 验证 Node
$NODE_HOME/npm run build     # npm 项目
# 或
$NODE_HOME/npx pnpm build    # pnpm 项目
```

---

## Deno 项目

### 标志文件
- `deno.json` 或 `deno.jsonc`

### 版本解析

```jsonc
// deno.json
{
  "compilerOptions": {
    "target": "ESNext"
  },
  "tasks": {
    "dev": "deno run --watch main.ts"
  }
}
```

辅助文件：
- `import_map.json` — 导入映射

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `DENO_HOME` | 否 | Deno 安装路径（通常 deno 在 PATH 中即可） |

### 构建命令模板
```bash
deno --version              # 验证 Deno
deno task dev                # 运行任务
deno compile --output=app main.ts  # 编译
```

---

## Bun 项目

### 标志文件
- `bun.lockb` 或 `bun.lock`（Bun 1.2+ 使用 `bun.lock` 文本格式）
- `package.json` 中的 `"packageManager": "bun@..."`

### 版本解析

主要通过 `packageManager` 字段或 `bun.lockb` 的存在来识别。

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `BUN_HOME` | 否 | Bun 安装路径（通常 bun 在 PATH 中即可） |

### 构建命令模板
```bash
bun --version               # 验证 Bun
bun install                  # 安装依赖
bun run build                # 构建
```

---

## Python 项目

### 标志文件
- `pyproject.toml` 或 `requirements.txt` 或 `setup.py` 或 `setup.cfg`

### 版本解析

**Python 版本**：
```toml
# pyproject.toml
[project]
requires-python = ">=3.10"

# 或 poetry
[tool.poetry.dependencies]
python = "^3.11"
```

```
# setup.cfg
[options]
python_requires = >=3.10
```

```
# .python-version
3.12.8
```

**包管理器** — 通过配置文件判断：
| 文件 | 包管理器 |
|------|----------|
| `poetry.lock` | poetry |
| `Pipfile.lock` | pipenv |
| `pdm.lock` | pdm |
| `uv.lock` | uv |
| `hatch.toml` / `hatch.lock` | hatch |

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `PYTHON_HOME` | 是 | Python 安装路径 |

### 构建命令模板
```bash
python --version             # 验证 Python
pip install -r requirements.txt  # 安装依赖
# 或
poetry install                # Poetry 项目
# 或
uv sync                       # uv 项目
```

---

## Go 项目

### 标志文件
- `go.mod`（必须存在）

### 版本解析

**Go 版本** — 从 go.mod 第一行：
```
module example.com/myproject

go 1.21
```

辅助文件：
- `go.sum` — 依赖校验和（存在说明依赖完整）

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `GOROOT` | 否 | Go 安装路径（通常 go 命令在 PATH 中即可） |
| `GOPATH` | 否 | Go 工作空间路径 |

### 构建命令模板
```bash
go version                   # 验证 Go
go build ./...               # 构建
go test ./...                # 测试
```

---

## Rust 项目

### 标志文件
- `Cargo.toml`（必须存在）

### 版本解析

通常从 `rust-toolchain.toml` 获取：
```toml
[toolchain]
channel = "1.75.0"
# 或
channel = "stable"
```

辅助文件：
- `rust-toolchain` — 旧格式，直接包含版本字符串
- `.cargo/config.toml` — Cargo 配置

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `RUSTUP_HOME` | 否 | rustup 安装路径 |
| `CARGO_HOME` | 否 | cargo 安装路径 |

### 构建命令模板
```bash
rustc --version              # 验证 Rust
cargo build                  # 构建
cargo test                   # 测试
```

---

## .NET 项目

### 标志文件
- `.csproj` 或 `.sln` 或 `global.json`

### 版本解析

**SDK 版本**：
```json
// global.json
{
  "sdk": {
    "version": "8.0.404"
  }
}
```

```xml
<!-- .csproj -->
<TargetFramework>net8.0</TargetFramework>
<!-- 或多个 -->
<TargetFrameworks>net8.0;net7.0</TargetFrameworks>
```

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `DOTNET_HOME` | 否 | .NET SDK 安装路径 |

### 构建命令模板
```bash
dotnet --version             # 验证 .NET SDK
dotnet build                 # 构建
dotnet test                  # 测试
```

---

## Ruby 项目

### 标志文件
- `Gemfile`（必须存在）

### 版本解析

**Ruby 版本**：
```
# .ruby-version
3.2.2
```

```yaml
# .tool-versions (asdf)
ruby 3.2.2
```

**包管理器**：bundler（通过 Gemfile.lock 确认）

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `RUBY_HOME` | 否 | Ruby 安装路径 |

---

## C/C++ 项目

### 标志文件
- `Makefile` 或 `CMakeLists.txt` 或 `meson.build` 或 `conanfile.txt`

### 版本解析

通常没有严格的版本要求，但可以从以下信息推断：
```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
set(CMAKE_CXX_STANDARD 17)
```

```makefile
# Makefile 中可能指定编译器
CC = gcc
CXX = g++
```

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `CC` | 否 | C 编译器路径 |
| `CXX` | 否 | C++ 编译器路径 |

---

## Docker / 容器化项目

### 标志文件
- `Dockerfile` 或 `docker-compose.yml` / `docker-compose.yaml` 或 `compose.yml` / `compose.yaml`

### 环境检测

**Dockerfile 分析**：
```dockerfile
# 提取基础镜像中的运行时版本
FROM node:20-alpine          # Node 20
FROM eclipse-temurin:17-jdk  # JDK 17
FROM python:3.12-slim        # Python 3.12
FROM golang:1.21             # Go 1.21
FROM rust:1.75               # Rust 1.75
```

**docker-compose.yml 分析**：
```yaml
# 识别服务依赖
services:
  app:
    build: .
    depends_on:
      - db
      - redis
  db:
    image: postgres:16
  redis:
    image: redis:7
```

### 所需环境变量
| 变量 | 必须 | 说明 |
|------|------|------|
| `DOCKER_HOST` | 否 | Docker daemon 地址 |

### 检测命令
```bash
docker --version             # 验证 Docker
docker compose version       # 验证 Docker Compose V2
# 或
docker-compose --version     # 验证 Docker Compose V1
```

---

## Monorepo 检测

### 标志文件与工具识别

| 标志文件 | 工具 | 语言/框架 |
|----------|------|-----------|
| `nx.json` | Nx | JS/TS 多框架 |
| `turbo.json` | Turborepo | JS/TS |
| `lerna.json` | Lerna | JS/TS |
| `pnpm-workspace.yaml` | pnpm workspace | JS/TS |
| `rush.json` | Rush | 微软多语言 |
| `.bazelrc` / `WORKSPACE` / `WORKSPACE.bazel` | Bazel | 多语言 |
| `.sbtopts` / `project/*.sbt` 处多模块 | SBT 多项目 | Scala |

### 目录约定

常见的 monorepo 目录结构：
```
project/
├── packages/        # 多包
│   ├── ui/
│   ├── utils/
│   └── core/
├── apps/            # 多应用
│   ├── web/
│   └── mobile/
├── libs/            # 共享库
├── services/        # 微服务
└── modules/         # 模块
```

### 检测策略

1. 先检测 monorepo 工具配置文件
2. 读取工具配置了解子项目结构
3. 扫描每个子项目的标志性文件
4. 汇总所有子项目的环境需求，去重
5. 统一检测和配置环境

---

## 混合项目处理

当一个项目包含多种标志性文件时：

1. **前后端分离项目**（同时有 `pom.xml` 和 `package.json`）
   - 需要同时检测 Java 和 Node 环境
   - 通常后端在根目录，前端在子目录（如 `frontend/`、`web/`、`client/`）
   - 分别报告两套环境需求

2. **微服务项目**（多个 `pom.xml` 在子目录中）
   - 检查根目录是否为父 POM
   - 所有子模块共享同一 JDK 和 Maven 版本

3. **全栈项目**（如 Next.js + Python API）
   - 按目录结构分别检测
   - 报告所有所需环境

4. **Gradle 多项目构建**
   - `settings.gradle` 或 `settings.gradle.kts` 中定义子项目
   - 所有子项目共享 Gradle 和 JDK 版本

---

## 版本比较规则

解析出版本号后，与已安装版本比较：

### 版本号提取

从工具的版本输出中提取语义化版本号：
```
# 常见版本输出格式
java version "17.0.9" 2024-01-16       → 17.0.9
openjdk version "17.0.9"               → 17.0.9
v22.14.0                                → 22.14.0
Python 3.12.8                           → 3.12.8
go version go1.23.4 linux/amd64        → 1.23.4
rustc 1.75.0 (82e1608df)               → 1.75.0
dotnet 8.0.404                          → 8.0.404
```

### 比较规则

**基础比较方法：语义化版本三段式比较**

将版本号拆分为 `major.minor.patch`，从左到右逐段比较（数值比较）。缺省段视为 0。

1. 提取双方的主版本号（major.minor.patch）
2. 如果项目要求 `>=X.Y.Z`，则已安装版本必须 >= X.Y.Z（逐段比较）
3. 如果项目要求 `^X.Y.Z`（兼容版本），则已安装版本的 major == X 即视为满足
4. 如果项目要求 `~X.Y.Z`（近似版本），则已安装版本的 major == X 且 minor == Y 即视为满足
5. 如果项目要求固定版本 `X.Y.Z`，则已安装版本必须完全匹配
6. 如果无明确版本要求，只要能找到工具即视为满足
7. 版本不匹配时，在报告中标注警告但不阻塞（由用户决定是否继续）

**比较示例：**
```
要求 >=18.3.0，已安装 18.2.0 → 18.2 < 18.3 → ❌ 不满足
要求 >=18.3.0，已安装 18.3.1 → 18.3.1 >= 18.3.0 → ✅ 满足
要求 >=18.3.0，已安装 19.0.0 → 19.0 >= 18.3 → ✅ 满足
要求 ^18.3.0，已安装 18.9.9 → major 18 == 18 → ✅ 满足
要求 ^18.3.0，已安装 19.0.0 → major 19 != 18 → ❌ 不满足
要求 ~18.3.0，已安装 18.3.5 → major.minor 18.3 == 18.3 → ✅ 满足
要求 ~18.3.0，已安装 18.4.0 → major.minor 18.4 != 18.3 → ❌ 不满足
```

### Java 版本特殊性

Java 的版本号有两种表示方式：
- 旧式：`1.8.0_382`（Java 8）
- 新式：`17.0.9`（Java 17+）

比较时需要统一：`1.8` → `8`，`1.11` → `11`。

### LTS 版本参考

| 工具 | LTS 版本 |
|------|----------|
| JDK | 8, 11, 17, 21 |
| Node.js | 18, 20, 22 |
| Python | 3.10, 3.11, 3.12 |
| Go | 每 6 个月发布，无固定 LTS |
| .NET | 6, 8 |

当无法确定具体版本时，推荐使用最新的 LTS 版本。

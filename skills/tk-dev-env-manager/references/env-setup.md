# 环境配置与下载指南

本文档定义了各开发工具的下载源、安装策略和路径配置方式。
当用户选择"自动下载到项目目录"选项时使用。

---

## 通用策略

### 下载目标目录
```
<项目根目录>/runtime-env/
├── jdk/          # JDK 安装目录
├── maven/        # Maven 安装目录
├── gradle/       # Gradle 安装目录
├── node/         # Node 安装目录
├── python/       # Python 安装目录
├── go/           # Go 安装目录
├── rust/         # Rust 工具链目录
├── deno/         # Deno 安装目录
├── bun/          # Bun 安装目录
├── dotnet/       # .NET SDK 目录
└── tmp/          # 下载临时目录（安装后清理）
```

### 安装后自动更新 .env
下载并解压完成后，自动将路径写入 `<项目根目录>/.claude/project-env/.env`：
```env
JAVA_HOME=<项目根目录>/runtime-env/jdk
MAVEN_HOME=<项目根目录>/runtime-env/maven
```

### 平台检测
Claude 需要检测当前操作系统来选择正确的下载包：
- `uname` 或 `os.name` → linux / darwin / windows
- 架构 → x64 / arm64
- 检测方式：
  ```bash
  # Unix-like
  os=$(uname -s | tr '[:upper:]' '[:lower:]')  # linux / darwin
  arch=$(uname -m)                               # x86_64 / arm64

  # Windows (Git Bash / MSYS2)
  os=windows
  arch=$(uname -m)                               # x86_64 / arm64
  ```

### Windows 专用注意事项

- 下载包选择 `.zip` 格式（Windows 原生支持解压）
- 避免使用 `.tar.gz`（虽然 Git Bash 可以解压，但兼容性不保证）
- 路径使用正斜杠以保持兼容：`C:/Users/xxx/runtime-env/jdk`
- 可执行文件扩展名：`.exe`、`.bat`、`.cmd`
- PowerShell 的解压命令：`Expand-Archive -Path xxx.zip -DestinationPath xxx`

### 下载完整性校验

下载完成后，建议校验文件完整性以确保未被篡改：

```bash
# SHA256 校验（推荐）
sha256sum jdk17.zip
# 或 Windows Git Bash
certutil -hashfile jdk17.zip SHA256

# 与官方公布的校验和比对
# Temurin: https://adoptium.net/temurin/releases/
# Node.js: https://nodejs.org/dist/vX.XX.X/SHASUMS256.txt
# Python:  https://www.python.org/downloads/ 页面底部
# Go:      https://go.dev/dl/ 页面中的校验和
```

如果校验和不匹配，删除文件并重新下载。

---

## JDK

### 推荐发行版
| 发行版 | 维护方 | 下载地址 | 说明 |
|--------|--------|----------|------|
| Eclipse Temurin | Adoptium | `https://adoptium.net/` | 社区推荐，LTS 版本免费 |
| Amazon Corretto | AWS | `https://aws.amazon.com/corretto/` | AWS 维护，免费 |
| GraalVM | Oracle | `https://www.graalvm.org/` | 支持 native-image |
| Microsoft Build | Microsoft | `https://learn.microsoft.com/java/openjdk/` | Windows 优化 |

### 下载方式

**Temurin (Adoptium) API：**
```bash
# 通过 API 下载指定版本
# 示例: 下载 JDK 17 for Windows x64
curl -L "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse" \
  -o jdk17.zip

# Linux x64
curl -L "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" \
  -o jdk17.tar.gz

# Linux ARM64
curl -L "https://api.adoptium.net/v3/binary/latest/17/ga/linux/arm64/jdk/hotspot/normal/eclipse" \
  -o jdk17.tar.gz

# macOS
curl -L "https://api.adoptium.net/v3/binary/latest/17/ga/mac/x64/jdk/hotspot/normal/eclipse" \
  -o jdk17.tar.gz
```

### 安装步骤
1. 下载压缩包到 `runtime-env/tmp/`
2. 解压到 `runtime-env/jdk/`
   ```bash
   # Unix-like
   tar -xzf runtime-env/tmp/jdk17.tar.gz -C runtime-env/jdk/ --strip-components=1

   # Windows (Git Bash)
   unzip runtime-env/tmp/jdk17.zip -d runtime-env/tmp/jdk-extracted/
   mv runtime-env/tmp/jdk-extracted/jdk-17.* runtime-env/jdk/
   ```
3. 验证: `runtime-env/jdk/bin/java -version`
4. 更新 .env

### 版本映射
根据 pom.xml/build.gradle 中提取的版本号：
- `8` → JDK 8 (旧版 LTS，已逐步退出主流)
- `11` → JDK 11 (LTS)
- `17` → JDK 17 (LTS，当前最广泛使用)
- `21` → JDK 21 (LTS)
- `25` → JDK 25 (即将到来的 LTS，预计 2025-09 发布)

---

## Maven

### 下载方式
```bash
# 从 Apache 官方下载
# Linux / macOS
curl -L "https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz" \
  -o maven.tar.gz

# Windows（使用 .zip 格式）
curl -L "https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip" \
  -o maven.zip

# 或使用镜像
curl -L "https://mirrors.tuna.tsinghua.edu.cn/apache/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz" \
  -o maven.tar.gz
```

### 注意事项
- 如果项目有 `mvnw`（Maven Wrapper），优先使用 wrapper，不需要单独下载 Maven
- Maven 只需要 JDK 环境，无需额外编译
- 版本号从 `.mvn/wrapper/maven-wrapper.properties` 中提取（如有 wrapper）

### 安装步骤
1. 下载到 `runtime-env/tmp/`
2. 解压到 `runtime-env/maven/`
3. 验证: `runtime-env/maven/bin/mvn --version`
4. 更新 .env

---

## Gradle

### 下载方式
```bash
# 从 Gradle 官方下载
curl -L "https://services.gradle.org/distributions/gradle-8.5-bin.zip" \
  -o gradle.zip
```

### 注意事项
- 如果项目有 `gradlew`（Gradle Wrapper），优先使用 wrapper
- 版本号从 `gradle/wrapper/gradle-wrapper.properties` 中提取
- Gradle 版本需要与 JDK 版本兼容（如 Gradle 8.x 需要 JDK 17+）

### JDK 与 Gradle 版本兼容性
| Gradle 版本 | 最低 JDK | 最高 JDK |
|-------------|----------|----------|
| 7.x | 8 | 19 |
| 8.x | 17 | 21 |

---

## Node.js

### 推荐版本源
| 来源 | 下载地址 | 说明 |
|------|----------|------|
| Node.js 官方 | `https://nodejs.org/dist/` | 官方二进制包 |
| npmmirror | `https://npmmirror.com/mirrors/node/` | 国内镜像 |
| nvm for Windows | `https://github.com/coreybutler/nvm-windows` | Windows 版本管理器 |
| fnm (Fast Node Manager) | `https://github.com/Schniz/fnm` | 跨平台，Rust 实现 |

### 下载方式
```bash
# 官方二进制包（示例: Node 20.11.0 for Windows x64）
curl -L "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip" \
  -o node.zip

# Linux
curl -L "https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz" \
  -o node.tar.xz

# macOS
curl -L "https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-x64.tar.gz" \
  -o node.tar.gz

# 国内镜像
curl -L "https://npmmirror.com/mirrors/node/v20.11.0/node-v20.11.0-win-x64.zip" \
  -o node.zip
```

### 版本选择策略
1. 优先读取 `.nvmrc` 文件中的版本
2. 其次读取 `package.json` 中的 `engines.node`
3. 如果都没有，使用当前 LTS 版本（偶数主版本号）

### 安装步骤
1. 下载到 `runtime-env/tmp/`
2. 解压到 `runtime-env/node/`
3. 验证: `runtime-env/node/node --version`
4. 验证 npm: `runtime-env/node/npm --version`
5. 更新 .env

---

## pnpm

### 下载方式
```bash
# 通过 npm 全局安装（需要先有 Node）
npm install -g pnpm@8.15.1

# 或通过独立安装脚本
# Unix-like
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### 版本选择
- 从 `package.json` 的 `packageManager` 字段读取精确版本
- 如 `"packageManager": "pnpm@8.15.1"`

---

## yarn

### 下载方式
```bash
# Yarn Classic (1.x)
npm install -g yarn

# Yarn Berry (2+/4.x) — 通过 corepack 启用
corepack enable
corepack prepare yarn@4.1.0 --activate
```

### 注意事项
- Yarn 2+ (Berry) 使用 Plug'n'Play 模式，与传统 node_modules 不同
- `yarn.lock` 的格式在 Yarn 1 和 Yarn Berry 之间不兼容

---

## Bun

### 下载方式
```bash
# Unix-like (官方安装脚本)
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# 或通过 npm
npm install -g bun

# 手动下载二进制文件
# https://github.com/oven-sh/bun/releases
curl -L "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip" -o bun.zip
```

### 安装步骤
1. 下载到 `runtime-env/tmp/`
2. 解压/安装到 `runtime-env/bun/`
3. 验证: `runtime-env/bun/bun --version`
4. 更新 .env: `BUN_HOME=<项目根目录>/runtime-env/bun`

---

## Deno

### 下载方式
```bash
# Unix-like (官方安装脚本)
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# 或直接下载二进制文件
curl -L "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" -o deno.zip
```

### 安装步骤
1. 下载到 `runtime-env/tmp/`
2. 解压到 `runtime-env/deno/`
3. 验证: `runtime-env/deno/deno --version`
4. 更新 .env: `DENO_HOME=<项目根目录>/runtime-env/deno`

---

## Python

### 推荐发行版
| 发行版 | 下载地址 | 说明 |
|--------|----------|------|
| CPython 官方 | `https://www.python.org/downloads/` | 官方实现 |
| Miniconda | `https://docs.conda.io/en/latest/miniconda.html` | 轻量 conda，自带包管理 |
| uv (Astral) | `https://docs.astral.sh/uv/` | Rust 实现，极快的包管理 |

### 下载方式
```bash
# CPython 官方（示例: Python 3.12.1 for Windows）
curl -L "https://www.python.org/ftp/python/3.12.1/python-3.12.1-embed-amd64.zip" \
  -o python.zip

# Miniconda
curl -L "https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe" \
  -o miniconda.exe

# Linux
curl -L "https://www.python.org/ftp/python/3.12.1/Python-3.12.1.tgz" \
  -o python.tgz
```

### 注意事项
- Windows 上 Python 安装较复杂，推荐使用 embeddable 包或 Miniconda
- **embeddable 包的限制**：不包含 pip、venv、IDLE 等标准工具，功能受限。适合轻量运行场景，不适合开发环境
- 如果用户有 pyenv/pyenv-win，优先从 pyenv 管理的版本中选择
- uv 是新兴的 Python 包管理器（Rust 实现），速度极快，可以考虑推荐

### 安装步骤（embeddable 包 — 仅适用于轻量场景）

> ⚠️ embeddable 包缺少 pip/venv 等标准工具，**推荐开发环境优先使用 Miniconda 或官方安装包**。

1. 下载 `python-3.12.1-embed-amd64.zip` 到 `runtime-env/tmp/`
2. 解压到 `runtime-env/python/`
3. **修改 `._pth` 文件以启用 site-packages**：
   ```
   # 编辑 runtime-env/python/python312._pth
   # 取消以下行的注释（删除行首的 #）：
   import site
   ```
   如果不执行此步，pip 无法正常工作。
4. 下载 `get-pip.py`：
   ```bash
   curl -L "https://bootstrap.pypa.io/get-pip.py" -o runtime-env/python/get-pip.py
   runtime-env/python/python.exe runtime-env/python/get-pip.py
   ```
5. 验证: `runtime-env/python/python.exe --version`
6. 验证 pip: `runtime-env/python/python.exe -m pip --version`
7. 更新 .env

---

## Go

### 下载方式
```bash
# 官方下载（示例: Go 1.21.6 for Windows amd64）
curl -L "https://go.dev/dl/go1.21.6.windows-amd64.zip" \
  -o go.zip

# Linux
curl -L "https://go.dev/dl/go1.21.6.linux-amd64.tar.gz" \
  -o go.tar.gz

# 国内镜像
curl -L "https://mirrors.aliyun.com/golang/go1.21.6.windows-amd64.zip" \
  -o go.zip
curl -L "https://golang.google.cn/dl/go1.21.6.windows-amd64.zip" \
  -o go.zip
```

### 安装步骤
1. 下载到 `runtime-env/tmp/`
2. 解压到 `runtime-env/go/`
3. 验证: `runtime-env/go/bin/go version`
4. 更新 .env: `GOROOT=<项目根目录>/runtime-env/go`

---

## Rust

### 下载方式
```bash
# 官方安装脚本 (rustup)
# Unix-like
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows — 需要下载 rustup-init.exe
curl -L "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe" \
  -o rustup-init.exe
```

### 注意事项
- Rust 通常通过 rustup 安装和管理，不建议手动下载
- 如果项目有 `rust-toolchain.toml`，rustup 会自动安装指定版本
- Windows 上需要安装 Visual Studio Build Tools 或 MinGW

---

## .NET SDK

### 下载方式
```bash
# 官方下载（示例: .NET 8.0 SDK）
# Windows
curl -L "https://dot.net/v1/dotnet-install.ps1" -o dotnet-install.ps1
./dotnet-install.ps1 -Channel 8.0 -InstallDir runtime-env/dotnet

# Unix-like
curl -L "https://dot.net/v1/dotnet-install.sh" -o dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0 --install-dir runtime-env/dotnet
```

### 安装步骤
1. 使用安装脚本或下载二进制包
2. 验证: `runtime-env/dotnet/dotnet --version`
3. 更新 .env: `DOTNET_HOME=<项目根目录>/runtime-env/dotnet`

---

## Docker

### 检测和安装

```bash
# 检测 Docker 是否安装
docker --version

# 检测 Docker Compose 版本
docker compose version    # V2（推荐）
docker-compose --version  # V1（旧版）
```

### 安装引导
- **Windows**：推荐安装 Docker Desktop for Windows（需要 WSL2）
  - 下载地址：`https://www.docker.com/products/docker-desktop/`
  - 前提条件：WSL2 已启用
- **Linux**：按照发行版文档安装 Docker Engine
- **macOS**：安装 Docker Desktop for Mac

### WSL2 检测（Windows 前提）
```bash
# 检测 WSL2 是否已安装
wsl --status
wsl --list --verbose
```

---

## 版本管理工具检测

如果用户机器上已安装版本管理工具，优先从其管理的版本中选取合适的路径，
而不是重新下载。

### 检测 nvm
```bash
# Linux/Mac
[ -d "$HOME/.nvm" ] && echo "nvm detected"
[ -f "$HOME/.nvm/alias/default" ] && cat "$HOME/.nvm/alias/default"

# Windows (nvm-windows)
nvm list 2>/dev/null
# 输出路径通常为: C:/Users/<user>/AppData/Roaming/nvm/vXX.XX.X
# 或通过 NVM_HOME 环境变量获取路径
```

### 检测 fnm (Fast Node Manager)
```bash
fnm --version 2>/dev/null
fnm list 2>/dev/null
# 路径通常为: $HOME/.local/share/fnm/node-versions/vXX.XX.X
# 或 Windows: %LOCALAPPDATA%/fnm/node-versions/vXX.XX.X
```

### 检测 sdkman
```bash
[ -d "$HOME/.sdkman" ] && echo "sdkman detected"
source "$HOME/.sdkman/bin/sdkman-init.sh" && sdk current java
# Java 路径通常为: $HOME/.sdkman/candidates/java/current
```

### 检测 pyenv
```bash
# Unix-like
[ -d "$HOME/.pyenv" ] && echo "pyenv detected"
pyenv versions 2>/dev/null
# Python 路径通常为: $HOME/.pyenv/versions/<version>

# Windows (pyenv-win)
pyenv --version 2>/dev/null
pyenv versions 2>/dev/null
# 路径通常为: C:/Users/<user>/.pyenv/pyenv-win/versions/<version>
```

### 检测 asdf
```bash
[ -d "$HOME/.asdf" ] && echo "asdf detected"
asdf list 2>/dev/null
# 路径通常为: $HOME/.asdf/installs/<tool>/<version>
```

### 使用版本管理工具路径
如果检测到版本管理工具且其中有项目需要的版本：
1. 获取该版本的安装路径
2. 将路径写入 .env
3. 无需重新下载

---

## 网络问题处理

### 下载失败
1. 重试一次（网络波动）
2. 如果仍然失败，检查是否是代理问题
3. 尝试使用镜像源
4. 如果所有下载都失败，提示用户手动下载并放置到 `runtime-env/tmp/`

### 镜像源汇总

**JDK (Adoptium/Temurin)：**
- 清华镜像：`https://mirrors.tuna.tsinghua.edu.cn/Adoptium/`
- 华为镜像：`https://repo.huaweicloud.com/java/jdk/`

**Node.js：**
- npmmirror：`https://npmmirror.com/mirrors/node/`

**Python：**
- 清华 PyPI：`https://pypi.tuna.tsinghua.edu.cn/simple/`
- 阿里云 PyPI：`https://mirrors.aliyun.com/pypi/simple/`

**Go：**
- 阿里云：`https://mirrors.aliyun.com/golang/`
- 七牛云：`https://golang.google.cn/dl/`（模块代理）

**Maven：**
- 清华镜像：`https://mirrors.tuna.tsinghua.edu.cn/apache/maven/`
- 阿里云仓库（settings.xml 配置）：`https://maven.aliyun.com/repository/central`

**Rust (crates.io)：**
- 字节跳动：`https://rsproxy.cn/`
- 中科大：`https://mirrors.ustc.edu.cn/crates.io-index/`

**npm registry：**
- 淘宝镜像：`https://registry.npmmirror.com/`

### 离线环境
如果完全无法联网：
1. 提示用户手动下载并放置到 `runtime-env/tmp/`
2. 告知具体的文件名和下载链接
3. 等待用户放置完成后继续安装

---

## 清理策略

下载完成并成功安装后：
1. 删除 `runtime-env/tmp/` 中的压缩包（节省磁盘空间）
2. 保留 `runtime-env/` 中的安装目录
3. 在 `.gitignore` 中添加以下条目（如果尚未添加）：
   ```
   runtime-env/
   .claude/project-env/
   ```
4. 验证安装成功后才执行清理，避免下载失败时需要重新下载

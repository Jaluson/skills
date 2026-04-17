# 环境故障排查指南

本文档列出了开发环境检测和配置过程中的常见问题，以及对应的排查和解决方法。

---

## 通用排查流程

当环境检测失败时，按以下顺序排查：

```
1. 工具是否已安装？
   → 否：引导安装（参见 env-setup.md）
   → 是：继续 ↓

2. 工具是否在 PATH 中？
   → 否：配置 PATH 或设置 *_HOME 变量
   → 是：继续 ↓

3. 版本是否满足要求？
   → 否：升级或切换版本
   → 是：继续 ↓

4. 权限是否正确？
   → 否：修复文件权限（Unix-like）或以管理员运行（Windows）
   → 是：继续 ↓

5. 依赖是否满足？
   → 如 JDK 缺少、Visual Studio Build Tools 缺少等
```

---

## Java 相关问题

### `java -version` 输出到 stderr

**现象**：使用 `java -version` 检测时，版本信息输出到 stderr 而非 stdout。

**影响**：直接 `$()` 捕获可能拿不到版本字符串。

**解决**：
```bash
# 将 stderr 重定向到 stdout
java -version 2>&1 | grep "version"

# 或
java -version 2>&1 | head -1
```

### JAVA_HOME 设置了但 `mvn`/`gradle` 找不到

**现象**：`JAVA_HOME` 已正确设置，但 Maven 或 Gradle 执行时报错找不到 JDK。

**排查**：
1. 确认 `JAVA_HOME` 路径不以 `/` 结尾
2. 确认 `$JAVA_HOME/bin/java`（或 `$JAVA_HOME/bin/java.exe`）存在
3. 确认 `$JAVA_HOME/bin/java -version` 输出正确
4. Windows 上注意路径分隔符问题

**解决**：
```bash
# 检查路径是否存在
ls "$JAVA_HOME/bin/java" 2>/dev/null || ls "$JAVA_HOME/bin/java.exe" 2>/dev/null

# 如果路径中有空格（Windows 常见），确保引号正确
"$JAVA_HOME/bin/java" -version
```

### JDK 版本冲突

**现象**：系统 PATH 中有多个 JDK 版本，`java -version` 显示的不是期望的版本。

**排查**：
```bash
# 查看实际使用的是哪个 java
which java          # Unix-like
where java          # Windows

# 查看所有 java 路径
which -a java       # Unix-like (zsh)
where java          # Windows（列出所有匹配）
```

**解决**：
- 在 `.env` 中设置 `JAVA_HOME` 指向正确版本
- 在命令执行时使用 `$JAVA_HOME/bin/java` 而非系统 `java`

### Maven Wrapper 权限问题

**现象**（Unix-like）：执行 `./mvnw` 时报 `Permission denied`。

**解决**：
```bash
chmod +x mvnw
```

---

## Node.js 相关问题

### Node 版本不匹配

**现象**：项目要求 Node 18+，但系统安装的是 Node 16。

**排查**：
```bash
node --version
which node / where node
```

**解决**：
- 如果有 nvm：`nvm install 18 && nvm use 18`
- 如果有 fnm：`fnm install 18 && fnm use 18`
- 否则参考 `env-setup.md` 下载安装

### npm/pnpm/yarn 全局安装权限问题

**现象**（Unix-like）：`npm install -g` 报 `EACCES` 错误。

**解决**：
```bash
# 方案 1：修改 npm 全局目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# 方案 2：使用 nvm 管理的 Node（nvm 安装的 Node 不需要 sudo）
```

### node-gyp 编译失败

**现象**：安装依赖时报 `node-gyp` 相关错误。

**排查**：
- Windows：是否安装了 Visual Studio Build Tools？
- Unix-like：是否安装了 `make` 和 `gcc`/`g++`？

**解决**：
- Windows：安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（选装 "C++ build tools" 工作负载）。注意：npm 包 `windows-build-tools` 已弃用，不再推荐使用
- macOS：`xcode-select --install`
- Linux：`sudo apt install build-essential`（Debian/Ubuntu）

### pnpm 未找到

**现象**：项目使用 pnpm（有 `pnpm-lock.yaml`），但系统没有 pnpm。

**解决**：
```bash
# 方案 1：通过 corepack 启用（Node 16.13+ 自带）
corepack enable
corepack prepare pnpm@latest --activate

# 方案 2：通过 npm 安装
npm install -g pnpm

# 方案 3：下载到项目 runtime-env
# 参见 env-setup.md
```

### Bun 安装后命令找不到

**现象**：安装 Bun 后执行 `bun` 报 `command not found`。

**解决**：
```bash
# 检查 Bun 安装路径
ls ~/.bun/bin/bun 2>/dev/null

# 添加到 PATH（如果不在 PATH 中）
export PATH="$HOME/.bun/bin:$PATH"

# 或在 .env 中设置
# BUN_HOME=/home/xxx/.bun
```

---

## Python 相关问题

### Windows 上 Python 不在 PATH 中

**现象**：Windows 上安装了 Python 但 `python` 命令不可用。

**排查**：
```bash
# 尝试 python3 或 py 启动器
python3 --version 2>/dev/null
py --version 2>/dev/null
py -3 --version 2>/dev/null

# 在常见位置查找
ls "/c/Python3"* 2>/dev/null
ls "/c/Users/$USER/AppData/Local/Programs/Python/"* 2>/dev/null
```

**解决**：
- 在 `.env` 中设置 `PYTHON_HOME` 指向安装目录
- 或将 Python 目录添加到系统 PATH

### pip 不可用

**现象**：Python 可用但 `pip` 命令不存在。

**解决**：
```bash
# 使用 python -m pip 代替 pip
python -m pip --version

# 如果 pip 完全没有，安装 pip
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py

# Windows embeddable 版本需要手动安装
# 参见 env-setup.md 的 Python 部分
```

### 虚拟环境冲突

**现象**：系统 Python 和项目虚拟环境版本不一致。

**排查**：
```bash
# 检查当前使用的 Python 路径
which python
python -c "import sys; print(sys.prefix)"

# 检查虚拟环境是否激活
echo $VIRTUAL_ENV   # Unix-like
echo %VIRTUAL_ENV%  # Windows CMD
```

**解决**：
- 如果项目有 `venv/` 或 `.venv/` 目录，先激活虚拟环境
- Poetry 项目：`poetry shell`
- uv 项目：`uv sync` 然后 `source .venv/bin/activate`

---

## Go 相关问题

### Go 模块下载超时

**现象**：`go mod download` 超时。

**解决**：
```bash
# 设置国内代理
go env -w GOPROXY=https://goproxy.cn,direct
# 或
go env -w GOPROXY=https://goproxy.io,direct
```

### CGO 编译失败

**现象**：使用 CGO 的 Go 项目编译失败。

**解决**：
- Windows：安装 MinGW-w64 或 TDM-GCC
- Linux：`sudo apt install gcc`（Debian/Ubuntu）
- macOS：`xcode-select --install`

---

## Rust 相关问题

### Windows 上缺少链接器

**现象**：`cargo build` 报链接器错误。

**解决**：
- 安装 Visual Studio Build Tools（推荐）
- 或安装 MinGW-w64 并设置 `CC=gcc`

### rustup 未安装

**现象**：系统没有 `rustup` 和 `cargo`。

**解决**：
- Unix-like：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Windows：下载并运行 `rustup-init.exe`

---

## .NET 相关问题

### SDK 版本不匹配

**现象**：`dotnet build` 报 SDK 版本错误。

**排查**：
```bash
# 查看已安装的 SDK
dotnet --list-sdks

# 查看项目要求的版本（global.json）
cat global.json
```

**解决**：
- 安装指定版本的 SDK
- 或修改 `global.json` 中的版本要求

---

## Docker 相关问题

### Docker 未运行

**现象**：`docker` 命令报 `Cannot connect to the Docker daemon`。

**解决**：
- Windows/macOS：启动 Docker Desktop
- Linux：`sudo systemctl start docker`

### WSL2 未安装（Windows 前提）

**现象**：Docker Desktop 报 WSL2 相关错误。

**解决**：
```powershell
# 以管理员身份运行 PowerShell
wsl --install
# 重启电脑后生效
```

### docker compose 版本问题

**现象**：`docker-compose` 命令不可用，但 `docker compose`（V2）可用，反之亦然。

**排查**：
```bash
# 检测 V2（作为 Docker CLI 插件）
docker compose version

# 检测 V1（独立二进制）
docker-compose version
```

**解决**：
- 优先使用 V2：`docker compose`（无横杠）
- 如果脚本或文档使用 V1 命令，做适配替换

---

## Windows 特有问题

### 路径中的空格

**现象**：包含空格的路径（如 `C:\Program Files\`）导致命令失败。

**解决**：
```bash
# 始终使用引号包裹路径
"$JAVA_HOME/bin/java" -version

# 在 .env 中也使用引号（可选）
# JAVA_HOME="C:/Program Files/Java/jdk-17"
```

### 路径分隔符

**现象**：反斜杠 `\` 在某些上下文中被当作转义字符。

**解决**：
- 统一使用正斜杠 `/`
- Bash/MSYS2 环境下自动转换 `/c/` ↔ `C:\`
- 在 .env 文件中推荐使用正斜杠

### 长路径限制

**现象**：Windows 默认路径长度限制为 260 字符，导致嵌套 node_modules 解压失败。

**解决**：
```powershell
# 以管理员身份运行 PowerShell，启用长路径
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

- 或将项目放在较浅的目录中（如 `D:\projects\` 而非 `C:\Users\username\Documents\projects\`）

### 编码问题

**现象**：Windows 中文环境下，命令输出包含乱码。

**解决**：
```bash
# Git Bash / MSYS2 环境
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Windows CMD
chcp 65001

# Windows PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### Git Bash 环境差异

**现象**：某些命令在 Git Bash 中的行为与标准 bash 不同。

**注意**：
- Git Bash 中 `uname -s` 返回 `MINGW64_NT-*` 或 `MSYS_NT-*`，需要映射为 `windows`
- 某些 Unix 命令（如 `readlink -f`）在 Git Bash 中不可用或行为不同
- `which` 在 Git Bash 中可用，但 `where` 才是 Windows 原生命令

---

## 版本管理工具冲突

### 多个版本管理工具共存

**现象**：同时安装了 nvm 和 fnm，或 sdkman 和手动安装的 JDK，版本混乱。

**排查**：
```bash
# 检查所有可能的版本管理工具
echo "NVM_HOME: $NVM_HOME"
echo "SDKMAN_DIR: $SDKMAN_DIR"
which nvm fnm sdk pyenv asdf 2>/dev/null
```

**解决**：
- 确定主要使用哪个版本管理工具
- 在 `.env` 中直接指定路径，绕过版本管理工具的自动切换
- 如果需要使用版本管理工具，确保其初始化脚本在 shell 配置中

### PATH 顺序问题

**现象**：正确设置了 `JAVA_HOME` 等变量，但命令仍使用旧版本。

**排查**：
```bash
echo $PATH | tr ':' '\n' | head -20
which java
```

**解决**：
```bash
# 将自定义路径放在 PATH 前面
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"
```

---

## 网络与代理问题

### 公司代理导致下载失败

**现象**：curl/wget 下载超时或被拒绝。

**排查**：
```bash
# 检查是否配置了代理
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $http_proxy
echo $https_proxy

# 检查 Git 代理
git config --global http.proxy
```

**解决**：
```bash
# 设置代理
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# 或让 curl 使用代理
curl -x http://proxy.company.com:8080 -L "https://example.com/file.zip" -o file.zip

# 对于 npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### SSL 证书验证失败

**现象**：curl 报 `SSL certificate problem`。

**解决**：
```bash
# 临时跳过验证（不推荐长期使用）
curl -k -L "https://example.com/file.zip" -o file.zip

# 或指定 CA 证书
curl --cacert /path/to/ca-bundle.crt -L "https://example.com/file.zip" -o file.zip
```

---

## 构建命令常见错误速查

| 错误信息 | 可能原因 | 解决方法 |
|----------|----------|----------|
| `JAVA_HOME is not defined` | 未设置 JAVA_HOME | 在 .env 中设置或设置环境变量 |
| `Could not find or load main class` | JDK 版本不匹配 | 检查编译和运行使用的 JDK 版本 |
| `EPERM: operation not permitted` | 权限不足 | Unix: `chmod +x`，Windows: 以管理员运行 |
| `EACCES: permission denied` | 文件/目录权限 | 修改文件权限或所有者 |
| `ENOSPC: no space left on device` | 磁盘空间不足 | 清理磁盘空间 |
| `ETIMEDOUT` / `ECONNREFUSED` | 网络问题 | 检查网络/代理配置 |
| `Module not found` / `Cannot find module` | 依赖未安装 | 执行 `npm install` / `pip install` 等 |
| `Port 8080 already in use` | 端口被占用 | 更换端口或结束占用进程 |
| `Out of memory` / `heap space` | 内存不足 | 增加堆内存（如 `-Xmx` 参数） |
| `ENOENT: no such file or directory` | 文件/目录不存在 | 检查路径是否正确 |

---

## 缓存与残留清理

当构建频繁失败且其他排查手段无效时，尝试清理缓存：

### npm 缓存
```bash
npm cache clean --force
# 或删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### pnpm 缓存
```bash
pnpm store prune
# 重新安装
rm -rf node_modules
pnpm install
```

### Gradle 缓存
```bash
# 停止 Gradle daemon
./gradlew --stop

# 清理项目构建缓存
./gradlew clean

# 清理全局缓存（慎用）
rm -rf ~/.gradle/caches/
rm -rf ~/.gradle/wrapper/dists/
```

### Maven 缓存
```bash
# 清理项目构建
./mvnw clean

# 清理本地仓库中的特定依赖（慎用）
rm -rf ~/.m2/repository/<group-path>/<artifact>/
```

### pip 缓存
```bash
pip cache purge
# 或清除缓存目录
pip cache dir  # 查看缓存位置
```

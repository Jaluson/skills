# Vue 3 质量门禁标准

## 一、代码质量门禁

### 1.1 编译检查

| 检查项 | 标准 | 工具 |
|--------|------|------|
| 编译通过 | 0 错误，0 警告 | Vite build |
| TypeScript 类型 | 0 类型错误 | vue-tsc |
| ESLint | 0 违规 | eslint |

### 1.2 静态代码检查

| 检查项 | 阈值 | 工具 |
|--------|------|------|
| ESLint | 0 Error | eslint |
| Prettier | 0 格式化冲突 | prettier --check |
| Type 检查 | 0 类型错误 | vue-tsc --noEmit |

### 1.3 质量检查命令

```bash
# 完整检查
npm run lint          # ESLint 检查
npm run type-check    # TypeScript 类型检查
npm run build         # 生产构建

# package.json scripts 示例
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx --fix",
    "type-check": "vue-tsc --noEmit"
  }
}
```

---

## 二、测试质量门禁

### 2.1 覆盖率要求

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 80,
        lines: 70,
      },
    },
  },
});
```

### 2.2 测试通过率

| 类型 | 要求 |
|------|------|
| 单元测试 | 100% 通过 |
| 组件测试 | 100% 通过 |
| E2E 测试 | 核心流程 100% |

### 2.3 CI/CD 测试流程

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit

      - name: Run e2e tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

### 2.4 GitHub Actions 进阶配置

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # 并行 Job 配置
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run type check
        run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2]  # 分片并行
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job.total }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-results-${{ matrix.shard }}
          path: |
            playwright-report/
            test-results/
```

### 2.5 GitLab CI 配置

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - deploy

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

variables:
  NODE_VERSION: '20'

before_script:
  - npm ci --cache .npm --prefer-offline

lint:
  stage: lint
  script:
    - npm run lint
    - npm run type-check
  allow_failure: false

unit-test:
  stage: test
  script:
    - npm run test:unit -- --coverage
  coverage: /All files[^|]*\|[^|]*\|[^|]*\s+([0-9]{1,3})/
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
  allow_failure: false

e2e-test:
  stage: test
  services:
    - docker:dind
  script:
    - npm ci
    - npx playwright install --with-deps
    - npx playwright test
  artifacts:
    when: always()
    paths:
      - playwright-report/
      - test-results/
  allow_failure: true

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
  only:
    - main
    - develop

deploy:
  stage: deploy
  script:
    - npm run deploy
  only:
    - main
  when: manual
```

---

## 三、安全质量门禁

### 3.1 敏感信息检查

| 检查项 | 工具 |
|--------|------|
| 密钥硬编码 | GitLeaks / truffleHog |
| 依赖漏洞 | npm audit / Snyk |
| XSS 漏洞 | SonarQube |
| 依赖安全 | dependabot |

### 3.2 依赖安全配置

```json
// package.json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "security:check": "npm audit --production"
  }
}
```

### 3.3 npm audit 集成

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # 每周检查

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Check for vulnerabilities
        run: |
          npm audit --json > audit-results.json
          # 检查是否有高危漏洞
          if grep -q '"severity":"high"' audit-results.json; then
            echo "High severity vulnerabilities found!"
            exit 1
          fi
```

### 3.4 Snyk 集成

```yaml
# .github/workflows/snyk.yml
name: Snyk Security

on:
  push:
    branches: [main]
  pull_request:

jobs:
  snyk:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high --fail-on=all
```

### 3.5 Dependabot 配置

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm 依赖更新
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    commit-message:
      prefix: 'deps'
    labels:
      - 'dependencies'
    reviewers:
      - team: frontend
    groups:
      production-dependencies:
        dependency-type: 'production'
        update-types:
          - 'major'
          - 'minor'
      development-dependencies:
        dependency-type: 'development'
        update-types:
          - 'major'
          - 'minor'
          - 'patch'

  # GitHub Actions 更新
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
```

### 3.6 锁文件重要性

```bash
# ✅ 使用 package-lock.json 确保依赖一致性
npm ci  # 优先使用 npm ci 而不是 npm install
# npm ci 完全按照 lock 文件安装，确保团队成员环境一致

# ❌ 不要删除 package-lock.json
# ❌ 不要跳过 lock 文件提交
# ❌ 不要在不同环境间混用 yarn.lock 和 package-lock.json
```

---

## 四、Git 提交门禁

### 4.1 提交前检查

```bash
#!/bin/bash
# pre-commit.sh

echo "Running pre-commit checks..."

# 运行 ESLint
npm run lint
if [ $? -ne 0 ]; then
  echo "ESLint failed"
  exit 1
fi

# 运行类型检查
npm run type-check
if [ $? -ne 0 ]; then
  echo "Type check failed"
  exit 1
fi

# 运行测试
npm run test
if [ $? -ne 0 ]; then
  echo "Tests failed"
  exit 1
fi

echo "All checks passed!"
```

### 4.2 Commitlint 配置

```typescript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'param-case']],
  },
};
```

### 4.3 Husky v9 配置（最佳实践）

```bash
# 安装 Husky
npm install -D husky

# 初始化
npx husky init

# 添加 pre-commit hook
echo 'npm run lint && npm run type-check && npm run test:unit' > .husky/pre-commit

# 添加 commit-msg hook
echo 'npx commitlint --edit' > .husky/commit-msg
```

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run type-check && npm run test:unit",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{vue,ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,sass}": [
      "prettier --write"
    ]
  }
}
```

---

## 五、CI/CD 流水线

### 5.1 流水线阶段

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Lint   │ → │  Type   │ → │  Test   │ → │ Build   │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
      │           │             │             │
      └───────────┴─────────────┴─────────────┘
                      ↓
              ┌───────────────┐
              │   Deploy      │
              └───────────────┘
```

### 5.2 门禁检查点

| 阶段 | 检查项 | 失败处理 |
|------|--------|----------|
| Lint | ESLint 检查 | 阻塞合并 |
| Type | vue-tsc 类型检查 | 阻塞合并 |
| Test | 单元测试 + 覆盖率 | 阻塞合并 |
| Build | 生产构建成功 | 阻塞合并 |
| Deploy | 冒烟测试 | 阻塞发布 |

---

## 六、Code Review 规范

### 6.1 Review 检查清单

#### 组件层检查

- [ ] Props 有 TypeScript 类型定义
- [ ] 组件不超过 300 行
- [ ] 组件名使用 PascalCase
- [ ] 样式使用 scoped 隔离
- [ ] 无 console.log 调试代码
- [ ] 事件使用 defineEmits 定义

#### Composables 层检查

- [ ] 组合式函数有 TypeScript 类型
- [ ] 函数命名以 `use` 开头
- [ ] 无内部状态污染
- [ ] 正确处理 async/await

#### Store 层检查

- [ ] State 有类型定义
- [ ] Getters 使用 computed
- [ ] Actions 是 async 函数
- [ ] 无直接修改 State 的操作

#### API 层检查

- [ ] 请求/响应有类型定义
- [ ] 错误处理完善
- [ ] 无敏感信息硬编码
- [ ] 符合 RESTful 规范

### 6.2 Review 通过标准

| 规则类型 | 要求 |
|----------|------|
| 必须修复 | 全部修复后才能合并 |
| 建议修复 | 可选择性修复，需记录原因 |
| 可忽略 | 不影响功能的规范问题 |

### 6.3 问题等级定义

| 等级 | 说明 |
|------|------|
| 严重 | 安全漏洞、类型错误、严重逻辑问题 |
| 中等 | 代码规范问题、性能问题、可维护性问题 |
| 低 | 格式问题、命名建议 |

---

## 七、性能质量门禁

### 7.1 包体积要求

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 分包配置
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-core': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
    // 包体积限制
    chunkSizeWarningLimit: 500, // KB
  },
});
```

### 7.2 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 首屏加载 | ≤ 3s | Lighthouse Performance |
| 包体积 | ≤ 500KB | gzipped |
| 路由懒加载 | 必须 | 使用 defineAsyncComponent |

### 7.3 图片优化

```typescript
// vite.config.ts
export default defineConfig({
  assetsInclude: ['**/*.webp'],
});
```

```vue
<!-- 使用图片优化 -->
<picture>
  <source srcset="/image.webp" type="image/webp" />
  <img src="/image.png" alt="描述" />
</picture>
```

---

## 八、自动化工具配置

### 8.1 ESLint 配置

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    'vue/setup-compiler-macros': true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint',
  ],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
};
```

### 8.2 Prettier 配置

```javascript
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all",
  "arrowParens": "always",
  "vueIndentScriptAndStyle": false
}
```

### 8.3 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

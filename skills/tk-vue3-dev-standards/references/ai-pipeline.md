# AI 自动化执行流水线 — 详细策略

## 目录

- [执行策略总则](#执行策略总则)
- [P0 深度阅读详细规则](#p0-深度阅读详细规则)
- [P4 编译验证详细策略](#p4-编译验证详细策略)
- [自动修复模式库](#自动修复模式库)
- [边界情况处理](#边界情况处理)
- [失败回退策略](#失败回退策略)

---

## 执行策略总则

### 零妥协原则

本流水线不设"跳过"选项。每个阶段的质量门禁是硬性检查点：
- 通过 → 继续下一阶段
- 未通过 → 留在当前阶段修正
- 无法修正 → 向用户报告，等待指示

### 渐进式阅读

不需要在 P0 阶段读取整个项目的所有文件。按任务相关度分层阅读：

**第一层（必读）：** 任务直接涉及的文件
- 要修改的文件本身
- 要修改文件的直接 import 依赖
- 要修改文件的直接 import 消费者

**第二层（按需）：** 任务间接涉及的文件
- 共享类型的定义文件
- 共享组件的接口
- 路由配置中相关部分

**第三层（参考）：** 仅在遇到不明确行为时查看
- 项目的配置文件细节
- 不直接相关的业务模块

### 状态追踪

在整个执行过程中，保持内部状态追踪：

```
当前阶段: P?
已读取文件: [列表]
已识别依赖: [列表]
待处理错误: [列表]
已修复错误: [列表]
已做出的设计决策: [列表]
```

---

## P0 深度阅读详细规则

### 文件阅读深度标准

不同类型的文件需要不同的阅读深度：

| 文件类型 | 阅读深度 | 关注点 |
|----------|----------|--------|
| 将要修改的 `.vue` 文件 | 完整逐行 | 全部逻辑、模板结构、样式 |
| 将要修改的 `.ts` 文件 | 完整逐行 | 全部导出、类型、逻辑 |
| 直接 import 的依赖文件 | 完整读取 | 导出接口、类型签名 |
| 直接消费者文件 | 读取 import 部分和使用部分 | 如何使用当前模块 |
| 类型定义文件 | 完整读取 | 类型结构、扩展关系 |
| 配置文件 | 完整读取 | 约束和规则 |
| 不直接相关的文件 | 不读取 | — |

### 阅读检查清单

每读完一个文件，确认：

```markdown
- [ ] 理解该文件的职责（一句话能说清）
- [ ] 识别了所有导出接口（函数签名、类型、组件 props/emits）
- [ ] 识别了所有外部依赖（import 了什么、为什么 import）
- [ ] 发现了与当前任务相关的设计模式或约定
- [ ] 发现了需要注意的约束或特殊情况
```

### 阅读中发现问题的处理

如果在阅读阶段发现已有代码存在明显问题（bug、安全漏洞、严重性能问题）：

1. **记录但不立即修复** — 除非该问题直接阻塞当前任务
2. **在交付输出的"后续建议"部分列出** — 让用户决定是否处理
3. **如果必须修复才能完成任务** — 在 P2 设计阶段明确标注这是额外变更

---

## P4 编译验证详细策略

### 命令检测与执行

自动检测项目中可用的验证命令：

```bash
# 检测 TypeScript
if [ -f "tsconfig.json" ]; then
  # 优先使用 vue-tsc（对 .vue 文件支持更好）
  if npx vue-tsc --version 2>/dev/null; then
    VERIFY_TS="npx vue-tsc --noEmit"
  else
    VERIFY_TS="npx tsc --noEmit"
  fi
fi

# 检测 ESLint
if [ -f ".eslintrc.*" ] || [ -f "eslint.config.*" ]; then
  VERIFY_LINT="npx eslint"
fi

# 检测构建命令
if grep -q '"build"' package.json; then
  VERIFY_BUILD="npm run build"
fi
```

### 验证执行顺序

```
1. TypeScript 类型检查（最快发现问题）
   └── 通过 → 继续
   └── 失败 → 收集错误，进入修复循环

2. ESLint 检查（代码规范）
   └── 通过 → 继续
   └── 失败 → 收集错误，进入修复循环

3. 构建检查（最终验证）
   └── 通过 → P4 通过
   └── 失败 → 收集错误，进入修复循环
```

### 错误信息解析

**TypeScript 错误解析：**
```
error TS2322: Type 'string' is not assignable to type 'number'
  → 类型不匹配：检查赋值两端的类型定义

error TS2307: Cannot find module '@/utils/format'
  → 导入路径错误：检查文件是否存在、路径别名配置

error TS2739: Type 'X' is missing properties 'a, b'
  → 接口不完整：检查类型定义是否覆盖所有必需字段

error TS2571: Object is of type 'unknown'
  → 需要类型收窄：添加类型守卫或类型断言
```

**ESLint 错误解析：**
```
@typescript-eslint/no-explicit-any
  → 将 any 替换为具体类型

@typescript-eslint/no-unused-vars
  → 移除未使用的变量/导入

vue/no-mutating-props
  → 通过 emit 通知父组件修改，而非直接修改 props

vue/require-v-for-key
  → 为 v-for 添加 :key 绑定

vue/no-v-html
  → 确认内容安全后使用 v-text 或其他方式
```

**构建错误解析：**
```
Import "X" is not exported from "Y"
  → 检查导出语句，确认 named export / default export

Could not resolve "X"
  → 检查文件路径、npm 包是否安装

Unexpected token
  → 检查语法错误、是否缺少插件支持
```

---

## 自动修复模式库

以下是常见错误的自动修复模式：

### 模式 1：类型不匹配

```ts
// 错误：Type 'string' is not assignable to type 'number'
// 根因：API 返回的是字符串数字，需要转换
const count: number = response.count  // 如果 response.count 是 "123"

// 修复：在正确位置转换类型
const count: number = Number(response.count)
```

### 模式 2：导入路径错误

```ts
// 错误：Cannot find module '@/composables/useUser'
// 根因：文件不存在或路径别名未配置

// 修复步骤：
// 1. 确认文件是否存在
// 2. 确认 tsconfig.json 中 paths 配置
// 3. 确认实际文件名大小写
```

### 模式 3：缺失属性

```ts
// 错误：Type '{}' is missing properties 'id', 'name'
// 根因：对象字面量缺少必需属性

// 修复：补全所有必需属性
const user: User = {
  id: '',      // 补全
  name: '',    // 补全
  ...otherProps,
}
```

### 模式 4：Vue 特有错误

```ts
// 错误：Property 'value' does not exist on type 'number'
// 根因：ref 的 .value 忘记加或多余加了

// 在 <script setup> 中：
// ref 在模板中自动解包，不需要 .value
// 在 <script> 中访问 ref 需要 .value

// 修复：检查 ref 使用位置是否正确
```

### 模式 5：组件注册问题

```ts
// 错误：Component "X" is not registered
// 根因：组件导入但未在模板中使用，或未正确导入

// <script setup> 中导入的组件自动注册
// 检查：
// 1. import 路径是否正确
// 2. 组件文件名是否正确
// 3. 组件是否在模板中使用（未使用的导入可能被优化掉）
```

---

## 边界情况处理

### 情况 1：项目无 TypeScript

如果项目是纯 JavaScript：
- 跳过 TypeScript 类型检查步骤
- 仍然需要使用 JSDoc 提供类型信息（如果项目有此约定）
- 构建检查仍然执行

### 情况 2：项目无 ESLint

如果项目没有配置 ESLint：
- 跳过 Lint 检查步骤
- 仍然按照 code-standards.md 的规范编写代码
- 构建检查仍然执行

### 情况 3：构建超时

如果构建时间超过 60 秒：
- 只构建受影响的模块（如果工具支持）
- 或使用类型检查代替完整构建
- 记录构建时间并报告给用户

### 情况 4：循环依赖

如果发现循环依赖：
- 立即停止当前编码
- 分析依赖图，找出循环
- 通过以下方式之一打破循环：
  - 提取共享逻辑到独立文件
  - 使用依赖注入（provide/inject）
  - 重新设计接口，减少不必要的依赖

### 情况 5：第三方库类型缺失

如果第三方库没有类型定义：
```ts
// 创建类型声明文件 src/types/shims.d.ts
declare module 'some-untyped-lib' {
  export function someFunction(param: string): void
  export const someConstant: number
}
```

### 情况 6：修改大文件时

如果要修改的文件超过 300 行：
- 先完整阅读理解
- 在 P2 阶段评估是否应该拆分
- 如果不需要拆分，修改时格外小心不要影响其他逻辑
- 修改后在 P4 做更全面的验证

---

## 失败回退策略

### 修复循环失败（5 轮后仍有错误）

1. 停止修复循环
2. 分析剩余错误，分类：
   - **可解决但需要更多信息** → 向用户提问
   - **项目配置问题** → 报告并建议修复方案
   - **第三方库问题** → 报告并建议替代方案
3. 向用户报告格式：
   ```
   编译验证未完全通过，剩余问题：
   1. [错误描述] — 可能原因：[分析] — 建议处理：[方案]
   2. ...

   已完成的变更仍然保留，您可以选择：
   A. 提供更多信息后我继续修复
   B. 暂时接受当前状态，后续处理
   C. 回退本次变更
   ```

### 设计阶段发现问题

如果在 P2 设计阶段发现需求本身有问题：
- 记录问题
- 向用户说明具体冲突
- 提供替代方案
- 等待用户决策后再继续

### 编码阶段发现设计缺陷

如果在 P3 编码阶段发现 P2 的设计有问题：
- 回退到 P2 重新设计受影响的部分
- 只修改有问题的设计点，不推翻全部设计
- 记录设计变更及其原因
- 重新通过 P2 质量门禁后继续编码

# 质量门禁与自动修复详细规则

## 目录

- [质量门禁体系](#质量门禁体系)
- [P0 门禁：阅读完整性](#p0-门禁阅读完整性)
- [P1 门禁：分析完备性](#p1-门禁分析完备性)
- [P2 门禁：设计合理性](#p2-门禁设计合理性)
- [P3 门禁：编码规范性](#p3-门禁编码规范性)
- [P4 门禁：编译零错误](#p4-门禁编译零错误)
- [P5 门禁：交付完整性](#p5-门禁交付完整性)
- [自动修复决策树](#自动修复决策树)
- [代码优化规则](#代码优化规则)

---

## 质量门禁体系

### 门禁级别定义

| 级别 | 含义 | 未通过时的行为 |
|------|------|---------------|
| BLOCKER | 必须通过，否则禁止推进 | 强制停留在当前阶段 |
| CRITICAL | 强烈建议通过 | 除非用户明确允许跳过 |
| WARNING | 建议优化 | 记录但允许推进，在交付时报告 |

### 全局门禁规则

适用于所有阶段的通用规则：

1. **禁止绕过**：不能通过 `@ts-ignore`、`any`、`// eslint-disable`、`as unknown as X` 等方式绕过门禁
2. **根因修复**：修复根本原因，而非压制症状
3. **最小修复**：修复过程不引入新的重构或功能
4. **验证修复**：每次修复后确认原问题已解决

---

## P0 门禁：阅读完整性

### BLOCKER 级检查

- [ ] **目标文件已完整读取**：所有要修改/新建文件的关联文件已读取
  - 验证方法：能在脑中复现该文件的结构和关键逻辑
  - 未通过时：继续阅读直到理解

- [ ] **调用链已追踪**：至少追踪了一层调用关系
  - 验证方法：知道谁调用了这个文件、这个文件调用了谁
  - 未通过时：用 grep 查找 import 关系

- [ ] **可复用资源已盘点**：已列出可以复用的现有代码
  - 验证方法：有明确的清单
  - 未通过时：继续搜索项目

### CRITICAL 级检查

- [ ] **项目约束已理解**：构建配置、lint 规则、TypeScript strictness
- [ ] **已有模式已识别**：项目中已有的组件模式、状态管理模式、API 模式

---

## P1 门禁：分析完备性

### BLOCKER 级检查

- [ ] **变更范围已明确**：新建文件列表 + 修改文件列表 + 验证文件列表
  - 验证方法：每个文件有明确的变更描述
  - 未通过时：继续分析

- [ ] **无遗漏影响**：所有被修改文件的调用方已识别
  - 验证方法：用 grep 验证每个 import 该文件的地方
  - 未通过时：补充分析

### CRITICAL 级检查

- [ ] **风险评估完成**：识别了潜在破坏性变更
- [ ] **接口变更评估**：如果修改了共享接口，所有消费方已列出

---

## P2 门禁：设计合理性

### BLOCKER 级检查

- [ ] **每个文件有单一职责**：每个新建/修改文件能用一句话描述职责
  - 验证方法：尝试描述，如果需要"和"来连接说明职责过多
  - 未通过时：重新拆分设计

- [ ] **接口设计完整**：props/emits/函数签名/类型导出已定义
  - 验证方法：有明确的类型签名
  - 未通过时：补充接口设计

- [ ] **数据流清晰**：数据从哪里来、到哪里去、中间经过什么处理
  - 验证方法：能画出数据流路径
  - 未通过时：重新梳理数据流

### CRITICAL 级检查

- [ ] **设计决策有理由**：非直觉的选择记录了为什么
- [ ] **与项目模式一致**：设计遵循项目已有的模式，不引入新的范式
- [ ] **组件粒度合理**：没有过大的组件（>200行），没有过细的拆分

### WARNING 级检查

- [ ] **考虑了边界情况**：空数据、加载中、错误、权限不足
- [ ] **考虑了性能**：大数据量、频繁更新、计算密集

---

## P3 门禁：编码规范性

### BLOCKER 级检查

逐文件检查以下禁止项：

```markdown
禁止项扫描清单：
- [ ] 无 any 类型
- [ ] 无 @ts-ignore
- [ ] 无非空断言 !（除非有注释证明安全）
- [ ] 无 v-for + v-if 同元素
- [ ] 无直接修改 props
- [ ] 无 watch 替代 computed 的场景
- [ ] 无硬编码魔法值
- [ ] 无模板复杂表达式（>2 运算符）
- [ ] 无 console.log / debugger
- [ ] 无注释掉的代码
```

逐文件检查以下强制项：

```markdown
强制项扫描清单：
- [ ] props 有 TypeScript interface
- [ ] emits 有类型签名
- [ ] 组件使用 scoped 样式
- [ ] 引用类型 props 默认值用工厂函数
- [ ] API 响应有类型定义
- [ ] 导入按规范分组排序
- [ ] 文件内声明顺序符合规范
```

### CRITICAL 级检查

- [ ] **命名符合规范**：所有变量、函数、组件、文件名
- [ ] **注释规范**：注释只解释 why，不重复 what
- [ ] **无重复代码**：同一逻辑出现不超过一次
- [ ] **组件职责单一**：一个组件只做一件事
- [ ] **最小改动**：修改已有文件时只改了必要的行

### 代码审查细节

**导入检查：**
```ts
// 好：分组、有序（type 导入在最前）
import type { UserInfo } from '@/types'                     // 1. 类型导入（type 关键字）
import { ref, computed, onMounted } from 'vue'              // 2. Vue 核心
import { useRouter } from 'vue-router'                      // 3. Vue 生态
import { someLib } from 'third-party'                       // 4. 第三方库
import { useAuth } from '@/composables/useAuth'             // 5. 内部 composables
import { formatDate } from '@/utils/format'                 // 6. 内部 utils
import UserAvatar from '@/shared/components/UserAvatar.vue' // 7. 内部组件
```

**模板检查：**
```vue
<!-- 检查：属性是否超过 2 个就换行 -->
<SimpleComp value="ok" />

<ComplexComp
  :value="foo"
  :label="bar"
  :disabled="isDisabled"
  @change="handleChange"
/>

<!-- 检查：v-for 是否有稳定的 key -->
<div v-for="item in list" :key="item.id">

<!-- 检查：是否处理了所有状态 -->
<template v-if="loading">骨架屏/loading</template>
<template v-else-if="error">错误提示</template>
<template v-else-if="list.length === 0">空状态</template>
<template v-else>正常内容</template>
```

**响应式检查：**
```ts
// 检查：ref 在 script 中是否用了 .value
const count = ref(0)
console.log(count.value)  // 正确，script 中需要 .value

// 检查：reactive 是否被解构（会丢失响应式）
const state = reactive({ count: 0 })
const { count } = state  // 错误！count 不是响应式的
// 应该用 toRefs：const { count } = toRefs(state)

// 检查：computed 是否有副作用
const fullName = computed(() => {
  console.log('computed')  // 错误！computed 不应有副作用
  return `${first.value} ${last.value}`
})
```

---

## P4 门禁：编译零错误

### BLOCKER 级检查

- [ ] **TypeScript 零错误**
  ```
  npx vue-tsc --noEmit  # 或 npx tsc --noEmit
  # 期望输出：无错误
  ```

- [ ] **ESLint 零错误**
  ```
  npx eslint src/ --ext .vue,.ts,.tsx
  # 期望输出：无错误（警告可接受）
  ```

- [ ] **构建成功**
  ```
  npm run build
  # 期望输出：构建完成，无错误
  ```

### 修复循环详细规则

```
循环计数器 = 0
最大循环 = 5

WHILE 存在 BLOCKER 错误 AND 循环计数器 < 最大循环:
    循环计数器 += 1

    // 步骤 1：收集错误
    错误列表 = 执行验证命令收集所有错误

    IF 错误列表为空:
        BREAK  // 全部通过，退出循环

    // 步骤 2：分类错误
    FOR 每个错误:
        IF 是本次变更引起的:
            标记为 "必须修复"
        ELSE IF 是已有的项目错误:
            标记为 "记录但跳过"（除非阻塞构建）

    // 步骤 3：按文件分组
    按文件路径分组错误，同文件错误一起处理

    // 步骤 4：修复
    FOR 每组错误（按致命程度排序）:
        分析根因
        应用最小修复
        验证修复未引入新问题

    // 步骤 5：重新验证
    执行验证命令

IF 循环计数器 >= 最大循环 AND 仍有错误:
    向用户报告详细错误信息和修复建议
    等待用户指示
```

### 区分新旧错误

在修复循环中，需要区分：
- **新引入的错误**：由本次变更引起的，必须修复
- **项目已有错误**：本次变更之前就存在的

区分方法：
1. 记住修复前的错误基线
2. 新出现的错误一定是本次引入的
3. 已有的错误如果被本次变更加剧，也需要处理

---

## P5 门禁：交付完整性

### BLOCKER 级检查

- [ ] **功能完整**：P2 设计的所有功能点已实现
- [ ] **变更对齐**：实际变更与 P1 的变更范围一致
- [ ] **无遗留 TODO**：没有未完成的临时代码

### CRITICAL 级检查

- [ ] **无回归**：已有功能不受影响
- [ ] **类型安全**：无隐式 any、无不安全断言
- [ ] **错误处理完整**：加载态、空态、错误态都已处理
- [ ] **样式一致**：与项目整体风格一致

### WARNING 级检查

- [ ] **可访问性**：语义化标签、ARIA 属性（如需要）
- [ ] **性能合理**：无明显的性能瓶颈
- [ ] **代码精简**：无冗余代码

---

## 自动修复决策树

```
发现错误
├── TypeScript 错误
│   ├── 类型不匹配
│   │   ├── 是 API 返回类型问题？→ 修正类型定义或添加转换
│   │   ├── 是 props 类型问题？→ 检查父组件传值类型
│   │   ├── 是赋值类型问题？→ 检查两端类型，修正不正确的一端
│   │   └── 是泛型推断失败？→ 添加显式类型参数
│   │
│   ├── 找不到模块
│   │   ├── 文件不存在？→ 检查路径，创建文件或修正路径
│   │   ├── 路径别名问题？→ 检查 tsconfig/vite 配置
│   │   └── 第三方库？→ 检查是否安装，安装类型包 @types/xxx
│   │
│   └── 缺失属性
│       ├── 接口不完整？→ 补全缺失属性
│       ├── 应该是可选的？→ 添加 ? 标记
│       └── 类型定义有误？→ 修正类型定义
│
├── ESLint 错误
│   ├── no-explicit-any → 替换为具体类型
│   ├── no-unused-vars → 移除未使用的变量/导入
│   ├── no-mutating-props → 改用 emit
│   ├── require-v-for-key → 添加 :key
│   └── 其他 → 根据 lint 规则描述修正
│
└── 构建错误
    ├── 导入错误 → 检查导出方式（named vs default）
    ├── 语法错误 → 检查拼写、括号、分号
    └── 插件错误 → 检查插件配置和版本
```

---

## 代码优化规则

在 P4 验证通过后、P5 审查阶段，对代码做最终优化（仅在安全的前提下）：

### 优化 1：简化响应式

```ts
// 如果一个 ref 的值永远不会变化，不需要 ref
const title = ref('固定标题')      // 不需要响应式
const title = '固定标题'           // 直接用常量

// 如果一个 computed 依赖是静态的，不需要 computed
const label = computed(() => '固定文案')  // 不需要 computed
const label = '固定文案'                   // 直接用常量
```

### 优化 2：简化 watch + immediate 模式

```ts
// 优化前：watch + immediate 用于初始化，但后续也需要响应变化
watch(id, (newId) => {
  fetchData(newId)
}, { immediate: true })

// 如果只在初始化时获取一次，不需要 watch
onMounted(() => {
  fetchData(id.value)
})

// 如果需要持续响应 id 变化，watch 是正确的，保持不变
// 但可以将 watch 封装进 composable，让调用方更简洁
function useData(id: Ref<string>) {
  const data = ref(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      data.value = await fetchData(id.value)
    } finally {
      loading.value = false
    }
  }

  watch(id, fetch, { immediate: true })
  return { data, loading, refresh: fetch }
}
```

### 优化 3：模板简化

```vue
<!-- 优化前：冗长的条件 -->
<div v-if="loading === true">
<div v-else-if="loading === false && data.length === 0">
<div v-else-if="loading === false && data.length > 0">

<!-- 优化后：清晰的状态判断 -->
<div v-if="loading">
<div v-else-if="isEmpty">
<div v-else>

<!-- 计算属性辅助 -->
const isEmpty = computed(() => !loading.value && data.value.length === 0)
```

### 优化 4：导入精简

```ts
// 移除未使用的导入
import { ref, computed, watch } from 'vue'  // 如果 watch 没用到
import { ref, computed } from 'vue'          // 只导入用到的

// 使用 type 关键字区分类型导入
import type { UserInfo } from '@/types'      // 类型导入用 type
```

### 优化原则

- **安全第一**：优化不能改变行为
- **可测量**：优化后代码更短、更清晰、或性能更好（至少一项）
- **不过度**：不为了优化而优化，只优化有明显收益的地方

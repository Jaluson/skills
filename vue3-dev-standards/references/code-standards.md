# Vue 3 代码规范 — 严格生产级

## 目录

- [文件结构规范](#文件结构规范)
- [命名规范](#命名规范)
- [TypeScript 严格规范](#typescript-严格规范)
- [注释规范](#注释规范)
- [模板规范](#模板规范)
- [样式规范](#样式规范)
- [禁止模式清单（红线）](#禁止模式清单红线)
- [强制模式清单（底线）](#强制模式清单底线)
- [自动修复参考](#自动修复参考)

---

## 文件结构规范

### Vue SFC 内部顺序

```vue
<script setup lang="ts">
// ─── 1. 类型导入 ───
import type { UserInfo, LoginParams } from '@/types'

// ─── 2. 外部依赖导入 ───
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// ─── 3. 内部依赖导入 ───
import { useAuth } from '@/composables/useAuth'
import { formatDate } from '@/utils/format'
import UserAvatar from '@/shared/components/UserAvatar.vue'

// ─── 4. Props 定义 ───
interface Props {
  userId: string
  editable?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  editable: false,
})

// ─── 5. Emits 定义 ───
const emit = defineEmits<{
  (e: 'save', data: UserInfo): void
  (e: 'cancel'): void
}>()

// ─── 6. 响应式状态 ───
const loading = ref(false)
const form = reactive({ name: '', email: '' })

// ─── 7. 计算属性 ───
const fullName = computed(() => `${form.firstName} ${form.lastName}`)
const isValid = computed(() => form.name.length > 0)

// ─── 8. 侦听器 ───
watch(() => props.userId, fetchUser)

// ─── 9. 生命周期钩子 ───
onMounted(() => { fetchUser() })

// ─── 10. 方法和函数 ───
async function fetchUser() { /* ... */ }
function handleSubmit() { /* ... */ }
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 导入分组规则

```
第一组：type-only 导入（import type）
第二组：Vue 核心库（vue, vue-router, pinia）
第三组：第三方库（axios, lodash-es, dayjs 等）
第四组：内部 composables / hooks
第五组：内部 utils / api
第六组：内部组件（.vue 文件）
第七组：内部类型（如果没在第一组导入）
```

每组之间空一行。组内按字母顺序排列。

---

## 命名规范

### 文件命名

| 类型 | 格式 | 示例 | 说明 |
|------|------|------|------|
| 页面组件 | PascalCase + View | `UserListView.vue` | 以 View 结尾标识页面 |
| 业务组件 | PascalCase | `OrderCard.vue` | |
| 通用组件 | PascalCase | `DataTable.vue` | |
| 布局组件 | PascalCase + Layout | `DefaultLayout.vue` | 以 Layout 结尾 |
| Composable | camelCase + use 前缀 | `useAuth.ts` | 必须以 use 开头 |
| 工具函数 | camelCase | `formatDate.ts` | |
| Store | camelCase | `user.ts` | 对应 store 名 |
| 类型文件 | camelCase | `types.ts` 或 `user.types.ts` | |
| 常量文件 | camelCase | `constants.ts` | |
| 测试文件 | 源文件名 + .test | `useAuth.test.ts` | |

### 代码命名

| 类型 | 格式 | 示例 | 约束 |
|------|------|------|------|
| 组件变量 | PascalCase | `const UserCard` | 与文件名一致 |
| 函数/方法 | camelCase | `function handleSubmit()` | 动词开头 |
| 变量 | camelCase | `const userList` | 名词 |
| 常量 | UPPER_SNAKE_CASE | `const MAX_RETRY = 3` | 全大写 |
| 布尔变量 | is/has/should/can 前缀 | `isLoading` `hasPermission` | |
| 事件处理函数 | handle/on 前缀 | `handleClick` `onSubmit` | |
| Ref 变量 | 与数据同名 | `const count = ref(0)` | 不加 Ref 后缀 |
| 私有变量 | _ 前缀（可选） | `_internalState` | 仅在必要时使用 |
| CSS 类名 | kebab-case / BEM | `user-card__name--active` | |
| 事件名 | kebab-case | `@item-click` `@update:model-value` | |
| CSS 变量 | --前缀 + kebab-case | `--color-primary` | |

### 命名禁止项

- 禁止单字母变量（循环计数器 `i` 除外）
- 禁止缩写（除非是行业通用缩写如 `url`、`id`、`api`）
- 禁止使用保留字或与 Vue API 重名（如 `ref`、`computed`、`watch` 作为变量名）
- 禁止无意义的前缀/后缀（如 `IUserInfo` 接口前缀、`UserClass` 类后缀）

---

## TypeScript 严格规范

### 接口 vs 类型

```ts
// 优先使用 interface（可扩展、可声明合并）
interface UserInfo {
  id: string
  name: string
  email: string
}

// 使用 type 的场景：
type Status = 'active' | 'inactive' | 'pending'           // 联合类型
type Nullable<T> = T | null                                 // 工具类型
type UserWithRole = UserInfo & { role: Role }               // 交叉类型
type EventHandler<T> = (event: T) => void                   // 函数类型
```

### Props 类型定义规范

```ts
// 好：使用泛型 defineProps + interface
interface Props {
  title: string
  items: MenuItem[]
  loading?: boolean
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  maxVisible: 10,
  // 引用类型必须用工厂函数
  items: () => [],
})

// 坏：使用运行时声明（无类型推导）
defineProps({
  title: String,
  items: Array,
})

// 坏：使用 any
defineProps<{
  data: any
}>()
```

### Emits 类型定义规范

```ts
// 好：类型签名完整，载荷类型明确
const emit = defineEmits<{
  (e: 'update', id: string, data: FormData): void
  (e: 'delete', id: string): void
  (e: 'change', value: string): void
}>()

// 坏：无类型
defineEmits(['update', 'delete'])

// 坏：载荷类型为 any
defineEmits<{
  (e: 'update', data: any): void
}>()
```

### 泛型组件

```vue
<!-- 当组件需要支持多种数据类型时 -->
<script setup lang="ts" generic="T extends { id: string }">
interface Props {
  items: T[]
  selected?: T
  labelKey?: keyof T
}

withDefaults(defineProps<Props>(), {
  labelKey: 'name' as keyof T,
})

const emit = defineEmits<{
  (e: 'select', item: T): void
  (e: 'update:selected', item: T | undefined): void
}>()
</script>
```

### API 类型定义

```ts
// types/api.ts — 通用 API 响应类型
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>

// types/user.ts — 具体业务类型
interface UserInfo {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  createdAt: string
}

enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

// API 请求参数类型
interface LoginParams {
  username: string
  password: string
  remember?: boolean
}

interface UserListParams {
  page: number
  pageSize: number
  keyword?: string
  role?: UserRole
}
```

---

## 注释规范

### 核心原则

**代码说明"做什么"，注释解释"为什么"。**

不需要注释的代码才是目标。好命名 + 好结构 > 注释。

### 需要注释的场景（仅 5 种）

**1. 非直觉的业务逻辑**

```ts
// 试用期用户不展示升级入口，避免转化路径中断
if (user.trialDays <= 30) return
```

**2. Workaround 或临时方案**

```ts
// 后端 API 返回时间戳缺少时区，前端补充 UTC+8（JIRA-1234，下版本后端修复）
const timestamp = `${response.time}+08:00`
```

**3. 复杂算法的一行概述**

```ts
// 双指针合并有序数组，O(m+n)
function merge(a: number[], b: number[]) { /* ... */ }
```

**4. 公共 API 的 JSDoc**

```ts
/**
 * 将树形结构展平为一维数组
 * @param tree 树形数据
 * @param childrenKey 子节点字段名
 */
export function flattenTree<T>(tree: T[], childrenKey = 'children'): T[] { /* ... */ }
```

**5. 技术决策记录**

```ts
// 使用 Map 而非 Object：需要保证插入顺序 + key 可能为数字
const cache = new Map<string, CacheItem>()
```

### 禁止的注释

```ts
// 禁止：重复代码含义
// 获取用户列表
const users = await getUserList()

// 禁止：注释掉的代码（用 git 管理历史，不要在代码中留注释代码）
// const oldWay = doSomething()
// if (oldWay) { ... }

// 禁止：分隔线注释
// ================== 工具函数 ==================

// 禁止：无意义的 TODO
// TODO: fix this later
```

### TODO 格式规范

```ts
// TODO: 添加虚拟滚动支持（当列表超 100 条时性能下降）— @jaluson 2024-04
// FIXME: Safari 日期解析兼容问题 — #5678
// HACK: 临时绕过后端格式不一致，v2 API 上线后移除
```

---

## 模板规范

### 指令简写

```vue
<!-- 用 : 不用 v-bind: -->
<img :src="avatarUrl" />

<!-- 用 @ 不用 v-on: -->
<button @click="handleSubmit">Submit</button>

<!-- 用 # 不用 v-slot: -->
<template #header>...</template>
```

### 表达式规则

```vue
<!-- 模板中最多两个运算符，超过则提取 computed -->
<!-- 好的：简单表达式 -->
<div :class="{ active: isActive }">
<span>{{ user.name }}</span>

<!-- 坏的：复杂表达式 -->
<div :class="is_active && !is_deleted && status === 'pending' ? 'active' : 'inactive'">

<!-- 好的：提取 computed -->
<div :class="statusClass">
```

### 多属性换行

```vue
<!-- ≤2 个属性可以一行 -->
<SimpleComp :value="foo" />

<!-- >2 个属性必须换行 -->
<ComplexComp
  :value="foo"
  :label="bar"
  :disabled="isDisabled"
  @change="handleChange"
/>
```

### 条件渲染顺序

```vue
<!-- 标准顺序：v-if → v-else-if → v-else -->
<div v-if="loading">加载中</div>
<div v-else-if="error">错误</div>
<div v-else-if="isEmpty">空</div>
<div v-else>内容</div>
```

### v-for 规范

```vue
<!-- 必须有 :key，使用唯一标识而非 index -->
<div v-for="item in items" :key="item.id">

<!-- 禁止 v-for 和 v-if 在同一元素 -->
<!-- 坏 -->
<div v-for="item in list" v-if="item.active" :key="item.id">

<!-- 好：先过滤 -->
<div v-for="item in activeItems" :key="item.id">
```

---

## 样式规范

### Scoped CSS + BEM

```vue
<style scoped>
/* 块 */
.user-card {
  padding: 16px;
  border-radius: 8px;
}

/* 元素 */
.user-card__avatar {
  width: 48px;
  height: 48px;
}

.user-card__name {
  font-size: 16px;
  font-weight: 600;
}

/* 修饰符 */
.user-card--featured {
  border: 2px solid var(--color-primary);
}

.user-card__name--highlight {
  color: var(--color-primary);
}
</style>
```

### 样式规则

- 组件样式默认 `scoped`
- 全局样式只在 `styles/` 目录定义
- 使用 CSS 变量管理主题值，禁止硬编码颜色/间距
- 避免使用 `:deep()`，如果需要说明组件边界设计有问题
- Tailwind 项目中优先 utility classes，复杂样式用 `@apply`

### CSS 变量命名规范

所有可复用的视觉值必须定义为 CSS 变量，禁止在组件中硬编码。

#### 变量命名规则

```
--{类别}-{属性}-{变体}
```

| 类别 | 前缀 | 示例 |
|------|------|------|
| 颜色 | `color` | `--color-primary`, `--color-text-secondary`, `--color-bg-page` |
| 间距 | `spacing` | `--spacing-xs`, `--spacing-md`, `--spacing-xl` |
| 字号 | `font` | `--font-size-sm`, `--font-size-lg` |
| 圆角 | `radius` | `--radius-sm`, `--radius-lg`, `--radius-round` |
| 阴影 | `shadow` | `--shadow-sm`, `--shadow-md` |
| 层级 | `z` | `--z-dropdown`, `--z-modal`, `--z-toast` |
| 过渡 | `transition` | `--transition-fast`, `--transition-normal` |

#### 变量文件组织

```css
/* styles/variables.css — 设计 token 定义 */

:root {
  /* ── 颜色体系 ── */
  --color-primary: #409eff;
  --color-primary-light: #66b1ff;
  --color-primary-dark: #3a8ee6;

  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;
  --color-info: #909399;

  /* 文字颜色 */
  --color-text-primary: #303133;
  --color-text-regular: #606266;
  --color-text-secondary: #909399;
  --color-text-placeholder: #c0c4cc;

  /* 背景颜色 */
  --color-bg-page: #f2f3f5;
  --color-bg-card: #ffffff;
  --color-bg-overlay: rgba(0, 0, 0, 0.5);

  /* 边框颜色 */
  --color-border: #dcdfe6;
  --color-border-light: #e4e7ed;

  /* ── 间距体系 ── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* ── 字号体系 ── */
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-xxl: 20px;
  --font-size-title: 24px;

  /* ── 圆角体系 ── */
  --radius-sm: 2px;
  --radius-base: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-round: 50%;

  /* ── 阴影体系 ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* ── 层级体系 ── */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-modal: 1050;
  --z-toast: 1100;

  /* ── 过渡体系 ── */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.35s ease;
}
```

#### 使用规则

```css
/* 好：使用变量 */
.card {
  padding: var(--spacing-base);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

/* 禁止：硬编码 */
.card {
  padding: 16px;           /* 应该用 --spacing-base */
  border-radius: 8px;      /* 应该用 --radius-md */
  color: #303133;          /* 应该用 --color-text-primary */
  font-size: 14px;         /* 应该用 --font-size-base */
}
```

#### 与 UI 框架的协作

使用 UI 框架（Element Plus / Ant Design Vue / Naive UI）时：

- **UI 框架组件**：直接使用框架的 token/变量覆盖机制（如 Element Plus 的 CSS 变量覆盖）
- **自定义组件**：使用上述项目级 CSS 变量，保持与 UI 框架视觉一致
- **禁止混用**：不要在一个组件中同时使用项目变量和硬编码值

```css
/* Element Plus 主题覆盖示例 */
:root {
  --el-color-primary: var(--color-primary);
  --el-border-radius-base: var(--radius-base);
}
```

---

## 禁止模式清单（红线）

以下模式**绝对禁止**出现在生产代码中。发现时必须立即修复。

### 禁止 1：any 类型

```ts
// 禁止
function process(data: any) { }
const result: any = response
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// 正确
function process(data: unknown) { }
const result: ApiResponse<UserInfo> = response
```

### 禁止 2：@ts-ignore

```ts
// 禁止
// @ts-ignore
user.name = 'test'

// 如果确实需要（极少数情况）
// @ts-expect-error 第三方库 @types/xxx 缺失此属性，已提 issue #1234
```

### 禁止 3：非空断言（除非有证明）

```ts
// 禁止
const name = user!.name
const el = document.querySelector('.box')!

// 正确
const name = user?.name ?? 'unknown'
const el = document.querySelector('.box')
if (!el) return
```

### 禁止 4：直接修改 props

```ts
// 禁止
props.list.push(newItem)
props.count++

// 正确
emit('update:list', [...props.list, newItem])
emit('update:count', props.count + 1)
```

### 禁止 5：v-for + v-if 同元素

```vue
<!-- 禁止 -->
<div v-for="item in list" v-if="item.active" :key="item.id">

<!-- 正确：computed 过滤 -->
<div v-for="item in activeItems" :key="item.id">
```

### 禁止 6：watch 替代 computed

```ts
// 禁止
watch(source, (val) => {
  result.value = val * 2
})

// 正确
const result = computed(() => source.value * 2)
```

### 禁止 7：硬编码魔法值

```ts
// 禁止
if (status === 3) { }
if (role === 'admin') { }
const timeout = 5000

// 正确
if (status === OrderStatus.SHIPPED) { }
if (role === UserRole.ADMIN) { }
const REQUEST_TIMEOUT = 5000
```

### 禁止 8：console.log / debugger

```ts
// 禁止（调试完成后必须移除）
console.log('debug', data)
console.warn('todo')
debugger
```

### 禁止 9：注释掉的代码

```ts
// 禁止（用 git 管理历史）
// const oldLogic = doSomething()
// if (oldLogic) { ... }
```

### 禁止 10：隐式 any

```ts
// 禁止
function handle(data) { }           // 参数隐式 any
const items = ref([])               // ref 隐式 any[]
const result = computed(() => x)    // computed 返回值未推导

// 正确
function handle(data: UserInfo) { }
const items = ref<User[]>([])
```

---

## 强制模式清单（底线）

以下模式**必须存在**，缺少时补齐后再进入下一阶段。

### 强制 1：Props 有类型

```ts
// 每个 props 必须有 interface
interface Props {
  /* 每个字段有类型 */
}
```

### 强制 2：Emits 有签名

```ts
const emit = defineEmits<{
  (e: 'eventName', payload: SpecificType): void
}>()
```

### 强制 3：引用类型默认值用工厂函数

```ts
withDefaults(defineProps<Props>(), {
  items: () => [],           // 数组：工厂函数
  config: () => ({}),        // 对象：工厂函数
  count: 0,                  // 基本类型：直接值
})
```

### 强制 4：API 响应完整类型

```ts
// 每个 API 调用有返回类型
export function getUsers(): Promise<PaginatedResult<UserInfo>> {
  return http.get('/users')
}
```

### 强制 5：组件 scoped 样式

```vue
<style scoped>
/* 默认 scoped */
</style>
```

---

## 自动修复参考

### 常见 TS 错误快速修复

| 错误码 | 常见原因 | 修复方法 |
|--------|----------|----------|
| TS2322 | 类型不匹配 | 检查赋值两端类型，在正确端修正 |
| TS2307 | 找不到模块 | 检查文件路径、tsconfig paths 配置 |
| TS2739 | 缺失属性 | 补全必需属性或将属性标为可选 |
| TS2571 | unknown 类型 | 添加类型守卫或类型断言 |
| TS2345 | 参数类型错误 | 检查函数签名和实际参数 |
| TS2322 | ref 赋值类型 | 检查 ref 泛型参数是否正确 |
| TS2769 | 函数重载不匹配 | 检查 defineEmits 签名 |

### ESLint 常见问题快速修复

| 规则 | 修复 |
|------|------|
| no-explicit-any | 替换为具体类型或 unknown |
| no-unused-vars | 移除未使用的变量/导入 |
| no-mutating-props | 改用 emit 通知父组件 |
| require-v-for-key | 添加 :key 绑定 |
| no-v-html | 改用 v-text 或确认安全性后添加 eslint-disable 注释 |
| prefer-const | 改 let 为 const（如果不会被重新赋值） |
| no-console | 移除 console.log 或替换为正式日志 |

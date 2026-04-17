# Vue 3 生产级架构设计

## 目录

- [架构决策框架](#架构决策框架)
- [项目规模自适应](#项目规模自适应)
- [模块边界契约](#模块边界契约)
- [分层架构严格规则](#分层架构严格规则)
- [路由设计](#路由设计)
- [API 层设计](#api-层设计)
- [状态管理架构](#状态管理架构)
- [错误边界设计](#错误边界设计)
- [性能基线](#性能基线)

---

## 架构决策框架

架构决策不是拍脑袋，每一步都有明确的判断标准。

### 决策原则（按优先级排序）

1. **一致性 > 优选** — 进入已有项目时，遵循已有模式比引入"更好"的模式更重要
2. **简单 > 完备** — 当前不需要的结构不要提前搭建
3. **局部 > 全局** — 状态优先放在最近的公共祖先，不往全局提升
4. **显式 > 隐式** — 依赖关系通过 import/props 明确声明，不用魔法字符串或全局注册

### 架构决策记录模板

每个非平凡的架构决策都应记录（可放在代码注释或 ADR 文档中）：

```
决策：[选择了什么]
背景：[为什么需要做这个决策]
选项：[考虑了哪些方案]
理由：[为什么选择当前方案]
代价：[这个决策的约束和局限]
```

---

## 项目规模自适应

### 规模判定标准

在 P0 阶段通过以下指标判定项目规模：

| 指标 | 小型 | 中型 | 大型 |
|------|------|------|------|
| 页面数量 | ≤5 | 5-20 | 20+ |
| 组件数量 | ≤20 | 20-80 | 80+ |
| 开发者 | 1-2 | 2-5 | 5+ |
| 业务域 | 单一 | 3-6 个模块 | 6+ 个模块 |
| 状态复杂度 | 简单 | 需要状态管理 | 需要分模块状态管理 |

判定后自动选择对应的架构模式。规则：**宁可低一级也不要过度设计**。

### 小型项目架构

```
src/
├── components/          # 所有共享组件，扁平组织
│   ├── AppHeader.vue
│   └── UserAvatar.vue
├── composables/         # 所有共享逻辑
│   └── useAuth.ts
├── views/               # 页面组件
│   ├── HomeView.vue
│   └── ProfileView.vue
├── router/
│   └── index.ts
├── stores/              # Pinia stores（按需引入）
│   └── user.ts
├── api/                 # API 请求函数
│   └── user.ts
├── types/               # TypeScript 类型定义
│   └── index.ts
├── utils/               # 工具函数
│   └── format.ts
├── styles/              # 全局样式
│   └── global.css
├── App.vue
└── main.ts
```

**约束规则：**
- 组件 ≤20 个时 `components/` 不建子目录
- 状态管理只在跨 2 个以上组件共享时才引入 Pinia
- API 层按后端资源分文件即可，不做更多拆分
- `types/` 放一个 `index.ts`，全部类型集中定义

### 中型项目架构

```
src/
├── features/                # 按业务功能模块组织
│   ├── auth/
│   │   ├── components/      # 登录表单、注册表单等
│   │   ├── composables/     # useAuth, useLogin
│   │   ├── api/             # 认证相关 API
│   │   ├── types.ts         # 认证相关类型
│   │   └── index.ts         # 模块公共导出（其他模块只能通过此文件访问）
│   ├── user/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── api/
│   │   ├── types.ts
│   │   └── index.ts
│   └── dashboard/
├── shared/                  # 跨功能模块共享
│   ├── components/          # 通用 UI 组件
│   ├── composables/         # 通用逻辑
│   ├── utils/               # 工具函数
│   └── constants.ts         # 共享常量
├── router/
│   └── index.ts             # 路由配置，从各 feature 导入
├── stores/                  # 全局状态（仅真正全局的）
│   └── app.ts
├── types/                   # 全局类型
│   └── global.d.ts
├── styles/                  # 全局样式和主题
├── App.vue
└── main.ts
```

**约束规则：**
- 每个 feature 必须有 `index.ts`，只导出其他模块需要的接口
- feature 之间**禁止**直接 import 内部文件，只通过 `index.ts` 通信
- `shared/` 只放被 2 个以上 feature 使用的代码，1 个 feature 用到的留在 feature 内
- 全局 store 只放应用级状态（当前用户、主题、全局加载状态）

### 大型项目架构

```
src/
├── modules/                 # 业务模块
│   ├── auth/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── stores/          # 模块专属 store
│   │   ├── api/
│   │   ├── types/
│   │   ├── routes.ts        # 模块路由定义
│   │   └── index.ts         # 模块公共接口
│   └── ...
├── shared/                  # 共享层
│   ├── components/          # 通用 UI 组件库（按功能分组）
│   │   ├── form/
│   │   ├── table/
│   │   └── feedback/
│   ├── composables/         # 通用逻辑
│   ├── directives/          # 自定义指令
│   ├── plugins/             # 插件
│   ├── utils/
│   └── types/
├── layouts/                 # 布局组件
│   ├── DefaultLayout.vue
│   └── AuthLayout.vue
├── router/
│   ├── guards/              # 路由守卫
│   └── index.ts             # 聚合各模块路由
├── stores/                  # 全局状态
├── styles/
├── App.vue
└── main.ts
```

**约束规则：**
- 模块间通过 store 或事件通信，**禁止**直接导入其他模块内部
- 每个模块有独立的 store，不与其他模块共享 store 文件
- 路由由各模块定义，`router/index.ts` 只做聚合
- 布局组件独立管理，页面通过路由 meta 指定布局

---

## 模块边界契约

### index.ts 导出规则

```ts
// features/auth/index.ts

// 导出：其他模块可能需要的 composable
export { useAuth } from './composables/useAuth'

// 导出：其他模块可能需要的类型（用 type 关键字）
export type { LoginParams, UserInfo, UserRole } from './types'

// 导出：其他模块可能需要的常量
export { USER_ROLES } from './constants'

// 禁止导出：
// - 内部组件（LoginForm, RegisterForm 等）
// - 内部 API 函数
// - 内部工具函数
// - 模块私有类型
```

### 跨模块访问验证

在 P5 审查阶段，验证所有跨模块 import：

```bash
# 检查是否有模块直接访问了其他模块的内部
# 应该通过 index.ts 公共接口访问
grep -r "from '@/features/[^/]*/components" src/features/
grep -r "from '@/features/[^/]*/api" src/features/
grep -r "from '@/modules/[^/]*/components" src/modules/
```

如果发现违规导入，必须修正为通过公共接口访问。

---

## 分层架构严格规则

### 依赖方向（单向，禁止反向）

```
视图层 (Components/Vue)
  ↓ 可调用
业务逻辑层 (Composables)
  ↓ 可调用
数据层 (API/Store)
  ↓ 可调用
基础设施层 (HTTP/Utils)

禁止反向调用：
- API 层不能 import 组件
- API 层不能 import composable
- Composable 不能 import 组件
- Store 不能 import 组件
```

### 每层的职责边界

**视图层（Components）**
- 渲染 UI
- 处理用户交互事件
- 调用 composable 获取/操作数据
- **禁止**：直接调用 API、直接操作 localStorage、包含业务逻辑

**业务逻辑层（Composables）**
- 管理业务状态（ref/computed）
- 协调 API 调用
- 实现业务规则
- **禁止**：操作 DOM、import 组件、感知 UI 状态（如"当前是否弹窗"）

**数据层（API/Store）**
- API 层：封装 HTTP 请求和响应转换
- Store：跨组件全局状态管理
- **禁止**：包含业务逻辑（如条件判断、数据转换应在 composable 中）

**基础设施层（Utils/HTTP）**
- 通用工具函数
- HTTP 实例和拦截器
- **禁止**：依赖任何业务代码

### 层间数据传递规则

```
API → Composable：
  API 返回原始数据或简单转换后的数据
  Composable 接收并管理为响应式状态

Composable → Component：
  Composable 返回 { 状态, 计算属性, 操作方法 }
  Component 通过解构使用，按需取用

Component → Composable：
  Component 通过调用 composable 方法传递用户操作
  不传递 UI 状态（如 DOM 元素、事件对象）
```

---

## 路由设计

### 路由文件组织

```ts
// 小型项目：router/index.ts 直接定义
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/user/:id',
    component: () => import('@/views/UserDetailView.vue'),
    props: true,  // 路由参数自动作为 props 传入
  },
]

// 大型项目：各模块定义路由，router/index.ts 聚合
// modules/auth/routes.ts
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('./components/LoginPage.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
]

// router/index.ts
import { authRoutes } from '@/modules/auth/routes'
import { dashboardRoutes } from '@/modules/dashboard/routes'

const routes: RouteRecordRaw[] = [
  ...authRoutes,
  ...dashboardRoutes,
]
```

### 路由守卫规则

```ts
// router/guards/auth.ts
// 守卫只做权限判断和重定向，不包含复杂业务逻辑
export function setupAuthGuard(router: Router) {
  router.beforeEach((to) => {
    const { isLoggedIn } = useAuth()

    if (to.meta.requiresAuth && !isLoggedIn.value) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }
  })
}
```

守卫设计规则：
- 每个守卫只做一件事（认证、权限、数据预加载）
- 守卫不直接调用 API，通过 composable 间接调用
- 守卫中的逻辑要快，避免阻塞导航

---

## API 层设计

### HTTP 实例

```ts
// utils/http.ts
import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 请求拦截：附加认证信息
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误处理
http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // token 过期，清理并跳转登录
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }
    return Promise.reject(error)
  }
)
```

### API 函数编写规范

```ts
// api/order.ts
// 一个 API 文件对应一个后端资源

import { http } from '@/utils/http'
import type {
  Order,
  CreateOrderParams,
  UpdateOrderParams,
  OrderListParams,
  PaginatedResult,
} from '@/types/order'

// 查询类：GET
export function getOrders(params: OrderListParams): Promise<PaginatedResult<Order>> {
  return http.get('/orders', { params })
}

export function getOrder(id: string): Promise<Order> {
  return http.get(`/orders/${id}`)
}

// 创建类：POST
export function createOrder(data: CreateOrderParams): Promise<Order> {
  return http.post('/orders', data)
}

// 更新类：PATCH（部分更新）
export function updateOrder(id: string, data: UpdateOrderParams): Promise<Order> {
  return http.patch(`/orders/${id}`, data)
}

// 删除类：DELETE
export function deleteOrder(id: string): Promise<void> {
  return http.delete(`/orders/${id}`)
}
```

API 函数规则：
- 函数名用动词开头：`get`/`create`/`update`/`delete`/`search`
- 参数和返回值都有完整类型定义
- 不包含任何业务逻辑（判断、转换等）
- URL 路径参数用模板字符串，查询参数用 params 对象

### 业务错误处理策略

HTTP 拦截器处理协议层错误（401、网络超时），业务层错误需要单独处理。

#### 业务错误码分类

```ts
// types/api.ts
/** 业务错误码枚举 */
enum BizErrorCode {
  // 通用错误
  PARAM_INVALID = 40001,
  UNAUTHORIZED = 40003,
  NOT_FOUND = 40004,
  // 表单验证错误
  FIELD_VALIDATION = 42201,
  // 业务冲突
  DUPLICATE_NAME = 40901,
  // 限流
  RATE_LIMITED = 42901,
}

/** 业务错误结构 */
interface BizError {
  code: BizErrorCode
  message: string
  fields?: Record<string, string>  // 字段级错误，用于表单
}
```

#### 错误传播规则

```
错误发生位置        处理方式                      展示位置
────────────────────────────────────────────────────────────
HTTP 401/403     → 拦截器统一处理（跳转登录）    → 全局
网络超时/断开     → composable 捕获              → 组件内 ErrorDisplay
业务错误（无 fields）→ composable 捕获           → 全局 Toast / Message
字段验证错误（有 fields）→ composable 映射到表单 → 表单字段下方
```

#### 字段级错误映射

```ts
// composables/useForm.ts 中增加
function mapFieldErrors(
  fields: Record<string, string>,
  formErrors: Ref<Partial<Record<keyof FormType, string>>>
) {
  const mapped: Partial<Record<keyof FormType, string>> = {}
  for (const [field, message] of Object.entries(fields)) {
    // 后端字段名映射为前端表单字段名（如需要）
    const formField = field as keyof FormType
    mapped[formField] = message
  }
  formErrors.value = { ...formErrors.value, ...mapped }
}
```

#### 请求取消策略

```ts
// composables/useResource.ts
import { onUnmounted } from 'vue'

export function useResource<T>(fetcher: (signal?: AbortSignal) => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  let abortController: AbortController | null = null

  async function execute() {
    // 取消上一次未完成的请求
    abortController?.abort()
    abortController = new AbortController()

    loading.value = true
    error.value = null
    try {
      data.value = await fetcher(abortController.signal)
    } catch (e) {
      // 忽略取消错误
      if ((e as Error).name !== 'AbortError') {
        error.value = e as Error
      }
    } finally {
      loading.value = false
    }
  }

  // 组件卸载时自动取消 pending 请求
  onUnmounted(() => {
    abortController?.abort()
  })

  return { data, loading, error, execute }
}
```

使用示例：

```ts
// API 函数支持 AbortSignal
export function getUsers(params: UserListParams, signal?: AbortSignal) {
  return http.get('/users', { params, signal })
}

// composable 中使用
const { data, loading, execute } = useResource(
  (signal) => getUsers({ page: 1, pageSize: 10 }, signal)
)
```

---

## 状态管理架构

### 状态归属决策树

```
数据被谁使用？
├── 仅一个组件 → 组件内 ref/reactive
├── 父子组件 → props/emits
├── 祖先后代组件 → provide/inject
├── 同模块多个组件 → composable 内的模块级 ref
│   （多个组件调用同一 composable 时通过模块级变量共享）
├── 跨模块共享 → Pinia store
└── 需要持久化 → Pinia + 持久化插件
```

### Pinia Store 设计规范

```ts
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserInfo, login as loginApi } from '@/api/user'
import type { UserInfo, LoginParams } from '@/types'

export const useUserStore = defineStore('user', () => {
  // ─── State ───
  const currentUser = ref<UserInfo | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // ─── Getters ───
  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => currentUser.value?.name ?? '未登录')

  // ─── Actions ───
  async function login(params: LoginParams) {
    const result = await loginApi(params)
    token.value = result.token
    currentUser.value = result.user
    localStorage.setItem('token', result.token)
  }

  function logout() {
    token.value = null
    currentUser.value = null
    localStorage.removeItem('token')
  }

  async function fetchUser() {
    currentUser.value = await getUserInfo()
  }

  // ─── 导出 ───
  return {
    // state
    currentUser,
    token,
    // getters
    isLoggedIn,
    userName,
    // actions
    login,
    logout,
    fetchUser,
  }
})
```

Store 规则：
- 使用 Setup Store 风格（函数式，与 Composition API 一致）
- 返回值分组：state → getters → actions
- Store 不处理 UI 逻辑（如路由跳转），由调用方处理
- 异步操作在 action 中，composable 也可以调用 API，不强制所有 API 调用都经过 store

---

## 错误边界设计

### 组件级错误处理

```vue
<!-- 每个数据展示组件都应处理三种状态 -->
<script setup lang="ts">
const { data, loading, error, retry } = useSomeData()
</script>

<template>
  <!-- 加载态 -->
  <div v-if="loading" class="state-loading">
    <Skeleton />
  </div>

  <!-- 错误态 -->
  <div v-else-if="error" class="state-error">
    <ErrorMessage :message="error.message" @retry="retry" />
  </div>

  <!-- 空态 -->
  <div v-else-if="!data || data.length === 0" class="state-empty">
    <EmptyState description="暂无数据" />
  </div>

  <!-- 正常态 -->
  <div v-else class="state-content">
    <!-- 实际内容 -->
  </div>
</template>
```

### 全局错误处理

```ts
// main.ts 或 plugins/errorHandler.ts
import type { ErrorHandler } from 'vue'

const handler: ErrorHandler = (err, instance, info) => {
  // 记录错误（上报到监控系统）
  console.error('[Vue Error]', info, err)

  // 不在此处处理 UI 反馈
  // 由具体组件决定如何展示错误
}

app.config.errorHandler = handler
```

### Composable 错误处理模式

```ts
// composables/useAsync.ts — 通用的异步操作封装
export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  function retry() {
    execute()
  }

  // 初始执行
  execute()

  return { data, loading, error, execute, retry }
}

// 使用示例
const { data: users, loading, error, retry } = useAsync(() => getUserList())
```

如果需要延迟执行（不自动触发）：

```ts
// composables/useLazyAsync.ts — 手动触发的异步操作
export function useLazyAsync<T>() {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  let lastFn: (() => Promise<T>) | null = null

  async function execute(fn: () => Promise<T>) {
    lastFn = fn
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  function retry() {
    if (lastFn) {
      execute(lastFn)
    }
  }

  return { data, loading, error, execute, retry }
}
```

---

## 性能基线

### 组件大小基线

| 类型 | 建议行数上限 | 超过时的处理 |
|------|------------|-------------|
| 页面组件 | 150 行 | 拆分子组件 |
| 业务组件 | 200 行 | 拆分为更小的组件 + composable |
| 通用组件 | 150 行 | 检查是否职责过多 |
| Composable | 100 行 | 拆分为多个 composable |
| API 文件 | 80 行 | 按资源拆分 |

### 运行时性能检查点

在 P5 审查阶段检查：

- **大列表渲染**：超过 100 条数据考虑虚拟滚动
- **频繁更新**：避免在 `watch` 中做重计算，用 `computed` + 缓存
- **组件懒加载**：路由组件使用 `() => import()` 懒加载
- **图片优化**：大图使用懒加载 `loading="lazy"`
- **不必要的响应式**：静态数据不用 `ref/reactive` 包装
- **computed 副作用**：computed 中不能有异步操作或状态修改
- **watch 性能**：大数组的 deep watch 有性能风险，考虑具体字段 watch

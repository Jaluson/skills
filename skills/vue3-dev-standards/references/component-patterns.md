# Vue 3 生产级组件设计模式

## 目录

- [组件分类与职责](#组件分类与职责)
- [组件设计模式](#组件设计模式)
- [Composable 设计模式](#composable-设计模式)
- [组件通信模式](#组件通信模式)
- [插槽模式](#插槽模式)
- [表单处理模式](#表单处理模式)
- [列表与分页模式](#列表与分页模式)
- [错误边界与状态处理](#错误边界与状态处理)
- [组件拆分策略](#组件拆分策略)

---

## 组件分类与职责

### 分类定义

| 类型 | 职责 | 状态 | 位置 | 可复用性 |
|------|------|------|------|----------|
| 页面组件 | 路由级入口，组装子组件 | 可有 | `views/` 或 `features/*/components/` | 低 |
| 业务组件 | 特定业务功能的 UI 单元 | 可有 | `features/*/components/` | 中（模块内） |
| 通用组件 | 无业务逻辑的可复用 UI | 无（或 UI 状态） | `shared/components/` | 高 |
| 布局组件 | 页面骨架结构 | 无 | `layouts/` | 高 |

### 职责判定规则

一个组件只做一件事。判定"一件事"的标准：
- 能用一个动词+名词描述："展示用户列表"、"处理登录表单"、"渲染数据表格"
- 如果需要"和"连接，说明职责过多："展示用户列表**和**处理搜索" → 拆分

---

## 组件设计模式

### 模式 1：展示型组件（无状态 / 纯 UI）

特点：所有数据通过 props 传入，通过 emits 输出事件，自身不管理业务状态。

```vue
<!-- shared/components/StatusBadge.vue -->
<script setup lang="ts">
interface Props {
  status: 'active' | 'inactive' | 'pending'
  size?: 'sm' | 'md'
  showText?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: true,
})

const statusConfig: Record<Props['status'], { label: string; class: string }> = {
  active: { label: '活跃', class: 'badge--success' },
  inactive: { label: '停用', class: 'badge--danger' },
  pending: { label: '待审', class: 'badge--warning' },
}
</script>

<template>
  <span :class="['badge', `badge--${size}`, statusConfig[status].class]">
    {{ showText ? statusConfig[status].label : '' }}
  </span>
</template>
```

设计要点：
- 不依赖任何业务数据结构
- 通过 props 完全控制外观
- 可以在任何业务场景复用
- 无需修改即可扩展（通过新增 status 类型在 statusConfig 中添加映射）

### 模式 2：容器型组件（有状态）

特点：管理数据获取和状态，将展示委托给子组件。

```vue
<!-- features/user/components/UserProfile.vue -->
<script setup lang="ts">
import { useUser } from '../composables/useUser'
import UserAvatar from '@/shared/components/UserAvatar.vue'
import UserDetail from './UserDetail.vue'
import { Skeleton, ErrorMessage, EmptyState } from '@/shared/components'

const props = defineProps<{ userId: string }>()

// 数据获取和业务逻辑委托给 composable
const { user, loading, error, refresh } = useUser(() => props.userId)

// 页面级操作（路由跳转等）
const router = useRouter()
function goToEdit() {
  router.push({ name: 'user-edit', params: { id: props.userId } })
}
</script>

<template>
  <div class="user-profile">
    <Skeleton v-if="loading" type="avatar+text" />
    <ErrorMessage v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="!user" description="用户不存在" />
    <template v-else>
      <UserAvatar :src="user.avatar" :name="user.name" size="lg" />
      <UserDetail :user="user" @edit="goToEdit" />
    </template>
  </div>
</template>
```

设计要点：
- 容器组件不包含复杂模板，只做组装
- 所有数据操作通过 composable
- 完整处理了三种状态（加载/错误/正常）
- UI 交互（路由跳转）在组件层处理，不在 composable 中

### 模式 3：交互型组件（有 UI 状态）

特点：管理 UI 交互状态（弹窗开关、选中项、展开折叠），不管理业务数据。

```vue
<!-- shared/components/DropdownMenu.vue -->
<script setup lang="ts" generic="T extends { id: string }">
interface Props {
  items: T[]
  labelKey?: keyof T
  placeholder?: string
  modelValue?: T | null
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'name' as keyof T,
  placeholder: '请选择',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: T | null): void
}>()

// 纯 UI 状态
const isOpen = ref(false)
const highlightedIndex = ref(-1)

function select(item: T) {
  emit('update:modelValue', item)
  isOpen.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
  highlightedIndex.value = -1
}

// 点击外部关闭
onClickOutside(templateRef, () => {
  isOpen.value = false
})
</script>
```

设计要点：
- UI 状态（isOpen、highlightedIndex）留在组件内
- 业务数据通过 props/emits 与外部通信
- 泛型支持不同数据类型
- 使用 defineModel（Vue 3.4+）或 update:modelValue 支持 v-model

### 模式 4：表单组件

```vue
<!-- features/order/components/OrderForm.vue -->
<script setup lang="ts">
import { useForm } from '../composables/useOrderForm'

const props = defineProps<{
  initialData?: OrderFormData
}>()

const emit = defineEmits<{
  (e: 'submit', data: OrderFormData): void
  (e: 'cancel'): void
}>()

const { form, errors, submitting, validate, reset } = useForm(props.initialData)

async function handleSubmit() {
  if (validate()) {
    emit('submit', { ...form })
  }
}

function handleCancel() {
  reset()
  emit('cancel')
}
</script>
```

设计要点：
- 表单组件不自己提交数据，通过 emit 交给父组件
- 验证逻辑在 composable 中
- 表单状态用 reactive（适合多字段）
- 支持 initialData 回填（编辑模式）

---

## Composable 设计模式

### 模式 1：数据获取 + 状态管理

```ts
// composables/useResource.ts — 通用资源获取模式
export function useResource<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}

// 使用示例
const { data: user, loading, error, execute: fetchUser } = useResource(
  () => getUserInfo(userId.value)
)
```

### 模式 2：资源 CRUD 操作

```ts
// features/order/composables/useOrder.ts
export function useOrder(orderId: Ref<string>) {
  const order = ref<Order | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // 读取
  async function fetch() {
    loading.value = true
    error.value = null
    try {
      order.value = await getOrder(orderId.value)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  // 更新
  async function updateStatus(status: OrderStatus) {
    try {
      await updateOrder(orderId.value, { status })
      await fetch()  // 更新后刷新数据
    } catch (e) {
      error.value = e as Error
      throw e  // 让调用方决定如何处理
    }
  }

  // 删除
  async function remove() {
    await deleteOrder(orderId.value)
    order.value = null
  }

  // 初始化加载
  watch(orderId, fetch, { immediate: true })

  return { order, loading, error, fetch, updateStatus, remove }
}
```

### 模式 3：表单逻辑

```ts
// composables/useForm.ts
export function useForm<T extends Record<string, any>>(initialValues: T) {
  const form = reactive({ ...initialValues }) as T
  const errors = ref<Partial<Record<keyof T, string>>>({})
  const submitting = ref(false)

  // 验证器注册
  const validators: Partial<Record<keyof T, Array<(val: any) => string | undefined>>> = {}

  function addValidator(field: keyof T, validator: (val: any) => string | undefined) {
    if (!validators[field]) validators[field] = []
    validators[field].push(validator)
  }

  function validate(): boolean {
    errors.value = {}
    let isValid = true

    for (const [field, rules] of Object.entries(validators)) {
      for (const rule of rules) {
        const message = rule(form[field as keyof T])
        if (message) {
          errors.value[field as keyof T] = message
          isValid = false
          break
        }
      }
    }

    return isValid
  }

  function reset() {
    Object.assign(form, initialValues)
    errors.value = {}
  }

  return { form, errors, submitting, validate, reset, addValidator }
}
```

### Composable 设计检查清单

对每个新建的 composable，确认：
- [ ] 以 `use` 开头命名
- [ ] 返回 `ref/computed`（状态）和普通函数（操作）
- [ ] 不操作 DOM（`onMounted` 中绑定事件除外）
- [ ] 不 import 组件
- [ ] 可在组件外使用和测试
- [ ] 如果接受 `Ref` 参数，内部用 `unref()` 或 `watch()` 正确处理
- [ ] 包含 loading 和 error 状态处理

---

## 组件通信模式

### 选择决策树

```
通信场景？
├── 父 → 子传递数据
│   └── Props（标准方式）
├── 子 → 父反馈事件
│   └── Emits（标准方式）
├── 父 ↔ 子双向绑定
│   └── v-model + defineModel（Vue 3.4+）或 update:modelValue
├── 跨多层传递
│   └── Provide / Inject（限定作用域）
├── 兄弟组件通信
│   └── 提升到共同父组件通过 props/emits 中转
├── 同模块多组件共享
│   └── Composable 中的模块级 ref
└── 跨模块共享
    └── Pinia Store
```

### Provide / Inject 类型安全模式

```ts
// composables/useTableContext.ts
import type { InjectionKey, Ref } from 'vue'

// 定义注入 key（带类型）
interface TableContext {
  selectedIds: Ref<Set<string>>
  sortField: Ref<string>
  toggleSelect: (id: string) => void
}

const TABLE_CONTEXT_KEY: InjectionKey<TableContext> = Symbol('table-context')

// Provider（父级）
export function provideTableContext(): TableContext {
  const selectedIds = ref(new Set<string>())
  const sortField = ref('')

  function toggleSelect(id: string) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  const context: TableContext = { selectedIds, sortField, toggleSelect }
  provide(TABLE_CONTEXT_KEY, context)
  return context
}

// Consumer（子级）
export function useTableContext(): TableContext {
  const context = inject(TABLE_CONTEXT_KEY)
  if (!context) {
    throw new Error('useTableContext must be used within a Table component')
  }
  return context
}
```

---

## 插槽模式

### 默认插槽 + 作用域插槽

```vue
<!-- shared/components/DataList.vue -->
<script setup lang="ts" generic="T">
interface Props {
  items: T[]
  loading?: boolean
  emptyText?: string
  itemKey: keyof T
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: '暂无数据',
})
</script>

<template>
  <div class="data-list">
    <div v-if="loading" class="data-list__loading">
      <slot name="loading">
        <span>加载中...</span>
      </slot>
    </div>

    <div v-else-if="items.length === 0" class="data-list__empty">
      <slot name="empty">
        <span>{{ emptyText }}</span>
      </slot>
    </div>

    <div v-else class="data-list__content">
      <slot
        v-for="(item, index) in items"
        :key="item[itemKey]"
        :item="item"
        :index="index"
      />
    </div>
  </div>
</template>
```

使用：

```vue
<DataList :items="users" item-key="id">
  <template #loading>
    <UserSkeleton />
  </template>
  <template #empty>
    <EmptyState description="暂无用户" action-text="添加用户" @action="showAddDialog" />
  </template>
  <template #default="{ item, index }">
    <UserRow :user="item" :rank="index + 1" />
  </template>
</DataList>
```

---

## 表单处理模式

### 完整的表单流程

```ts
// 1. 定义表单类型
interface LoginForm {
  username: string
  password: string
  remember: boolean
}

// 2. 表单 composable
function useLoginForm() {
  const { form, errors, submitting, validate, reset } = useForm<LoginForm>({
    username: '',
    password: '',
    remember: false,
  })

  // 注册验证规则
  // addValidator('username', required('用户名'))
  // addValidator('password', minLength(6, '密码'))

  async function submit(onSuccess: () => void) {
    if (!validate()) return

    submitting.value = true
    try {
      await loginApi({
        username: form.username,
        password: form.password,
      })
      onSuccess()
    } catch (e) {
      // 后端验证错误映射到字段
      if ((e as any).errors) {
        mapServerErrors((e as any).errors, errors)
      }
    } finally {
      submitting.value = false
    }
  }

  return { form, errors, submitting, submit, reset }
}
```

---

## 列表与分页模式

### 列表页完整模式

```ts
// composables/useList.ts — 通用列表逻辑
interface ListOptions<T, P> {
  fetchFn: (params: P) => Promise<PaginatedResult<T>>
  defaultParams: P
}

export function useList<T, P extends Record<string, any>>(options: ListOptions<T, P>) {
  const items = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const params = reactive({ ...options.defaultParams }) as P

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const result = await options.fetchFn(params)
      items.value = result.list
      total.value = result.total
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  function updateParams(newParams: Partial<P>) {
    Object.assign(params, newParams)
    fetch()
  }

  // 初始化加载
  fetch()

  return { items, total, loading, error, params, fetch, updateParams }
}
```

---

## 错误边界与状态处理

### 三态必检原则

每个展示数据的组件，必须处理以下三种状态：

```vue
<template>
  <!-- 态 1：加载中 -->
  <Skeleton v-if="loading" />

  <!-- 态 2：错误 -->
  <ErrorDisplay v-else-if="error" :error="error" @retry="retry" />

  <!-- 态 3：正常（含空状态） -->
  <EmptyState v-else-if="isEmpty" />
  <ContentDisplay v-else :data="data" />
</template>
```

如果组件不是数据展示组件（如纯按钮、纯布局），不需要三态处理。

### 错误传播规则

```
子组件错误 → emit 给父组件（不吞掉）
composable 错误 → 通过 error ref 暴露 + throw 让调用方 catch
API 错误 → 在 HTTP 拦截器做全局处理（401等），业务错误透传到 composable
```

---

## 组件拆分策略

### 拆分信号检测

在 P3 编码阶段或 P5 审查阶段，检测以下拆分信号：

| 信号 | 阈值 | 拆分方式 |
|------|------|----------|
| 页面组件 > 150 行 | 行数 | 拆分子组件 |
| 业务组件 > 200 行 | 行数 | 拆分为更小的组件 + composable |
| 通用组件 > 150 行 | 行数 | 检查是否职责过多 |
| Composable > 100 行 | 行数 | 拆分为多个 composable |
| 模板中有 > 3 个独立区块 | 视觉判断 | 每个区块提取为子组件 |
| script 中有独立的 ref 簇 | 代码审查 | 提取为独立 composable |
| 同一文件中有条件渲染的"子页面" | 代码审查 | 拆为独立路由组件 |
| v-for 循环体超过 20 行 | 行数 | 提取为列表项组件 |
| props 超过 8 个 | 数量 | 检查是否职责过多 |

> **注**：组件行数上限与 `architecture.md` 性能基线保持一致，以 architecture.md 为权威定义。

### 拆分原则

- **垂直拆分优先**：按功能区块拆分（header、body、footer），而非按技术层拆分（HTML、JS、CSS）
- **保持父子关系清晰**：拆分后的子组件通过明确的 props/emits 通信
- **避免过度拆分**：不要为了拆分而拆分，3-5 行的组件不如内联
- **命名反映职责**：拆分后的组件名应该清晰表达其职责

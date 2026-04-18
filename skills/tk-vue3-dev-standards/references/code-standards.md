# Vue 3 代码编写规范详解

## 一、组件规范详解

### 1.1 组件模板规范

```vue
<!-- ✅ 正确：模板结构清晰 -->
<template>
  <div class="user-card">
    <header class="user-card__header">
      <h3>{{ title }}</h3>
    </header>

    <main class="user-card__body">
      <div v-for="item in items" :key="item.id">
        {{ item.name }}
      </div>
    </main>

    <footer class="user-card__footer">
      <el-button @click="handleConfirm">确认</el-button>
      <el-button @click="handleCancel">取消</el-button>
    </footer>
  </div>
</template>

<!-- ❌ 错误：模板过于复杂 -->
<template>
  <div>
    <div v-if="condition1">
      <div v-for="item in list" :key="item.id">
        <div v-if="item.show">
          <!-- 嵌套过深 -->
        </div>
      </div>
    </div>
  </div>
</template>
```

### 1.2 组件脚本规范

```typescript
<!-- ✅ 正确：使用 TypeScript + Composition API -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { PropType } from 'vue';

// 类型定义
interface UserItem {
  id: number;
  name: string;
}

// Props 定义
const props = defineProps<{
  title: string;
  count?: number;
  items: UserItem[];
  status: 'pending' | 'success' | 'error';
  onUpdate?: (value: string) => void;
}>();

// Emits 定义
const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'delete', id: number): void;
}>();

// 响应式数据
const loading = ref(false);
const localValue = ref('');

// 计算属性
const isEmpty = computed(() => props.items.length === 0);
const statusText = computed(() => {
  const map = { pending: '处理中', success: '成功', error: '失败' };
  return map[props.status];
});

// 监听器
watch(() => props.count, (newVal) => {
  console.log('count changed:', newVal);
});

// 方法
function handleConfirm() {
  emit('confirm');
}

function handleDelete(id: number) {
  emit('delete', id);
}

// 生命周期
onMounted(() => {
  console.log('Component mounted');
});
</script>

<!-- ❌ 错误：使用 Options API + any 类型 -->
<script>
export default {
  props: {
    title: String,
    items: Array,
  },
  data() {
    return {
      loading: false,
    };
  },
  mounted() { },
};
</script>
```

### 1.3 组件样式规范

```vue
<style scoped>
/* ✅ 正确：使用 BEM 命名 */
.user-card {
  padding: 16px;
  border-radius: 8px;

  &__header {
    border-bottom: 1px solid #eee;
  }

  &__body {
    padding: 16px 0;
  }

  &__footer {
    text-align: right;
  }

  &--active {
    border-color: #409eff;
  }
}

/* ✅ 正确：深度选择器 */
:deep(.el-input) {
  width: 100%;
}

/* ✅ 正确：媒体查询 */
@media (max-width: 768px) {
  .user-card {
    padding: 8px;
  }
}
</style>
```

---

## 二、Composables 规范

### 2.1 常用 Composables

```typescript
// composables/useLoading.ts
export function useLoading(initValue = false) {
  const loading = ref(initValue);

  function start() {
    loading.value = true;
  }

  function stop() {
    loading.value = false;
  }

  return {
    loading,
    start,
    stop,
    withLoading: async <T>(fn: () => Promise<T>) => {
      start();
      try {
        return await fn();
      } finally {
        stop();
      }
    },
  };
}

// composables/useModal.ts
export function useModal() {
  const visible = ref(false);
  const data = ref<any>(null);

  function open(item?: any) {
    data.value = item ?? null;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    data.value = null;
  }

  return {
    visible,
    data,
    open,
    close,
  };
}
```

### 2.2 Composables 使用场景

| 场景 | 推荐使用 |
|------|----------|
| 列表分页 | `usePagination` |
| 弹窗控制 | `useModal` |
| loading 状态 | `useLoading` |
| 表单处理 | `useForm` |
| 权限控制 | `usePermission` |
| 本地存储 | `useStorage` |

---

## 三、Vue 3.4+ 新特性

### 3.1 defineModel 双向绑定简化

Vue 3.4 引入了 `defineModel` 宏，可以大幅简化 v-model 的使用，无需同时定义 props 和 emits。

```vue
<!-- Vue 3.4+ 简化写法 -->
<script setup lang="ts">
// 单个 v-model
const modelValue = defineModel<string>()
const modelValue2 = defineModel<string>('modelValue2') // 自定义 prop 名

// 带选项的 defineModel
const count = defineModel<number>({ default: 0 })
const name = defineModel<string>({ required: true })
</script>

<template>
  <!-- 无需手动处理 update:modelValue -->
  <input v-model="modelValue" />
  <input v-model="modelValue2" />
  <input v-model="count" type="number" />
  <input v-model="name" />
</template>
```

```typescript
// 父组件使用
// <ChildComponent v-model="title" />
// <ChildComponent v-model:title="title" />
// <ChildComponent v-model:title.trim="title" />
```

**对比传统写法（Vue 3.4 之前）：**

```vue
<script setup lang="ts">
// 传统写法：需要定义 props 和 emits
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<{
  'update:title': [value: string]
  'update:count': [value: number]
}>()

// 使用
function updateTitle(value: string) {
  emit('update:title', value)
}
</script>
```

### 3.2 defineEmits 简化语法

Vue 3.4 允许使用更简洁的箭头函数类型定义 emits：

```typescript
// Vue 3.4+ 简化写法
const emit = defineEmits({
  click: (value: MouseEvent) => true,
  update: (value: string) => true,
  'update:modelValue': (value: string) => true,
})

// 或者使用类型推断（推荐）
const emit = defineEmits<{
  click: [value: MouseEvent]
  update: [value: string]
  'update:modelValue': [value: string]
}>()
```

### 3.3 script setup 顶层 await

Vue 3.4 支持在 `<script setup>` 顶层直接使用 await，无需包裹在 async 函数中：

```vue
<script setup lang="ts">
import { ref } from 'vue'

// 顶层 await - 组件等待异步操作完成
const user = await fetchUser()

// 带默认值
const user = ref(null)
await getUser().then(data => user.value = data)

// 与 reactive 结合
const data = await fetchData()
// data 会自动保持响应式
</script>
```

**注意：顶层 await 会使组件变为异步组件，需要使用 Suspense 包裹或父组件使用异步组件加载。**

### 3.4 useTemplateRef 和 useId Hooks

Vue 3.4 引入了新的组合式 API：

```typescript
<script setup lang="ts">
import { useTemplateRef, useId, ref } from 'vue'

// useTemplateRef - 简化模板引用（替代 $refs）
const inputRef = useTemplateRef<HTMLInputElement>('myInput')
const formRef = useTemplateRef<HTMLFormElement>('myForm')

onMounted(() => {
  inputRef.value?.focus()
})

// useId - 生成唯一 ID（用于无障碍和表单）
const id = useId() // 生成唯一 ID，如：':f0r1r2'
const labelId = useId() // 另一个唯一 ID

function handleSubmit() {
  formRef.value?.validate()
}
</script>

<template>
  <form :ref="formRef">
    <label :for="id">用户名</label>
    <input :id="id" :ref="myInput" type="text" />
  </form>
</template>
```

**useId 在以下场景特别有用：**
- 表单元素的 `for/id` 关联
- 无障碍属性（`aria-describedby`）
- 动态生成的表单字段
- 列表中每个项的唯一标识

### 3.5 v-bind 同级元素透传增强

Vue 3.4 改进了 v-bind 的继承行为，可以更方便地透传属性：

```vue
<script setup lang="ts">
import { inheritAttrs } from 'vue'

// 禁用继承（可以替代 inheritAttrs: false）
defineOptions({ inheritAttrs: false })
</script>

<template>
  <!-- 使用 $attrs 手动透传 -->
  <button type="submit" class="btn" v-bind="$attrs">
    <slot />
  </button>

  <!-- 透传多个属性 -->
  <div v-bind="attrs" class="wrapper">
    <input v-bind="inputAttrs" />
  </div>
</template>

<script setup>
const attrs = {
  id: 'container',
  'data-testid': 'my-container'
}

const inputAttrs = {
  type: 'text',
  placeholder: '请输入'
}
</script>
```

### 3.6 Pinia 2.x 新特性

Pinia 2.x 带来了多项改进：

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'

// 传统方式使用 store
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')

  // 使用 $reset 需要手动标记类型
  function $reset() {
    userInfo.value = null
    token.value = ''
  }

  // 建议使用 actions 代替 $reset
  function resetStore() {
    userInfo.value = null
    token.value = ''
  }

  return { userInfo, token, $reset, resetStore }
})

// storeToRefs 改进（Pinia 2.x）
const userStore = useUserStore()

// 使用 storeToRefs 保持响应式
const { userInfo, token } = storeToRefs(userStore)

// actions 直接解构（Pinia 2.x 支持）
const { fetchUserInfo, logout, resetStore } = storeToRefs(userStore)
```

**Pinia 2.x 重要变更：**
- `storeToRefs` 现在可以解构 actions（不推荐，仅保持向后兼容）
- 推荐直接解构 actions：`const { action1, action2 } = store`
- 移除了 `mapStores` 等遗留 API

### 3.7 TypeScript 5.x 与 Vue 3.4+ 配合

TypeScript 5.4+ 带来了更好的类型推断：

```typescript
// 更精确的联合类型推断
type Status = 'pending' | 'success' | 'error'
type Theme = 'light' | 'dark'

// Vue 3.4+ 与 TS 5.x 配合：更好的泛型推断
function createFetcher<T extends { id: number }>(url: string) {
  return async () => {
    const res = await fetch(`${url}/${T extends { id: infer U } ? U : never}`)
    return res.json() as Promise<T>
  }
}

// defineModel 的类型推断增强
const modelValue = defineModel<string, 'change' | 'input'>()
// 推断出事件类型为 'change' | 'input'
```

### 3.8 Vite 5.x 配置优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  // 构建优化
  build: {
    // 设置目标浏览器
    target: 'es2020',

    // 分包配置优化
    rollupOptions: {
      output: {
        manualChunks: {
          // 基础框架
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // UI 库（按需导入）
          'element-vendor': ['element-plus'],
          // 大型依赖独立打包
          'echarts-vendor': ['echarts'],
          // 工具函数
          'utils-vendor': ['lodash-es', 'axios'],
        },
      },
    },

    // 包体积警告阈值（KB）
    chunkSizeWarningLimit: 600,

    // 开启 gzip 压缩
    chunkSizeLimit: 1000000,

    // CSS 代码分割
    cssCodeSplit: true,

    // 静态资源内联阈值
    assetsInlineLimit: 4096,
  },

  // 依赖预构建优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'axios',
    ],
    // 排除不需要预构建的依赖
    exclude: ['@vue/runtime-core'],
  },

  // 开发服务器优化
  server: {
    port: 5173,
    host: true,
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 四、Store 规范

### 3.1 Store 模块划分

```typescript
// stores/modules/user.ts
export const useUserStore = defineStore('user', () => {
  // State
  const info = ref<UserInfo | null>(null);
  const token = ref<string>('');

  // Getters
  const isLoggedIn = computed(() => !!token.value);
  const displayName = computed(() => info.value?.username ?? '未登录');

  // Actions
  async function login(credentials: LoginDTO) {
    const res = await userApi.login(credentials);
    token.value = res.token;
    info.value = res.userInfo;
  }

  function logout() {
    info.value = null;
    token.value = '';
  }

  return {
    info,
    token,
    isLoggedIn,
    displayName,
    login,
    logout,
  };
});
```

### 3.2 Store 跨模块调用

```typescript
// stores/modules/order.ts
export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([]);

  async function fetchOrders() {
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) {
      throw new Error('请先登录');
    }
    orders.value = await orderApi.list();
  }

  return { orders, fetchOrders };
});
```

---

## 五、API 调用规范

### 4.1 请求工具封装

```typescript
// utils/request.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截
request.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message: string }>) => {
    const message = error.response?.data?.message ?? '请求失败';

    switch (error.response?.status) {
      case 401:
        router.push({ name: 'Login' });
        ElMessage.error('登录已过期');
        break;
      case 403:
        ElMessage.error('没有权限');
        break;
      case 404:
        ElMessage.error('请求资源不存在');
        break;
      case 500:
        ElMessage.error('服务器错误');
        break;
      default:
        ElMessage.error(message);
    }

    return Promise.reject(error);
  }
);

export default request;
```

### 4.2 API 模块化

```typescript
// api/modules/user.ts
import request from '@/utils/request';
import type { UserInfo, UserListResponse, UserDTO } from '@/types';

export const userApi = {
  list: (params: { page: number; pageSize: number; keyword?: string }) =>
    request.get<UserListResponse>('/users', { params }),

  getById: (id: number) =>
    request.get<UserInfo>(`/users/${id}`),

  create: (data: UserDTO) =>
    request.post<UserInfo>('/users', data),

  update: (id: number, data: Partial<UserDTO>) =>
    request.put<UserInfo>(`/users/${id}`, data),

  delete: (id: number) =>
    request.delete<void>(`/users/${id}`),

  batchDelete: (ids: number[]) =>
    request.post<void>('/users/batch-delete', { ids }),
};
```

---

## 六、错误处理规范

### 5.1 同步错误处理

```typescript
// ✅ 正确：使用 try-catch
async function fetchData() {
  try {
    loading.value = true;
    const data = await userApi.getById(1);
    list.value = data;
  } catch (error) {
    console.error('获取数据失败:', error);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
}

// ✅ 正确：使用 .catch
userApi.getById(1)
  .then((data) => {
    list.value = data;
  })
  .catch((error) => {
    console.error('获取数据失败:', error);
  });
```

### 5.2 批量错误处理

```typescript
// Promise.allSettled 处理批量请求
async function fetchAll() {
  const results = await Promise.allSettled([
    userApi.list({ page: 1, pageSize: 10 }),
    orderApi.list({ page: 1, pageSize: 10 }),
    productApi.list({ page: 1, pageSize: 10 }),
  ]);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`请求 ${index} 成功:`, result.value);
    } else {
      console.error(`请求 ${index} 失败:`, result.reason);
    }
  });
}
```

---

## 七、响应式数据规范

### 6.1 ref vs reactive

```typescript
// ✅ ref：用于基本类型和需要替换整个对象的场景
const count = ref(0);
const userInfo = ref<UserInfo | null>(null);

// 赋值方式
count.value = 1;
userInfo.value = { id: 1, name: '张三' };

// ✅ reactive：用于复杂对象的响应式
const form = reactive({
  username: '',
  password: '',
  remember: false,
});

// 赋值方式
form.username = 'admin';

// ❌ 错误：不要直接替换 reactive 对象
// form = reactive({})  // 错误

// ✅ 正确：使用 ref 或 Object.assign
const form = ref({
  username: '',
  password: '',
  remember: false,
});
form.value = { username: 'admin', password: '123', remember: true };
```

### 6.2 响应式注意事项

```typescript
// ❌ 错误：解构 reactive 对象会丢失响应式
const { username, password } = reactive({
  username: '',
  password: '',
});

// ✅ 正确：使用 toRefs
const state = reactive({
  username: '',
  password: '',
});
const { username, password } = toRefs(state);

// ✅ 正确：按需使用 computed
const username = computed(() => state.username);
```

---

## 八、样式规范详解

### 7.1 CSS 变量定义

```scss
// styles/variables.scss
:root {
  // 主题色
  --color-primary: #409eff;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;

  // 间距
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  // 字体大小
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;

  // 圆角
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
}
```

### 7.2 混入 (Mixins)

```scss
// styles/mixins.scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin text-ellipsis($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@mixin media-query($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (max-width: 768px) { @content; }
  } @else if $breakpoint == 'md' {
    @media (max-width: 992px) { @content; }
  } @else if $breakpoint == 'lg' {
    @media (max-width: 1200px) { @content; }
  }
}
```

### 7.3 样式使用示例

```vue
<style scoped lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.user-card {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--border-radius-md);

  &__header {
    @include flex-center;
    justify-content: space-between;
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid #eee;
  }

  &__name {
    font-size: var(--font-size-lg);
    font-weight: bold;
  }

  &__desc {
    @include text-ellipsis(2);
    color: #666;
  }

  @include media-query('sm') {
    padding: var(--spacing-sm);
  }
}
</style>
```

---

## 九、组件通信模式

### 9.1 provide/inject（跨层级通信）

适用于深层嵌套组件间的数据传递，避免逐层 props 传递：

```typescript
// 父组件：provide
<script setup lang="ts">
import { provide, ref, readonly } from 'vue'
import type { InjectionKey } from 'vue'

// 使用 InjectionKey 提供类型安全
interface UserContext {
  userInfo: Readonly<Ref<UserInfo | null>>
  updateUser: (info: UserInfo) => void
}

export const UserKey: InjectionKey<UserContext> = Symbol('user')

const userInfo = ref<UserInfo | null>(null)

provide(UserKey, {
  userInfo: readonly(userInfo),
  updateUser: (info: UserInfo) => { userInfo.value = info },
})
</script>

// 子组件：inject（无论嵌套多深）
<script setup lang="ts">
import { inject } from 'vue'
import { UserKey } from '@/providers/user'

const { userInfo, updateUser } = inject(UserKey)!
</script>
```

### 9.2 attrs 透传

处理组件包裹场景下的属性透传：

```vue
<script setup lang="ts">
// 禁用自动继承
defineOptions({ inheritAttrs: false })
</script>

<template>
  <!-- 手动控制透传到特定元素 -->
  <div class="wrapper">
    <input v-bind="$attrs" class="input" />
  </div>
</template>
```

### 9.3 通信模式选择

| 场景 | 推荐方式 | 说明 |
|------|----------|------|
| 父→子 | Props | 标准单向数据流 |
| 子→父 | defineEmits | 事件向上传递 |
| 跨层级 | provide/inject | 避免 props 层层传递 |
| 全局状态 | Pinia Store | 多组件共享状态 |
| 模板引用 | defineExpose | 父组件调用子组件方法 |
| 兄弟组件 | Pinia Store 或事件总线 | 共享状态或发布订阅 |

---

## 十、Composable 设计最佳实践

### 10.1 Composable 设计原则

1. **命名规范**：以 `use` 开头，如 `useUserList`、`usePagination`
2. **输入验证**：对参数进行校验，提供合理默认值
3. **返回值规范**：返回 ref 和方法，保持响应式
4. **清理副作用**：在 `onUnmounted` 中清理定时器、事件监听等

### 10.2 Composable 模板

```typescript
// composables/useFetch.ts
import { ref, shallowRef, onUnmounted, type Ref } from 'vue'

interface UseFetchOptions<T> {
  immediate?: boolean
  initialValue?: T
  onError?: (error: Error) => void
}

interface UseFetchReturn<T> {
  data: Readonly<Ref<T | null>>
  error: Readonly<Ref<Error | null>>
  loading: Readonly<Ref<boolean>>
  execute: () => Promise<T>
  refresh: () => Promise<T>
}

export function useFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { immediate = false, initialValue = null, onError } = options

  const data = shallowRef<T | null>(initialValue)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  let abortController: AbortController | null = null

  async function execute(): Promise<T> {
    // 取消上一次请求
    abortController?.abort()
    abortController = new AbortController()

    loading.value = true
    error.value = null

    try {
      const urlValue = typeof url === 'function' ? url() : url
      const response = await fetch(urlValue, { signal: abortController.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json() as T
      data.value = result
      return result
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err
      onError?.(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 组件卸载时取消请求
  onUnmounted(() => {
    abortController?.abort()
  })

  if (immediate) {
    execute()
  }

  return {
    data: data as Readonly<Ref<T | null>>,
    error: error as Readonly<Ref<Error | null>>,
    loading: loading as Readonly<Ref<boolean>>,
    execute,
    refresh: execute,
  }
}
```

### 10.3 组合 Composable

```typescript
// composables/useUserList.ts - 组合多个 composable
import { computed } from 'vue'
import { useFetch } from './useFetch'
import { usePagination } from './usePagination'
import type { UserInfo } from '@/types'

export function useUserList() {
  const { page, pageSize, total, setTotal } = usePagination({ pageSize: 10 })
  const keyword = ref('')

  const url = computed(() =>
    `/api/users?page=${page.value}&pageSize=${pageSize.value}&keyword=${keyword.value}`
  )

  const { data, loading, execute: refresh } = useFetch<UserInfo[]>(url, {
    immediate: true,
    onSuccess: (res) => setTotal(res.total),
  })

  function search(val: string) {
    keyword.value = val
    page.value = 1
    refresh()
  }

  return {
    users: data,
    loading,
    page,
    pageSize,
    total,
    keyword,
    search,
    refresh,
  }
}
```

---

## 十一、性能优化编码规范

### 11.1 v-memo 缓存渲染

```vue
<template>
  <!-- ✅ v-memo: 仅当 item 变化时重新渲染 -->
  <div v-for="item in list" :key="item.id" v-memo="[item.selected]">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

### 11.2 v-once 静态内容

```vue
<template>
  <!-- ✅ v-once: 只渲染一次，后续更新跳过 -->
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticDescription }}</p>
  </div>
</template>
```

### 11.3 KeepAlive 缓存组件

```vue
<template>
  <!-- ✅ 使用 KeepAlive 缓存路由组件 -->
  <RouterView v-slot="{ Component }">
    <KeepAlive :include="['UserList', 'OrderList']" :max="10">
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
```

### 11.4 虚拟滚动

```vue
<script setup lang="ts">
// 大列表使用虚拟滚动
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  largeDataSource,
  { itemHeight: 48, keepAlive: 10 }
)
</script>

<template>
  <div v-bind="containerProps" style="height: 500px; overflow: auto;">
    <div v-bind="wrapperProps">
      <div v-for="{ data, index } in list" :key="index" style="height: 48px;">
        {{ data.name }}
      </div>
    </div>
  </div>
</template>
```

### 11.5 异步组件与代码分割

```typescript
// 路由级代码分割
const routes = [
  {
    path: '/dashboard',
    // ✅ 路由懒加载
    component: () => import('@/views/Dashboard.vue'),
  },
  {
    path: '/settings',
    // ✅ 带加载状态
    component: defineAsyncComponent({
      loader: () => import('@/views/Settings.vue'),
      loadingComponent: LoadingSpinner,
      delay: 200,
      timeout: 10000,
    }),
  },
]
```

### 11.6 性能优化清单

| 优化项 | 使用场景 | 优化效果 |
|--------|----------|----------|
| v-memo | 大量重复渲染的列表项 | 减少不必要的 DOM 更新 |
| v-once | 静态内容只渲染一次 | 跳过后续渲染 |
| KeepAlive | 频繁切换的 Tab/路由 | 避免重复创建销毁 |
| 虚拟滚动 | 长列表（1000+ 项） | 仅渲染可见区域 |
| shallowRef | 大型对象的顶层响应式 | 减少深度代理开销 |
| computed 缓存 | 计算密集型派生数据 | 避免重复计算 |
| 异步组件 | 非首屏必需的组件 | 减小首屏加载体积 |
| 懒加载 | 路由、图片、组件 | 按需加载 |

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

## 三、Store 规范

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

## 四、API 调用规范

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

## 五、错误处理规范

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

## 六、响应式数据规范

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

## 七、样式规范详解

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

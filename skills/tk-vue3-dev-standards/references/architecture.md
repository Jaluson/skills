# Vue 3 架构设计规范

## 一、项目架构原则

### 1.1 架构分层

```
┌─────────────────────────────────────────┐
│             Views (页面层)               │
│     页面组件、路由页面、布局组件            │
├─────────────────────────────────────────┤
│           Components (组件层)            │
│     通用组件、业务组件、容器组件           │
├─────────────────────────────────────────┤
│         Composables (逻辑层)             │
│     可复用逻辑、状态组合、业务流程         │
├─────────────────────────────────────────┤
│           Stores (状态层)                │
│     Pinia 状态管理、业务数据              │
├─────────────────────────────────────────┤
│            API (数据层)                  │
│     接口封装、数据转换                    │
└─────────────────────────────────────────┘
```

### 1.2 模块职责划分

| 层级 | 职责 | 不应该做的事 |
|------|------|-------------|
| Views | 页面布局、路由参数处理、组合子组件 | 禁止直接操作 DOM |
| Components | UI 展示、props 接收、事件emit | 禁止直接调用 API |
| Composables | 可复用逻辑、跨组件状态共享 | 禁止包含 UI 结构 |
| Stores | 全局状态、业务数据管理 | 禁止包含 UI 逻辑 |
| API | 接口调用、数据格式化 | 禁止包含业务逻辑 |

---

## 二、路由设计规范

### 2.1 路由配置结构

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: '/user',
        name: 'User',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', requiresAuth: true },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

### 2.2 路由守卫规范

```typescript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = (to.meta.title as string) || '默认标题';

  // 权限校验
  if (to.meta.requiresAuth) {
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } });
      return;
    }
  }

  next();
});
```

---

## 三、组合式函数设计

### 3.1 组合式函数命名

- 文件名：`use*.ts` 或 `*.ts`
- 函数名：`use*` 或 `get*`

```typescript
// composables/usePagination.ts
export function usePagination<T = any>(
  fetchFn: (params: any) => Promise<T[]>
) {
  const loading = ref(false);
  const list = ref<T[]>([]) as Ref<T[]>;
  const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  async function loadData() {
    loading.value = true;
    try {
      const params = { ...pagination };
      const result = await fetchFn(params);
      list.value = result;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    pagination.page = 1;
    loadData();
  }

  return {
    loading,
    list,
    pagination,
    loadData,
    reset,
  };
}
```

### 3.2 组合式函数使用示例

```vue
<template>
  <div>
    <div v-for="item in list" :key="item.id">{{ item.name }}</div>
    <el-pagination
      v-model:current-page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @current-change="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { usePagination } from '@/composables/usePagination';
import { userApi } from '@/api/user';

const { loading, list, pagination, loadData, reset } = usePagination(userApi.list);

onMounted(() => {
  loadData();
});
</script>
```

---

## 四、类型定义规范

### 4.1 全局类型定义

```typescript
// types/global.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 4.2 业务类型定义

```typescript
// types/user.d.ts
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  createTime: string;
}

export type UserStatus = 0 | 1;

export interface UserListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface UserListResponse {
  list: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 五、环境配置规范

### 5.1 环境变量文件

```
.env                 # 默认配置
.env.development     # 开发环境
.env.test            # 测试环境
.env.production      # 生产环境
```

### 5.2 环境变量命名

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=开发环境

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=生产环境
```

### 5.3 TypeScript 类型提示

```typescript
// vite-env.d.ts
/// <reference types="vite/client" />

interface ViteEnv {
  VITE_API_BASE_URL: string;
  VITE_APP_TITLE: string;
}
```

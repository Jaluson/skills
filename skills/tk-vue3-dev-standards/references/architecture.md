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

### 2.3 路由懒加载与预加载优化

Vue Router 支持多种加载策略优化应用性能：

```typescript
// router/index.ts
import { defineAsyncComponent } from 'vue';

// 普通懒加载
const UserList = () => import('@/views/user/List.vue');

// 路由懒加载 + 预加载策略（Vite/Webpack 内置）
const ProductDetail = () => import(/* webpackChunkName: "product" */ '@/views/product/Detail.vue');

// 组件库统一分包
const ECharts = defineAsyncComponent(() =>
  import(/* webpackChunkName: "vendor-echarts" */ 'echarts')
);

// 预加载配置（Vite）
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  // 路由预加载插件
  plugins: [
    {
      name: 'route-prefetch',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // 预取逻辑
        });
      },
    },
  ],
});
```

**预加载策略对比：**

| 策略 | 实现方式 | 适用场景 |
|------|----------|----------|
| 懒加载 | `() => import()` | 非首屏路由 |
| 预取(prefetch) | `<link rel="prefetch">` | 预测用户下一步 |
| 预加载(preload) | `<link rel="preload">` | 首屏关键资源 |
| 懒加载+prefetch | `import(/* webpackPrefetch */ ...)` | 预测性加载 |

### 2.4 大型项目分包策略

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 框架核心
          if (id.includes('node_modules/vue')) {
            return 'vue-vendor';
          }
          // UI 组件库
          if (id.includes('node_modules/element-plus') ||
              id.includes('node_modules/@element-plus')) {
            return 'element-vendor';
          }
          // 图表库（体积大）
          if (id.includes('node_modules/echarts') ||
              id.includes('node_modules/zrender')) {
            return 'echarts-vendor';
          }
          // 工具函数库
          if (id.includes('node_modules/lodash') ||
              id.includes('node_modules/axios')) {
            return 'utils-vendor';
          }
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'other-vendor';
          }
        },
      },
    },
    // 包体积警告阈值
    chunkSizeWarningLimit: 600,
  },
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

// 环境变量类型（Vue 3.4+ 类型安全写法）
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_UPLOAD_URL?: string;
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
.env                 # 默认配置（所有环境共享）
.env.development    # 开发环境
.env.test            # 测试环境
.env.staging         # 预发布环境
.env.production      # 生产环境
```

### 5.2 环境变量命名规范

Vite 要求客户端可访问的环境变量必须以 `VITE_` 为前缀：

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=开发环境
VITE_ENABLE_DEBUG=true

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=生产应用
VITE_ENABLE_DEBUG=false

# .env 中的变量（仅服务端可用，不暴露给客户端）
# DB_PASSWORD=xxx
# API_SECRET=xxx
```

### 5.3 TypeScript 类型安全环境变量

```typescript
// vite-env.d.ts
/// <reference types="vite/client" />

// 定义环境变量类型
interface ViteEnv {
  VITE_API_BASE_URL: string;
  VITE_APP_TITLE: string;
  VITE_UPLOAD_URL?: string;
}

// 扩展 ImportMetaEnv
declare module 'vite/client' {
  interface ImportMetaEnv extends ViteEnv {}
}

// 使用示例
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const appTitle = import.meta.env.VITE_APP_TITLE;

// 类型错误：VITE_ 前缀不存在
// const secret = import.meta.env.SERVER_SECRET; // Error

// 安全访问模式
const uploadUrl = import.meta.env.VITE_UPLOAD_URL ?? '/api/upload';
```

### 5.4 多环境配置管理

```typescript
// config/env.ts
export function getEnvConfig(): ViteEnv {
  const env = import.meta.env;

  // 验证必需的环境变量
  const required: (keyof ViteEnv)[] = ['VITE_API_BASE_URL', 'VITE_APP_TITLE'];
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_APP_TITLE: env.VITE_APP_TITLE,
    VITE_UPLOAD_URL: env.VITE_UPLOAD_URL,
  };
}

// 在应用中使用
import { getEnvConfig } from '@/config/env';

const config = getEnvConfig();
console.log(config.VITE_API_BASE_URL);
```

### 5.5 环境变量安全最佳实践

```typescript
// ✅ 正确：使用 VITE_ 前缀暴露给客户端
const API_URL = import.meta.env.VITE_API_BASE_URL;

// ✅ 正确：运行时动态配置
const config = {
  apiUrl: window.__ENV__.API_URL,
};

// ❌ 错误：暴露敏感信息
// const SECRET = import.meta.env.MY_SECRET_KEY;

// ❌ 错误：在客户端代码中使用 .env 中的非 VITE_ 变量
// Vite 只处理 VITE_ 前缀的变量
```

---

## 六、性能优化

### 6.1 Bundle 分析工具

```typescript
// 使用 rollup-plugin-visualizer 分析包体积
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      reportDir: 'dist/report',
    }),
  ],
});

// 分析命令
// npx vite build && npx vite preview
```

### 6.2 路由级别代码分割

```typescript
// 路由组件使用 defineAsyncComponent 实现代码分割
const routes = [
  {
    path: '/dashboard',
    component: defineAsyncComponent({
      loader: () => import('./views/Dashboard.vue'),
      loadingComponent: LoadingSpinner,
      delay: 200,
    }),
  },
];

// 大型第三方库单独打包
const ChartComponent = defineAsyncComponent(() =>
  import(/* webpackChunkName: "charts" */ './components/Chart.vue')
);
```

### 6.3 组件级别 Tree-shaking

```typescript
// 确保按需引入组件
import { Button, Form, Input } from 'element-plus';

// 确保使用 unplugin-vue-components 自动导入
// vite.config.ts
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
});
```

### 6.4 资源优化

```typescript
// vite.config.ts
export default defineConfig({
  assetsInclude: ['**/*.webp', '**/*.avif'],

  build: {
    // 资源内联阈值
    assetsInlineLimit: 4096,

    // CSS 代码分割
    cssCodeSplit: true,

    // 压缩
    minify: 'esbuild',

    // 目标浏览器
    target: 'es2020',
  },
});
```

---

## 七、部署配置

### 7.1 基础路径配置

```typescript
// vite.config.ts
export default defineConfig({
  base: './', // 相对路径部署
  // base: '/my-app/', // 绝对路径部署
});
```

### 7.2 部署环境变量

```bash
# .env.production
VITE_API_BASE_URL=https://api.production.com
VITE_APP_TITLE=生产应用
```

```json
// package.json
{
  "scripts": {
    "build:test": "vue-tsc && vite build --mode test",
    "build:staging": "vue-tsc && vite build --mode staging",
    "build:production": "vue-tsc && vite build --mode production"
  }
}
```

---

## 八、目录结构示例

```
src/
├── api/                 # API 接口封装
│   ├── user.ts
│   └── order.ts
├── assets/              # 静态资源
│   ├── images/
│   └── styles/
├── components/          # 公共组件
│   ├── common/          # 通用组件
│   └── business/        # 业务组件
├── composables/         # 组合式函数
│   ├── usePagination.ts
│   └── useLoading.ts
├── config/              # 配置文件
│   └── env.ts          # 环境变量配置
├── constants/           # 常量定义
│   └── index.ts
├── directives/          # 自定义指令
├── hooks/              # 生命周期钩子
├── layouts/            # 布局组件
├── router/             # 路由配置
│   └── index.ts
├── stores/              # Pinia 状态管理
│   ├── user.ts
│   └── order.ts
├── types/               # TypeScript 类型定义
│   ├── api.d.ts
│   ├── user.d.ts
│   └── global.d.ts
├── utils/               # 工具函数
│   ├── request.ts
│   └── format.ts
├── views/               # 页面组件
│   ├── user/
│   └── order/
├── App.vue
└── main.ts
```

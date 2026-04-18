# Vue 3 测试规范详解

## 一、测试框架选择

| 测试类型 | 推荐框架 | 说明 |
|----------|----------|------|
| 单元测试 | Vitest | Vue 官方推荐，Vite 原生支持 |
| 组件测试 | Vue Test Utils + Vitest | 测试 Vue 组件 |
| E2E 测试 | Playwright / Cypress | 端到端测试 |

### 1.1 Vitest 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

```typescript
// src/test/setup.ts
import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

// 创建测试用 Pinia
beforeEach(() => {
  setActivePinia(createPinia());
});

// 全局组件注册（如果需要）
config.global.stubs = {
  teleport: true,
};
```

### 1.2 Vitest 进阶配置

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    // 全局测试超时时间
    testTimeout: 10000,
    hookTimeout: 10000,

    // 序列化和快照配置
    snapshotFormat: {
      printBasicPrototype: false,
    },

    //coverage 配置详解
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',

      // 覆盖率阈值（门禁要求）
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 80,
        lines: 70,

        // 允许新文件降低覆盖率
        allowEmptyCoverage: true,
      },

      // 排除文件
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
      ],

      // 包含文件
      include: [
        'src/**/*.{ts,tsx,vue}',
      ],

      // 跳过检查（开发时可设为 true）
      skipFull: false,
    },

    // CSS 模拟
    css: {
      modules: {
        classNameStrategy: 'anonymous',
      },
    },

    // 模拟文件配置
    mock: {
      '@vueuse/core': '/__mocks__/@vueuse/core.js',
    },
  },
});
```

### 1.3 Mock 工厂函数

```typescript
// test/mocks/axios.ts
import { vi } from 'vitest';
import axios from 'axios';

// 创建 Axios mock 工厂
export const createAxiosMock = () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();

  vi.spyOn(axios, 'create').mockReturnValue({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  } as any);

  return { mockGet, mockPost, mockPut, mockDelete };
};

// 使用示例
describe('API Tests', () => {
  let mocks: ReturnType<typeof createAxiosMock>;

  beforeEach(() => {
    mocks = createAxiosMock();
  });

  it('should fetch user data', async () => {
    const mockUser = { id: 1, name: 'Test User' };
    mocks.mockGet.mockResolvedValue({ data: mockUser });

    const result = await userApi.getById(1);
    expect(result).toEqual(mockUser);
  });
});
```

### 1.4 模块 Mock（vi.mock）

```typescript
// 测试文件
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 模拟整个模块
vi.mock('@/utils/request', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// 模拟动态导入
vi.mock('echarts', async () => {
  const actual = await vi.importActual('echarts');
  return {
    ...actual,
    init: vi.fn(),
  };
});

// 使用 vi.hoisted 进行依赖注入测试
describe('Store Tests', () => {
  const { useUserStore } = vi.hoisted(() => {
    const mockApi = {
      getUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
    };
    return { useUserStore: () => mockApi };
  });

  it('should fetch user', async () => {
    const store = useUserStore();
    await store.fetchUser();
    expect(store.user).toBeDefined();
  });
});
```

---

## 二、单元测试规范

### 2.1 测试文件组织

```
src/
├── components/
│   └── UserCard.vue
├── composables/
│   └── usePagination.ts
├── stores/
│   └── user.ts
└── test/
    ├── components/
    │   └── UserCard.spec.ts
    ├── composables/
    │   └── usePagination.spec.ts
    └── stores/
        └── user.spec.ts
```

### 2.2 MSW (Mock Service Worker) HTTP 拦截

MSW 可以在网络层拦截 HTTP 请求，适合真实的 API 测试场景：

```typescript
// test/msw/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: '张三' },
      { id: 2, name: '李四' },
    ]);
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: '测试用户' });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),
);

// 测试中使用
import { server } from '@/test/msw/server';

describe('API Integration Tests', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should fetch users', async () => {
    const users = await userApi.list();
    expect(users).toHaveLength(2);
  });
});
```

### 2.3 异步测试进阶

```typescript
describe('Async Tests', () => {
  // 等待特定条件
  it('should wait for data to load', async () => {
    const wrapper = mount(DataLoader);

    // 等待直到条件满足
    await wrapper.vm.waitForData();

    expect(wrapper.find('.data-list').exists()).toBe(true);
  });

  // 异步组件测试
  it('should handle async component', async () => {
    const AsyncComponent = defineAsyncComponent({
      loader: () => Promise.resolve({ template: '<div>Async</div>' }),
      loadingComponent: LoadingSpinner,
      errorComponent: ErrorBoundary,
      delay: 200,
      timeout: 3000,
    });

    const wrapper = mount({
      components: { AsyncComponent },
      template: '<AsyncComponent />',
    });

    // 显示加载状态
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true);

    // 等待异步组件加载完成
    await flushPromises();
    expect(wrapper.find('.async-content').exists()).toBe(true);
  });

  // 使用 flushPromises 确保所有 Promise 被处理
  it('should flush all promises', async () => {
    const wrapper = mount(UserCard);
    wrapper.vm.fetchData(); // 异步操作

    await flushPromises();

    expect(wrapper.emitted('loaded')).toBeTruthy();
  });
});
```

### 2.4 Composables 单元测试

```typescript
// composables/usePagination.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { usePagination } from '@/composables/usePagination';

describe('usePagination', () => {
  const mockFetchFn = vi.fn();

  it('should initialize with default values', () => {
    const { loading, list, pagination } = usePagination(mockFetchFn);

    expect(loading.value).toBe(false);
    expect(list.value).toEqual([]);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.total).toBe(0);
  });

  it('should fetch data successfully', async () => {
    const mockData = {
      list: [{ id: 1, name: 'Test' }],
      total: 1,
    };
    mockFetchFn.mockResolvedValue(mockData);

    const { loading, list, pagination, loadData } = usePagination(mockFetchFn);

    const promise = loadData();
    expect(loading.value).toBe(true);

    await promise;
    expect(loading.value).toBe(false);
    expect(list.value).toEqual(mockData.list);
    expect(pagination.total).toBe(1);
  });

  it('should reset pagination on reset()', async () => {
    const mockData = {
      list: [{ id: 1, name: 'Test' }],
      total: 1,
    };
    mockFetchFn.mockResolvedValue(mockData);

    const { pagination, loadData, reset } = usePagination(mockFetchFn);

    await loadData();
    expect(pagination.page).toBe(1);

    pagination.page = 2;
    reset();

    expect(mockFetchFn).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      total: 1,
    });
  });
});
```

---

## 三、组件测试规范

### 3.1 Slot 测试

```typescript
// components/BaseCard.vue
// <template>
//   <div class="card">
//     <header class="card-header">
//       <slot name="header">默认标题</slot>
//     </header>
//     <main class="card-body">
//       <slot />
//     </main>
//     <footer class="card-footer">
//       <slot name="footer" :user="user" />
//     </footer>
//   </div>
// </template>

describe('Slot Tests', () => {
  it('should render default slot content', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        default: '<p>默认内容</p>',
      },
    });

    expect(wrapper.find('.card-body p').text()).toBe('默认内容');
  });

  it('should render named slot content', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        header: '<h1>自定义标题</h1>',
        footer: '<button>操作</button>',
      },
    });

    expect(wrapper.find('.card-header h1').text()).toBe('自定义标题');
    expect(wrapper.find('.card-footer button').text()).toBe('操作');
  });

  it('should pass props to scoped slot', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        footer: ({ user }) => `<span>${user.name}</span>`,
      },
    });

    expect(wrapper.find('.card-footer span').text()).toBe('张三');
  });
});
```

### 3.2 Teleport 组件测试

```typescript
// components/Modal.vue
// <template>
//   <Teleport to="body">
//     <div v-if="visible" class="modal">
//       <slot />
//     </div>
//   </Teleport>
// </template>

describe('Teleport Tests', () => {
  it('should teleport content to body', async () => {
    const wrapper = mount(Modal, {
      props: { visible: true },
      slots: { default: '<p>Modal Content</p>' },
    });

    // Teleport 内容应该在 body 中
    expect(document.body.querySelector('.modal')).toBeTruthy();
    expect(document.body.querySelector('.modal p').textContent).toBe('Modal Content');
  });

  it('should remove teleport content when hidden', async () => {
    const wrapper = mount(Modal, {
      props: { visible: true },
      slots: { default: '<p>Modal Content</p>' },
    });

    expect(document.body.querySelector('.modal')).toBeTruthy();

    await wrapper.setProps({ visible: false });

    expect(document.body.querySelector('.modal')).toBeFalsy();
  });
});
```

### 3.3 provide/inject 测试

```typescript
// components/FormProvider.vue
// <template>
//   <form @submit.prevent="handleSubmit">
//     <slot />
//   </form>
// </template>
//
// <script setup>
// const props = defineProps<{ modelValue: FormData }>()
// const emit = defineEmits<{ 'update:modelValue': [FormData] }>()
// provide('formContext', { modelValue: props.modelValue, update: (val) => emit('update:modelValue', val) })
// </script>

describe('Provide/Inject Tests', () => {
  const FormProvider = {
    setup() {
      const formData = ref({ name: '', email: '' });
      provide('formContext', {
        modelValue: formData,
        update: (val) => { formData.value = val; },
      });
    },
    template: '<form @submit.prevent><slot /></form>',
  };

  const FormField = {
    inject: ['formContext'],
    props: ['field'],
    template: `
      <input
        :value="formContext.modelValue[field]"
        @input="formContext.update({ ...formContext.modelValue, [field]: $event.target.value })"
      />
    `,
  };

  it('should share state via provide/inject', async () => {
    const wrapper = mount(FormProvider, {
      components: { FormField },
      template: `
        <FormProvider>
          <FormField field="name" />
          <FormField field="email" />
        </FormProvider>
      `,
    });

    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('张三');
    expect(wrapper.vm.formContext.modelValue.name).toBe('张三');

    await inputs[1].setValue('zhangsan@example.com');
    expect(wrapper.vm.formContext.modelValue.email).toBe('zhangsan@example.com');
  });
});
```

### 3.4 组件测试示例

```vue
<!-- components/UserCard.vue -->
<template>
  <div class="user-card" :class="{ 'user-card--active': isActive }">
    <header class="user-card__header">
      <h3>{{ title }}</h3>
      <span class="user-card__status">{{ statusText }}</span>
    </header>

    <main class="user-card__body">
      <div v-for="item in items" :key="item.id" class="user-card__item">
        {{ item.name }}
      </div>
    </main>

    <footer class="user-card__footer">
      <el-button @click="handleConfirm">确认</el-button>
      <el-button @click="handleDelete(itemId)">删除</el-button>
    </footer>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  items: { id: number; name: string }[];
  status: 'pending' | 'success' | 'error';
  isActive?: boolean;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'delete', id: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
});

const emit = defineEmits<Emits>();

const itemId = computed(() => props.items[0]?.id ?? 0);

const statusText = computed(() => {
  const map = { pending: '处理中', success: '成功', error: '失败' };
  return map[props.status];
});

function handleConfirm() {
  emit('confirm');
}

function handleDelete(id: number) {
  emit('delete', id);
}
</script>
```

```typescript
// components/UserCard.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from './UserCard.vue';

describe('UserCard', () => {
  const defaultProps = {
    title: '测试标题',
    items: [
      { id: 1, name: '项目一' },
      { id: 2, name: '项目二' },
    ],
    status: 'pending' as const,
    isActive: false,
  };

  describe('Props', () => {
    it('should render title correctly', () => {
      const wrapper = mount(UserCard, {
        props: defaultProps,
      });

      expect(wrapper.find('h3').text()).toBe('测试标题');
    });

    it('should render items list', () => {
      const wrapper = mount(UserCard, {
        props: defaultProps,
      });

      const items = wrapper.findAll('.user-card__item');
      expect(items).toHaveLength(2);
      expect(items[0].text()).toBe('项目一');
    });

    it('should display correct status text', () => {
      const wrapper = mount(UserCard, {
        props: { ...defaultProps, status: 'success' },
      });

      expect(wrapper.find('.user-card__status').text()).toBe('成功');
    });

    it('should apply active class when isActive is true', () => {
      const wrapper = mount(UserCard, {
        props: { ...defaultProps, isActive: true },
      });

      expect(wrapper.find('.user-card').classes()).toContain('user-card--active');
    });
  });

  describe('Events', () => {
    it('should emit confirm event on confirm button click', async () => {
      const wrapper = mount(UserCard, {
        props: defaultProps,
      });

      await wrapper.find('button:contains("确认")').trigger('click');

      expect(wrapper.emitted('confirm')).toBeDefined();
      expect(wrapper.emitted('confirm')!).toHaveLength(1);
    });

    it('should emit delete event with item id on delete button click', async () => {
      const wrapper = mount(UserCard, {
        props: defaultProps,
      });

      await wrapper.find('button:contains("删除")').trigger('click');

      expect(wrapper.emitted('delete')).toBeDefined();
      expect(wrapper.emitted('delete')![0]).toEqual([1]);
    });
  });
});
```

---

## 四、Store 测试规范

### 4.1 Store 测试示例

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const token = ref<string>('');

  const isLoggedIn = computed(() => !!token.value);
  const username = computed(() => userInfo.value?.username ?? '');

  function setUserInfo(info: UserInfo) {
    userInfo.value = info;
  }

  function setToken(newToken: string) {
    token.value = newToken;
  }

  function logout() {
    userInfo.value = null;
    token.value = '';
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    username,
    setUserInfo,
    setToken,
    logout,
  };
});
```

```typescript
// stores/user.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '@/stores/user';

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('State', () => {
    it('should initialize with empty state', () => {
      const userStore = useUserStore();

      expect(userStore.userInfo).toBeNull();
      expect(userStore.token).toBe('');
      expect(userStore.isLoggedIn).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should set user info correctly', () => {
      const userStore = useUserStore();
      const mockUserInfo = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      userStore.setUserInfo(mockUserInfo);

      expect(userStore.userInfo).toEqual(mockUserInfo);
      expect(userStore.username).toBe('testuser');
    });

    it('should set token correctly', () => {
      const userStore = useUserStore();

      userStore.setToken('mock-token-123');

      expect(userStore.token).toBe('mock-token-123');
      expect(userStore.isLoggedIn).toBe(true);
    });

    it('should logout and clear state', () => {
      const userStore = useUserStore();

      userStore.setUserInfo({ id: 1, username: 'test', email: 'test@test.com' });
      userStore.setToken('token');
      userStore.logout();

      expect(userStore.userInfo).toBeNull();
      expect(userStore.token).toBe('');
      expect(userStore.isLoggedIn).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should return username from userInfo', () => {
      const userStore = useUserStore();
      userStore.setUserInfo({ id: 1, username: 'admin', email: 'admin@test.com' });

      expect(userStore.username).toBe('admin');
    });

    it('should return empty string when userInfo is null', () => {
      const userStore = useUserStore();

      expect(userStore.username).toBe('');
    });
  });
});
```

---

## 五、E2E 测试规范

### 5.1 Playwright 配置

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 E2E 测试示例

```typescript
// e2e/user.spec.ts
import { test, expect } from '@playwright/test';

test.describe('用户管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user');
  });

  test('应该显示用户列表', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('用户管理');

    const rows = page.locator('.user-table__row');
    await expect(rows.first()).toBeVisible();
  });

  test('应该能搜索用户', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索用户"]');
    await searchInput.fill('admin');
    await page.locator('button:has-text("搜索")').click();

    await expect(page.locator('.user-table__row')).toHaveCount(1);
  });

  test('应该能创建新用户', async ({ page }) => {
    await page.locator('button:has-text("新增用户")').click();

    await page.locator('input[v-model="form.username"]').fill('newuser');
    await page.locator('input[v-model="form.email"]').fill('new@example.com');
    await page.locator('button:has-text("保存")').click();

    await expect(page.locator('.el-message')).toContainText('创建成功');
  });
});
```

### 5.3 Playwright API Testing

```typescript
// e2e/api.spec.ts
import { test, expect, request } from '@playwright/test';

test.describe('API Testing', () => {
  test('should perform REST API testing', async () => {
    const ctx = await request.newContext();

    // GET 请求
    const getResponse = await ctx.get('/api/users');
    expect(getResponse.ok()).toBeTruthy();
    expect(getResponse.status()).toBe(200);
    const users = await getResponse.json();
    expect(users).toHaveLength(10);

    // POST 请求
    const postResponse = await ctx.post('/api/users', {
      data: {
        name: 'New User',
        email: 'new@example.com',
      },
    });
    expect(postResponse.status()).toBe(201);
    const newUser = await postResponse.json();
    expect(newUser.name).toBe('New User');

    // PUT 请求
    const putResponse = await ctx.put('/api/users/1', {
      data: { name: 'Updated User' },
    });
    expect(putResponse.status()).toBe(200);

    // DELETE 请求
    const deleteResponse = await ctx.delete('/api/users/1');
    expect(deleteResponse.status()).toBe(204);

    await ctx.dispose();
  });
});
```

### 5.4 Playwright 请求拦截

```typescript
// e2e/intercept.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Request Interception', () => {
  test('should mock API response', async ({ page }) => {
    // 拦截并修改响应
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 1, name: 'Mocked User 1' },
          { id: 2, name: 'Mocked User 2' },
        ]),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await page.goto('/users');

    // 验证使用的是 mock 数据
    await expect(page.locator('.user-name').first()).toHaveText('Mocked User 1');
  });

  test('should intercept and modify request', async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      // 修改查询参数
      url.searchParams.set('page', '2');

      // 继续请求
      const response = await route.fetch({ url: url.toString() });
      const json = await response.json();

      // 修改响应数据
      json.push({ id: 999, name: 'Injected User' });

      route.fulfill({
        status: 200,
        body: JSON.stringify(json),
      });
    });

    await page.goto('/users');
  });

  test('should abort request', async ({ page }) => {
    // 中止特定请求
    await page.route('**/analytics/**', (route) => {
      route.abort();
    });

    await page.goto('/dashboard');
  });
});
```

### 5.5 Visual Regression Testing

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// 使用 Playwright 内置截图功能进行视觉回归测试
test.describe('Visual Regression', () => {
  test('should match baseline screenshots', async ({ page }) => {
    await page.goto('/dashboard');

    // 全页面截图
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.1, // 允许 10% 的像素差异
    });

    // 元素截图
    const header = page.locator('.app-header');
    await expect(header).toHaveScreenshot('header.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('should handle dynamic content', async ({ page }) => {
    await page.goto('/dashboard');

    // 使用 ignore 选项排除动态内容
    await expect(page).toHaveScreenshot('dashboard.png', {
      ignore: [
        '.timestamp',      // 忽略时间戳
        '.analytics-data', // 忽略分析数据
      ],
    });
  });
});

// 截图管理命令
// npx playwright test --update-snapshots  更新基线截图
// npx playwright show-report              查看测试报告
```

### 5.6 测试数据管理

```typescript
// e2e/fixtures.ts
import { test as base, Page } from '@playwright/test';

// 自定义 fixture
export const testWithAuth = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // 登录
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await use(page);

    // 清理
    await page.evaluate(() => localStorage.clear());
  },
});

// 使用
testWithAuth('should access protected route', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/settings');
  await expect(authenticatedPage.locator('h1')).toHaveText('设置');
});
```

### 5.7 并行执行与 CI 集成

```typescript
// playwright.config.ts
export default defineConfig({
  // 并行执行
  fullyParallel: true,        // 启用并行
  workers: process.env.CI ? 4 : undefined, // CI 环境使用 4 个 worker

  // 重试配置
  retries: process.env.CI ? 2 : 0,

  // 报告
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // 全局超时
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
```

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 分片执行

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
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

---

## 六、测试覆盖率要求

### 6.1 覆盖率指标

| 类型 | 目标 | 说明 |
|------|------|------|
| 行覆盖率 | ≥ 70% | 新增代码必须达标 |
| 分支覆盖率 | ≥ 60% | 条件分支覆盖 |
| 函数覆盖率 | ≥ 80% | 每个函数都要测试 |

### 6.2 覆盖率配置详解

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // 输出目录
      reportsDirectory: 'coverage',

      // 阈值配置（门禁要求）
      thresholds: {
        // 全局阈值
        statements: 70,
        branches: 60,
        functions: 80,
        lines: 70,

        // 按文件或目录设置阈值
        perFile: true,
        'src/utils/**/*.ts': {
          statements: 90,
          branches: 80,
        },
        'src/composables/**/*.ts': {
          statements: 80,
          branches: 70,
        },

        // 允许空覆盖率的阈值
        allowEmptyCoverage: true,
      },

      // 排除文件
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/mock/**',
        '**/mocks/**',
      ],

      // 包含文件
      include: [
        'src/**/*.{ts,tsx,vue}',
      ],
    },
  },
});
```

### 6.3 SonarQube 集成

```typescript
// vitest.config.ts (使用 @vitest/coverage-v8)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'cobertura'], // SonarQube 支持的格式
      reportsDirectory: 'coverage',
    },
  },
});
```

```json
// sonar-project.properties
sonar.sources=src
sonar.tests=test
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
sonar.coverage.thresholds.line=70
sonar.coverage.thresholds.branch=60
```

### 6.4 覆盖率门禁工作流

```yaml
# .github/workflows/coverage.yml
name: Coverage Check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  coverage:
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

      - name: Run tests with coverage
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Check coverage thresholds
        run: |
          npx vitest run --coverage && coverage-threshold-check \
            --branches 60 \
            --functions 80 \
            --lines 70 \
            --statements 70
```

---

## 七、测试命名规范

### 7.1 测试函数命名

```typescript
// 描述性命名
describe('usePagination', () => {
  it('应该初始化为默认分页参数', () => { });
  it('应该正确加载数据列表', () => { });
  it('应该在加载失败时设置错误状态', () => { });
  it('重置方法应该将页码重置为1', () => { });
});

// BDD 风格
describe('UserCard', () => {
  describe('Props', () => {
    it('should render title correctly', () => { });
  });

  describe('Events', () => {
    it('should emit confirm event', () => { });
  });
});
```

### 7.2 测试文件命名

```
xxx.spec.ts       # 单元测试
xxx.e2e.ts        # E2E 测试
xxx.integration.ts # 集成测试
```

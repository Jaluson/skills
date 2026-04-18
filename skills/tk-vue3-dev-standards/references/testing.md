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

### 2.2 Composables 单元测试

```typescript
// composables/usePagination.ts
export function usePagination<T>(
  fetchFn: (params: any) => Promise<{ list: T[]; total: number }>
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
      const result = await fetchFn({ ...pagination });
      list.value = result.list;
      pagination.total = result.total;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    pagination.page = 1;
    loadData();
  }

  return { loading, list, pagination, loadData, reset };
}
```

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

### 3.1 组件测试示例

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

---

## 六、测试覆盖率要求

### 6.1 覆盖率指标

| 类型 | 目标 | 说明 |
|------|------|------|
| 行覆盖率 | ≥ 70% | 新增代码必须达标 |
| 分支覆盖率 | ≥ 60% | 条件分支覆盖 |
| 函数覆盖率 | ≥ 80% | 每个函数都要测试 |

### 6.2 覆盖率配置

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 80,
        lines: 70,
      },
    },
  },
});
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

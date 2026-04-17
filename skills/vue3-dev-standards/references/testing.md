# Vue 3 测试策略

## 目录

- [测试分层体系](#测试分层体系)
- [测试框架选型](#测试框架选型)
- [组件测试](#组件测试)
- [Composable 测试](#composable-测试)
- [Store 测试](#store-测试)
- [工具函数测试](#工具函数测试)
- [测试在流水线中的位置](#测试在流水线中的位置)

---

## 测试分层体系

```
        ┌─────────────┐
        │   E2E 测试   │  ← 少量，覆盖核心用户路径
        │  （Playwright）│
        └──────┬──────┘
               │
      ┌────────┴────────┐
      │   集成测试        │  ← 适量，覆盖组件交互和模块集成
      │（Vue Test Utils） │
      └────────┬────────┘
               │
   ┌───────────┴───────────┐
   │   单元测试              │  ← 大量，覆盖 composable、utils、store
   │（Vitest + Vue Test Utils）│
   └───────────────────────┘
```

**投资比例**：单元测试 70% + 集成测试 20% + E2E 测试 10%

---

## 测试框架选型

### 推荐配置

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/main.ts', 'src/router/index.ts'],
    },
  },
})
```

### 依赖清单

```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@vue/test-utils": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "jsdom": "^24.x",
    "msw": "^2.x"
  }
}
```

---

## 组件测试

### 什么时候需要测试

| 组件类型 | 是否需要测试 | 测试重点 |
|----------|------------|---------|
| 通用组件 | 必须 | props 渲染、事件触发、插槽、边界情况 |
| 业务组件（有逻辑） | 推荐 | 用户交互 → 状态变更 → UI 更新的完整路径 |
| 页面组件 | 按需 | 路由集成、数据加载（通常交给 E2E） |
| 纯展示组件（无逻辑） | 可选 | 快照测试即可 |

### 展示型组件测试

```ts
// shared/components/StatusBadge.test.ts
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('渲染 active 状态的文本和样式', () => {
    const { container, getByText } = render(StatusBadge, {
      props: { status: 'active' },
    })
    expect(getByText('活跃')).toBeTruthy()
    expect(container.querySelector('.badge--success')).toBeTruthy()
  })

  it('隐藏文本时只渲染徽标', () => {
    const { container } = render(StatusBadge, {
      props: { status: 'active', showText: false },
    })
    expect(container.textContent).toBe('')
    expect(container.querySelector('.badge')).toBeTruthy()
  })

  it('支持不同尺寸', () => {
    const { container } = render(StatusBadge, {
      props: { status: 'active', size: 'sm' },
    })
    expect(container.querySelector('.badge--sm')).toBeTruthy()
  })
})
```

### 交互型组件测试

```ts
// shared/components/DropdownMenu.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/vue'
import DropdownMenu from './DropdownMenu.vue'

const items = [
  { id: '1', name: '选项一' },
  { id: '2', name: '选项二' },
]

describe('DropdownMenu', () => {
  it('点击后展开选项列表', async () => {
    const { container, getByText } = render(DropdownMenu, {
      props: { items, itemKey: 'id' },
    })

    // 初始状态：选项不可见
    expect(container.querySelector('.dropdown--open')).toBeNull()

    // 点击触发器
    await fireEvent.click(getByText('请选择'))

    // 展开后：选项可见
    expect(getByText('选项一')).toBeTruthy()
    expect(getByText('选项二')).toBeTruthy()
  })

  it('选择一个选项后关闭并发送事件', async () => {
    const onSelect = vi.fn()
    const { getByText } = render(DropdownMenu, {
      props: { items, itemKey: 'id' },
      attrs: { onSelect },
    })

    await fireEvent.click(getByText('请选择'))
    await fireEvent.click(getByText('选项一'))

    expect(onSelect).toHaveBeenCalledWith(items[0])
  })
})
```

### 表单组件测试

```ts
// features/user/components/UserForm.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/vue'
import UserForm from './UserForm.vue'

describe('UserForm', () => {
  it('空表单提交不发送事件，显示校验错误', async () => {
    const onSubmit = vi.fn()
    const { getByText, container } = render(UserForm, {
      attrs: { onSubmit },
    })

    await fireEvent.click(getByText('提交'))

    expect(onSubmit).not.toHaveBeenCalled()
    // 应该出现校验提示
    expect(container.textContent).toContain('必填')
  })

  it('填写有效数据后提交发送正确的事件', async () => {
    const onSubmit = vi.fn()
    const { getByText, getByLabelText } = render(UserForm, {
      attrs: { onSubmit },
    })

    await fireEvent.update(getByLabelText('用户名'), '张三')
    await fireEvent.update(getByLabelText('邮箱'), 'zhangsan@test.com')
    await fireEvent.click(getByText('提交'))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '张三',
        email: 'zhangsan@test.com',
      })
    )
  })

  it('编辑模式回填初始数据', async () => {
    const { getByLabelText } = render(UserForm, {
      props: {
        initialData: { name: '李四', email: 'lisi@test.com' },
      },
    })

    expect((getByLabelText('用户名') as HTMLInputElement).value).toBe('李四')
    expect((getByLabelText('邮箱') as HTMLInputElement).value).toBe('lisi@test.com')
  })
})
```

---

## Composable 测试

Composable 是纯逻辑，最容易测试，也是投入产出比最高的测试类型。

### 基础数据获取 composable

```ts
// composables/useUser.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUser } from './useUser'

// mock API
vi.mock('@/api/user', () => ({
  getUserInfo: vi.fn(),
}))

import { getUserInfo } from '@/api/user'

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态为 loading', () => {
    const mockUser = { id: '1', name: '张三' }
    vi.mocked(getUserInfo).mockReturnValue(new Promise(() => {})) // 永远 pending

    const { loading, user, error } = useUser(ref('1'))

    expect(loading.value).toBe(true)
    expect(user.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('加载成功后设置 user 和 loading', async () => {
    const mockUser = { id: '1', name: '张三' }
    vi.mocked(getUserInfo).mockResolvedValue(mockUser)

    const { user, loading } = useUser(ref('1'))

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })

    expect(user.value).toEqual(mockUser)
  })

  it('加载失败后设置 error', async () => {
    vi.mocked(getUserInfo).mockRejectedValue(new Error('网络错误'))

    const { error, loading } = useUser(ref('1'))

    await vi.waitFor(() => {
      expect(loading.value).toBe(false)
    })

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value!.message).toBe('网络错误')
  })
})
```

### 表单 composable 测试

```ts
// composables/useOrderForm.test.ts
import { describe, it, expect } from 'vitest'
import { useOrderForm } from './useOrderForm'

describe('useOrderForm', () => {
  it('初始状态为空表单', () => {
    const { form, errors } = useOrderForm()
    expect(form.name).toBe('')
    expect(errors.value).toEqual({})
  })

  it('验证失败时填充 errors', () => {
    const { validate, errors } = useOrderForm()
    const valid = validate()
    expect(valid).toBe(false)
    expect(Object.keys(errors.value).length).toBeGreaterThan(0)
  })

  it('reset 恢复初始状态', () => {
    const { form, reset } = useOrderForm()
    form.name = '测试订单'
    reset()
    expect(form.name).toBe('')
  })

  it('传入 initialData 时正确回填', () => {
    const initial = { name: '已有订单', quantity: 5 }
    const { form } = useOrderForm(initial)
    expect(form.name).toBe('已有订单')
    expect(form.quantity).toBe(5)
  })
})
```

---

## Store 测试

```ts
// stores/user.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user'

vi.mock('@/api/user', () => ({
  loginApi: vi.fn(),
  getUserInfo: vi.fn(),
}))

import { loginApi, getUserInfo } from '@/api/user'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('login 成功后设置 token 和 user', async () => {
    vi.mocked(loginApi).mockResolvedValue({
      token: 'test-token',
      user: { id: '1', name: '张三' },
    })

    const store = useUserStore()
    await store.login({ username: 'zhangsan', password: '123456' })

    expect(store.token).toBe('test-token')
    expect(store.isLoggedIn).toBe(true)
  })

  it('logout 清除所有状态', async () => {
    vi.mocked(loginApi).mockResolvedValue({
      token: 'test-token',
      user: { id: '1', name: '张三' },
    })

    const store = useUserStore()
    await store.login({ username: 'zhangsan', password: '123456' })
    store.logout()

    expect(store.token).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })
})
```

---

## 工具函数测试

```ts
// utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency } from './format'

describe('formatDate', () => {
  it('格式化日期字符串', () => {
    expect(formatDate('2024-01-15T10:30:00Z')).toBe('2024-01-15')
  })

  it('处理空值', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})

describe('formatCurrency', () => {
  it('格式化金额', () => {
    expect(formatCurrency(1234.5)).toBe('¥1,234.50')
  })

  it('处理零值', () => {
    expect(formatCurrency(0)).toBe('¥0.00')
  })

  it('处理负数', () => {
    expect(formatCurrency(-100)).toBe('-¥100.00')
  })
})
```

---

## 测试在流水线中的位置

### 阶段映射

| 流水线阶段 | 测试活动 | 何时执行 |
|-----------|---------|---------|
| P3 编码实现 | 新增 composable/utils 时同步编写单元测试 | 每个文件完成后 |
| P4 编译验证 | 运行全量测试套件 `vitest run` | P4 编译验证通过后 |
| P5 需求回验 | 验证测试覆盖了所有需求点 | P5 需求回验阶段 |
| P6 最终审查 | 检查测试覆盖率报告 | P6 代码质量终审 |

### P4 验证新增步骤

在 P4.1 执行验证命令中，类型检查和构建检查之后，增加测试运行：

```bash
# 4. 单元测试（如果有 vitest 配置）
npx vitest run
```

### 测试覆盖率要求

| 模块类型 | 最低行覆盖率 | 说明 |
|----------|------------|------|
| 通用组件 | 80% | 核心复用组件，必须充分测试 |
| Composables | 80% | 纯逻辑，测试投入产出比最高 |
| Store | 70% | 关注 action 副作用 |
| Utils | 90% | 纯函数，测试最简单 |
| 业务组件 | 50% | 重点测交互逻辑，不追求模板覆盖率 |
| 页面组件 | 不强制 | 通常通过 E2E 覆盖 |

### P6 交付输出新增项

在交付输出中增加测试报告：

```
6. **测试报告**：
   - 新增测试用例数 / 失败数
   - 覆盖率摘要（如已配置）
   - 未覆盖的关键逻辑说明（如有）
```

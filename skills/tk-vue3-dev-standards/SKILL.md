---
name: tk-vue3-dev-standards
description: Vue 3 + TypeScript 开发规约。触发：Vue/前端代码编写、组件设计、状态管理、路由、样式、测试。
version: 2.0.0
---

# Vue 3 开发规约（强制执行）

> 本文件是**必须遵守的指令**，不是参考文档。AI 在任何涉及 Vue 3/前端代码的任务中必须严格遵循以下规则。

---

## 第零条：铁律（违反即为任务失败）

### 0.1 编译验证（强制）
- 代码编写完毕后**必须**执行编译验证
- **验证命令**（按顺序执行）：
  1. `vue-tsc --noEmit` — TypeScript 类型检查，0 错误
  2. `npm run lint` — ESLint 检查，0 Error
  3. `npm run build` — 生产构建，编译成功
- **任何一步失败都必须修复后才能声称任务完成**

### 0.2 组件规范（强制）
- **必须**使用 `<script setup lang="ts">` + Composition API
- **禁止**使用 Options API
- **禁止**使用 `any` 类型
- 单组件不超过 300 行，超过必须拆分

### 0.3 样式隔离（强制）
- **必须**使用 `<style scoped>` 避免样式污染
- 深度选择器使用 `:deep()` 而非 `::v-deep` 或 `/deep/`

### 0.4 类型安全（强制）
- Props **必须**使用 TypeScript 泛型定义
- Emits **必须**使用 TypeScript 类型定义
- API 请求/响应**必须**有类型定义
- **禁止** `any`、`@ts-ignore`、`as any`

---

## 一、项目结构规约

### 1.1 标准目录
```
src/
├── api/           # API 接口封装（按模块拆分文件）
├── assets/        # 静态资源（images/styles）
├── components/    # 公共组件（common/通用, business/业务）
├── composables/   # 组合式函数（useXxx.ts）
├── config/        # 配置文件
├── constants/     # 常量定义
├── layouts/       # 布局组件
├── router/        # 路由配置
├── stores/        # Pinia 状态管理（按业务域拆分）
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数（request.ts 等）
├── views/         # 页面组件（按模块目录组织）
├── App.vue
└── main.ts
```

### 1.2 文件命名
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase.vue | UserCard.vue |
| 组合式函数 | camelCase.ts (use前缀) | usePagination.ts |
| Store | camelCase.ts | userStore.ts |
| 工具函数 | camelCase.ts | formatDate.ts |
| 类型定义 | camelCase.d.ts | user.d.ts |
| 样式 | kebab-case | user-card.css |
| API 模块 | camelCase.ts | userApi.ts |

---

## 二、组件设计规约

### 2.1 组件模板
```vue
<script setup lang="ts">
// ✅ 正确写法：TypeScript 泛型 Props + Emits
interface Props {
  title: string;
  count?: number;
  items: UserItem[];
  status: 'pending' | 'success' | 'error';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  confirm: [];
  delete: [id: number];
}>();

const statusText = computed(() => {
  const map = { pending: '处理中', success: '成功', error: '失败' };
  return map[props.status];
});
</script>

<template>
  <div class="user-card">
    <h3>{{ title }}</h3>
    <div v-for="item in items" :key="item.id">{{ item.name }}</div>
  </div>
</template>

<style scoped>
.user-card { padding: 16px; }
</style>
```

### 2.2 组件分类
| 类型 | 位置 | 职责 |
|------|------|------|
| 通用组件 | components/common/ | 跨项目复用，禁止含业务逻辑 |
| 业务组件 | components/business/ | 特定业务，可调用 API |
| 页面组件 | views/ | 路由页面，组合子组件 |

### 2.3 组件通信
| 场景 | 方式 |
|------|------|
| 父→子 | Props |
| 子→父 | defineEmits |
| 跨层级 | provide/inject + InjectionKey |
| 全局状态 | Pinia Store |

---

## 三、状态管理规约 (Pinia)

- 按业务域划分 Store，禁止集中一个文件
- 使用 Setup Store 风格（函数式 defineStore）
- 页面私有状态放在组件内部，全局共享才进 Store

```typescript
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const token = ref<string>('');
  const isLoggedIn = computed(() => !!token.value);

  async function login(credentials: LoginDTO) { /* ... */ }
  function logout() { userInfo.value = null; token.value = ''; }

  return { userInfo, token, isLoggedIn, login, logout };
});
```

---

## 四、API 调用规约

- 请求封装在 `utils/request.ts`（axios 拦截器统一处理 token、错误）
- API 模块化，按业务拆分到 `api/` 目录
- 请求/响应必须有 TypeScript 类型定义
- Token 不得硬编码，从 Store 或环境变量获取

---

## 五、样式规范

- 使用 BEM 或 kebab-case 命名（`.user-card__header`）
- 禁止驼峰命名样式（`.userCard`）
- 公共变量放在 `assets/styles/variables.scss`
- 使用 `:deep()` 穿透第三方组件样式

---

## 六、测试规约

- 单元测试：Vitest + Vue Test Utils
- E2E 测试：Playwright
- 组件测试：验证渲染、Props、Emits
- Store 测试：验证 State/Getters/Actions
- 覆盖率：行 >= 70%，分支 >= 60%，函数 >= 80%

---

## 七、Git 提交规约

```
<type>(<scope>): <subject>

类型：feat | fix | docs | style | refactor | test | chore
示例：feat(user): 添加用户注册页面
```

---

## 八、代码审查检查清单

| 检查项 | 标准 | 等级 |
|--------|------|------|
| Props 类型 | TypeScript 泛型定义，无 any | 严重 |
| 编译方式 | `<script setup lang="ts">` | 严重 |
| 组件行数 | <= 300 行 | 中等 |
| 样式隔离 | `<style scoped>` | 中等 |
| Store 划分 | 按业务域，非全局集中 | 严重 |
| API 类型 | 请求/响应有类型定义 | 严重 |
| 敏感信息 | Token 等不硬编码 | 严重 |

---

## 九、任务交付物（代码修改时必须输出）

| 交付物 | 时机 | 说明 |
|--------|------|------|
| 接口文档 | 修改/新增 API 调用时 | URL、参数、响应类型 |
| Curl 测试命令 | 修改/新增 API 时 | 可直接复制使用 |
| 测试用例说明 | 修改/新增功能时 | 覆盖正常/异常/边界 |
| **编译验证** | **代码编写完毕后** | **`vue-tsc` + `lint` + `build` 必须通过** |

---

## 完成前自检（必须逐项确认）

> 任务结束前，AI 必须确认以下所有项目：

- [ ] 编译验证已通过（`vue-tsc --noEmit` + `npm run lint` + `npm run build`）
- [ ] 使用 `<script setup lang="ts">` + Composition API
- [ ] Props/Emits 有 TypeScript 类型定义，无 any
- [ ] 组件不超过 300 行
- [ ] 样式使用 `<style scoped>`
- [ ] Store 按业务域划分
- [ ] API 调用有类型定义
- [ ] 无硬编码敏感信息
- [ ] 已输出接口文档/Curl/测试用例（如适用）

---

## 关联文件

- `references/architecture.md` - 架构设计详细规范
- `references/code-standards.md` - 代码编写规范详解
- `references/testing.md` - 测试规范详解
- `references/quality-gates.md` - 质量门禁标准

---
name: tk-vue3-dev-standards
description: |
  Vue 3 + TypeScript 开发全面规约技能。**必须使用此 skill 进行任何 Vue/前端代码的审查、重构、新功能开发任务**。当用户讨论 Vue 3 项目开发、Vue 组件设计、TypeScript 类型规范、Pinia 状态管理、Vue Router 路由设计、前端代码规范、样式规范、单元测试、E2E 测试等场景时触发。适用于代码审查、开发规约检查、Vue 项目结构评审、组件设计评审等任务。**特别适用场景：组件代码审查、Store 设计、Composable 函数编写、Vitest 测试用例编写**。
version: 1.2.0
---

# Vue 3 开发规约

本 skill 提供 Vue 3 开发的全面规约指导，涵盖项目结构、组件设计、TypeScript 类型规范、状态管理、样式规范、API 调用、测试要求及 Git 提交规范。

## 触发场景

当用户进行以下操作时自动触发：
- Vue 3 / TypeScript 项目代码审查
- Vue 组件设计与拆分
- Pinia Store 设计与规范
- Vue Router 路由设计
- 前端代码规范检查
- 组件单元测试 / E2E 测试编写
- CSS / SCSS 样式规范
- **任何涉及前端 Vue 代码修改的任务**

---

## 一、项目结构规约

### 1.1 标准目录结构

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
│   └── index.ts
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

### 1.2 文件命名规范

| 类型 | 规约 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.vue | UserCard.vue |
| 组合式函数 | camelCase.ts | usePagination.ts |
| Store 文件 | camelCase.ts | userStore.ts |
| 工具函数 | camelCase.ts | formatDate.ts |
| 类型定义 | camelCase.d.ts | user.d.ts |
| 样式文件 | kebab-case.css | user-card.css |
| 路由配置 | index.ts | router/index.ts |
| API 模块 | camelCase.ts | userApi.ts |

---

## 二、组件设计规约

### 2.1 组件拆分原则

**单一职责原则：**
- 每个组件不超过 300 行代码
- 超过则考虑拆分为更小的子组件
- 按功能/视图区块拆分，而非按数据类型

**组件分类：**
| 类型 | 存放位置 | 说明 |
|------|----------|------|
| 通用组件 | components/common/ | 可跨项目复用 |
| 业务组件 | components/business/ | 特定业务使用 |
| 页面组件 | views/ | 对应路由页面 |

### 2.2 组件命名规范

```typescript
// ✅ 正确：使用 PascalCase 或 kebab-case
// UserCard.vue
// user-card.vue

// ❌ 错误：随意命名
// userCard.vue (应使用 PascalCase)
// card.vue (名称过于模糊)

// 组件名应该是有意义的名词
// ✅ UserCard、OrderList、ProductDetail
// ❌ Card、List、Detail
```

### 2.3 Props 设计规范

```typescript
// ✅ 正确：使用 TypeScript 泛型定义
interface Props {
  title: string;
  count?: number;          // 可选属性
  items: UserItem[];       // 数组类型
  onClick?: () => void;    // 回调函数
  status: 'pending' | 'success' | 'error'; // 联合类型
}

// ❌ 错误：使用 any 或缺少类型
// props: any
// props: { [key: string]: any }
```

### 2.4 事件设计规范

```typescript
// ✅ 正确：使用 emit 定义事件
const emit = defineEmits<{
  (e: 'update', value: string): void;
  (e: 'delete', id: number): void;
  (e: 'click', event: MouseEvent): void;
}>();

// 组件使用
emit('update', newValue);
emit('delete', itemId);

// ❌ 错误：随意使用 $emit
// this.$emit('update', value);
```

---

## 三、TypeScript 类型规范

### 3.1 类型定义位置

| 类型 | 定义位置 |
|------|----------|
| API 请求/响应类型 | types/api/*.d.ts |
| 组件 Props/Emits | 组件内部或 types/components/*.d.ts |
| Store 状态类型 | stores/*.ts 内置类型 |
| 业务实体类型 | types/models/*.d.ts |
| 全局通用类型 | types/global.d.ts |

### 3.2 接口命名规范

```typescript
// ✅ 正确：使用有意义的命名
interface UserInfo {
  id: number;
  username: string;
  email: string;
}

interface UserListResponse {
  list: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ❌ 错误：过于简略或模糊
// interface User {}
// interface Res {}
```

### 3.3 泛型约束

```typescript
// ✅ 正确：使用泛型约束
function getData<T extends { id: number }>(item: T): T {
  return item;
}

// ✅ 正确：泛型默认类型
interface ApiResult<T = any> {
  code: number;
  data: T;
}

// ❌ 错误：使用 any 过多
// function fetchData(): any { }
```

---

## 四、状态管理规约 (Pinia)

### 4.1 Store 设计原则

- 按业务域划分 Store，避免集中一个文件
- Store 保持简洁，只存储全局共享状态
- 页面私有状态放在组件内部

### 4.2 Store 命名与结构

```typescript
// stores/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo } from '@/types/user';

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref<UserInfo | null>(null);
  const token = ref<string>('');

  // Getters
  const isLoggedIn = computed(() => !!token.value);
  const username = computed(() => userInfo.value?.username ?? '');

  // Actions
  async function fetchUserInfo() {
    const res = await userApi.getInfo();
    userInfo.value = res.data;
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
    fetchUserInfo,
    setToken,
    logout,
  };
});
```

---

## 五、样式规范

### 5.1 样式文件组织

```
styles/
├── variables.scss    # CSS 变量
├── mixins.scss       # 混入
├── reset.scss        # 重置样式
└── common.scss       # 公共样式
```

### 5.2 样式命名规范

```scss
// ✅ 正确：使用 BEM 或 kebab-case
.user-card {
  &__header { }
  &__body { }
  &--active { }
}

// 或者 kebab-case
.user-card-header { }
.user-card-body { }

// ❌ 错误：驼峰命名、随意缩写
// .userCard { }
// .uh { }
```

### 5.3 样式隔离

```vue
<!-- ✅ 正确：使用 scoped -->
<template>
  <div class="user-card">...</div>
</template>

<style scoped>
.user-card {
  padding: 16px;
}
</style>

<!-- ✅ 正确：深度选择器 -->
<style scoped>
:deep(.el-input) {
  width: 100%;
}
</style>
```

---

## 六、编译验证要求（强制）

### 6.1 编译检查

**代码编写完毕后必须执行编译验证，确保代码正常：**

```bash
# 1. TypeScript 类型检查
vue-tsc --noEmit

# 2. ESLint 检查
npm run lint

# 3. 生产构建
npm run build
```

**编译通过标准：**
- TypeScript 类型检查：0 错误
- ESLint 检查：0 Error
- 生产构建：编译成功，无警告

### 6.2 编译验证流程

```
代码编写完成
    ↓
执行 vue-tsc --noEmit 类型检查
    ↓
检查类型检查结果
    ↓
失败 → 修复类型错误 → 重新检查
    ↓
执行 npm run lint
    ↓
失败 → 修复 lint 错误 → 重新检查
    ↓
执行 npm run build
    ↓
失败 → 修复构建错误 → 重新构建
    ↓
全部通过 → 继续下一步
```

### 6.3 编译失败处理

| 错误类型 | 处理方式 |
|----------|----------|
| 类型错误 | 检查 Props/Emits 类型定义、泛型约束 |
| 导入错误 | 检查路径别名、文件扩展名 |
| ESLint 错误 | 按照 lint 提示修复代码风格问题 |
| 构建失败 | 检查依赖完整性、Vite 配置 |
| 样式编译错误 | 检查 SCSS 语法、CSS 变量引用 |

**编译未通过前禁止：**
- 提交代码
- 运行测试
- 部署

---

## 七、API 调用规范

### 7.1 请求封装

```typescript
// utils/request.ts
import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { useUserStore } from '@/stores/user';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, data } = response.data;
    if (code === 200) {
      return data;
    }
    return Promise.reject(new Error(response.data.message));
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore();
      userStore.logout();
    }
    return Promise.reject(error);
  }
);

export default request;
```

### 7.2 API 模块化

```typescript
// api/user.ts
import request from '@/utils/request';
import type { UserInfo, UserListResponse } from '@/types/user';

export const userApi = {
  list: (params: { page: number; pageSize: number }) =>
    request.get<UserListResponse>('/users', { params }),

  getById: (id: number) =>
    request.get<UserInfo>(`/users/${id}`),

  create: (data: Partial<UserInfo>) =>
    request.post<UserInfo>('/users', data),

  update: (id: number, data: Partial<UserInfo>) =>
    request.put<UserInfo>(`/users/${id}`, data),

  delete: (id: number) =>
    request.delete<void>(`/users/${id}`),
};
```

---

## 八、Git 提交规范

### 8.1 提交信息格式

```
<type>(<scope>): <subject>

feat(user): 添加用户注册功能
fix(order): 修复订单查询分页问题
docs(api): 更新 API 文档
style(layout): 代码格式调整
refactor(user): 重构用户模块状态管理
test(user): 添加用户模块单元测试
chore(deps): 升级 Vue 版本
```

### 8.2 Type 类型

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| test | 测试相关 |
| chore | 构建/工具 |

---

## 九、代码审查检查清单

> **重要提醒：任务结束前必须进行编译检查，确保代码质量与功能正常。**

### 9.0 编译检查（任务完成的必须条件）

| 检查项 | 标准 | 命令 |
|--------|------|------|
| TypeScript 类型检查 | 0 类型错误 | `vue-tsc --noEmit` |
| ESLint 检查 | 0 Error | `npm run lint` |
| 生产构建 | 编译成功，无警告 | `npm run build` |

**编译检查流程：**
```bash
# 1. 类型检查
vue-tsc --noEmit

# 2. ESLint 检查
npm run lint

# 3. 生产构建
npm run build
```

> **注意：所有 Vue/前端任务在提交前必须完成上述编译检查，任何一项失败都必须修复后才能结束任务。**

### 9.1 组件层审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| Props 类型 | 必须使用 TypeScript 类型定义 | 严重 |
| 组件行数 | 单组件不超过 300 行 | 中等 |
| 命名规范 | 组件名使用 PascalCase | 中等 |
| 样式隔离 | 使用 scoped 避免样式污染 | 中等 |

### 9.2 状态管理层审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| Store 划分 | 按业务域划分，非全局集中 | 严重 |
| 响应式数据 | 使用 ref/reactive，避免直接赋值 | 严重 |
| 类型安全 | State/Getters/Actions 必须有类型 | 中等 |

### 9.3 API 层审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| 错误处理 | API 调用必须处理错误情况 | 严重 |
| 类型定义 | 请求/响应必须有类型定义 | 严重 |
| 敏感信息 | Token 等信息不得硬编码 | 严重 |

---

## 十、任务文档输出要求

### 10.1 文档输出范围

**每个涉及代码修改的任务都必须同步输出以下文档：**

| 文档类型 | 输出时机 | 说明 |
|----------|----------|------|
| 接口文档 | 修改/新增 API 调用时 | 请求参数、响应类型定义 |
| 测试文档 | 修改/新增功能时 | 单元测试、E2E 测试用例说明 |
| Curl 快捷测试 | 修改/新增 API 时 | 提供可直接复制使用的 curl 命令示例 |
| **编译验证** | **代码编写完毕后** | **必须执行 `vue-tsc`、`npm run lint`、`npm run build` 验证通过** |

### 10.2 API 接口文档模板

```markdown
## 接口名称

### 基本信息
- **URL**: `/api/users/{id}`
- **Method**: GET
- **Content-Type**: application/json

### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|--------|
| id | number | 是 | 用户ID |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

### 错误码
| code | 说明 |
|------|------|
| 404 | 用户不存在 |
| 500 | 系统内部错误 |
```

### 10.3 Curl 测试文档模板

```markdown
### 创建用户
```bash
curl -X POST 'http://localhost:3000/api/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 查询用户列表
```bash
curl -X GET 'http://localhost:3000/api/users?page=1&pageSize=10' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <token>'
```

### 更新用户
```bash
curl -X PUT 'http://localhost:3000/api/users/1' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "email": "newemail@example.com"
  }'
```

### 删除用户
```bash
curl -X DELETE 'http://localhost:3000/api/users/1' \
  -H 'Authorization: Bearer <token>'
```
```

### 10.4 测试文档模板

```markdown
## 用户模块测试用例

### 组件测试用例

#### 1. UserCard 组件 - 正常渲染
- **测试文件**: `tests/unit/UserCard.spec.ts`
- **前置条件**: 传入有效 user 对象
- **输入**: `{ id: 1, username: "admin", email: "admin@example.com" }`
- **验证点**:
  - 正确渲染用户名
  - 正确渲染邮箱
  - 头像组件正常显示

#### 2. UserCard 组件 - 事件触发
- **测试文件**: `tests/unit/UserCard.spec.ts`
- **测试步骤**:
  1. 渲染组件并点击删除按钮
  2. 验证 emit('delete', id) 被调用
- **验证点**:
  - delete 事件被触发
  - 事件参数为正确的用户 ID

### Store 测试用例

#### 1. useUserStore - 登录成功
- **测试文件**: `tests/unit/stores/user.spec.ts`
- **前置条件**: API 返回有效 token
- **验证点**:
  - token 正确存储
  - isLoggedIn 返回 true
  - userInfo 正确设置
```

---

## 十一、Vue 3.4+ 现代化特性

### 11.1 defineModel 简化 v-model

```typescript
// ✅ Vue 3.4+: 使用 defineModel 简化双向绑定
// ChildComponent.vue
<script setup lang="ts">
const model = defineModel<string>({ required: true })
const count = defineModel<number>('count', { default: 0 })

function updateValue(val: string) {
  model.value = val
}
</script>

<template>
  <input :value="model" @input="updateValue(($event.target as HTMLInputElement).value)" />
  <p>Count: {{ count }}</p>
</template>

// ❌ Vue 3.3 旧写法（更繁琐）
// const props = defineProps<{ modelValue: string }>()
// const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>()
```

### 11.2 defineEmits 简化语法

```typescript
// ✅ Vue 3.4+: 简化的 emit 类型声明
const emit = defineEmits<{
  update: [value: string]
  delete: [id: number]
  change: [event: MouseEvent]
}>()

// ❌ Vue 3.3 旧写法
// const emit = defineEmits<{
//   (e: 'update', value: string): void
//   (e: 'delete', id: number): void
// }>()
```

### 11.3 useTemplateRef

```typescript
// ✅ Vue 3.5+: 使用 useTemplateRef 获取 DOM 引用
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

function focus() {
  inputRef.value?.focus()
}
</script>

<template>
  <input ref="inputRef" type="text" />
  <button @click="focus">Focus Input</button>
</template>

// ❌ 旧写法
// const inputRef = ref<HTMLInputElement | null>(null)
// <input ref="inputRef" />
```

### 11.4 useId

```typescript
// ✅ Vue 3.5+: 生成唯一 ID，用于表单关联
<script setup lang="ts">
import { useId } from 'vue'

const inputId = useId()
</script>

<template>
  <label :for="inputId">Username</label>
  <input :id="inputId" type="text" />
</template>
```

### 11.5 Reactivity 增强

```typescript
// effectScope - 管理响应式作用域
import { effectScope, onScopeDispose } from 'vue'

function createSharedState() {
  const scope = effectScope()

  const state = scope.run(() => {
    const count = ref(0)

    onScopeDispose(() => {
      console.log('scope disposed')
    })

    return { count }
  })!

  return {
    ...state,
    dispose: () => scope.stop()
  }
}

// shallowRef - 优化大型对象性能
import { shallowRef, triggerRef } from 'vue'

// ✅ 大型列表使用 shallowRef 避免深度响应
const bigList = shallowRef<Record<string, any>[]>([])

// 更新时手动触发
function updateList(newList: Record<string, any>[]) {
  bigList.value = newList
  triggerRef(bigList)
}

// ✅ computed 缓存优化
const expensiveValue = computed(() => {
  // 仅当依赖变化时重新计算
  return heavyCalculation(source.value)
})
```

---

## 关联文件

- `references/architecture.md` - 架构设计详细规范
- `references/code-standards.md` - 代码编写规范详解
- `references/testing.md` - 测试规范详解
- `references/quality-gates.md` - 质量门禁标准

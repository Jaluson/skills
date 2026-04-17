# 快速参考卡 — P3/P4 阶段速查

> 本文件是编码和验证阶段的速查清单，浓缩了所有禁止项、强制项和关键阈值。
> 完整规则见各 references 文件。

---

## 禁止项（红线，违反即不可交付）

```markdown
类型安全：
□ 无 any 类型（用 unknown 或具体类型）
□ 无 @ts-ignore（用 @ts-expect-error + 原因注释）
□ 无非空断言 !（除非有注释证明安全）

Vue 模板：
□ 无 v-for + v-if 同一元素
□ 无直接修改 props
□ 无模板复杂表达式（>2 运算符 → 提取 computed）

代码卫生：
□ 无 console.log / debugger
□ 无注释掉的代码
□ 无硬编码魔法值（用常量/枚举）

响应式：
□ 无 watch 替代 computed 的场景

UI 一致性：
□ 无手写已有通用组件能实现的 UI
□ 无硬编码颜色/间距/字号（用 CSS 变量或 UI 框架 token）
□ 无同类页面不同交互模式（弹窗 vs 抽屉要统一）
```

---

## 强制项（底线，缺少需补齐）

```markdown
类型定义：
□ 所有 props 有 TypeScript interface
□ 所有 emits 有类型签名
□ API 响应有完整类型定义
□ 引用类型 props 默认值用工厂函数 () => []

代码结构：
□ 导入分组有序：type → Vue → 第三方 → composables → utils → 组件
□ 声明顺序：types → imports → props → emits → refs → computed → watch → 生命周期 → 方法

样式：
□ 组件默认 scoped
□ 使用项目 CSS 变量，不硬编码视觉值

UI 一致性：
□ 新页面参考同类页面模板，保持布局一致
```

---

## 组件行数阈值

| 类型 | 上限 | 超过时 |
|------|------|--------|
| 页面组件 | 150 行 | 拆分子组件 |
| 业务组件 | 200 行 | 拆分 + 提取 composable |
| 通用组件 | 150 行 | 检查职责是否过多 |
| Composable | 100 行 | 拆分为多个 |
| API 文件 | 80 行 | 按资源拆分 |
| props 数量 | 8 个 | 检查职责 |

---

## 三态必检

每个数据展示组件必须处理：

```
□ 加载态（Skeleton / loading spinner）
□ 错误态（ErrorMessage + retry）
□ 空态（EmptyState / 友好提示）
```

---

## P4 验证命令速查

```bash
# 按顺序执行，前一步失败先修复
npx vue-tsc --noEmit                 # 1. 类型检查
npx eslint src/ --ext .vue,.ts,.tsx  # 2. Lint 检查
npx vitest run                       # 3. 单元测试（如已配置）
npm run build                        # 4. 构建验证
```

---

## 常见 TS 错误速查

| 错误 | 原因 | 修复 |
|------|------|------|
| TS2322 类型不匹配 | 赋值两端类型不一致 | 在正确端修正类型 |
| TS2307 找不到模块 | 路径错误或文件不存在 | 检查路径和 tsconfig paths |
| TS2739 缺失属性 | 对象缺少必需字段 | 补全属性或标为可选 |
| TS2571 unknown 类型 | 未收窄类型 | 添加类型守卫 |
| ref 赋值类型错误 | ref 泛型参数不对 | 检查 `ref<T>()` 的 T |

---

## 命名速查

| 类型 | 格式 | 示例 |
|------|------|------|
| 页面组件 | PascalCase + View | `UserListView.vue` |
| 业务组件 | PascalCase | `OrderCard.vue` |
| Composable | use + camelCase | `useAuth.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 常量 | UPPER_SNAKE | `MAX_RETRY` |
| 布尔变量 | is/has/should | `isLoading` |
| 事件处理 | handle/on | `handleSubmit` |
| CSS 类名 | BEM | `card__title--active` |
| 事件名 | kebab-case | `@item-click` |

---

## 流程降级速查

| 级别 | 场景 | 可省略 | 不可省略 |
|------|------|--------|---------|
| 完整 | 新模块/重构/共享接口 | 无 | 全部 P0-P6 |
| 标准 | 新页面/≤3 文件 | P0/P1 合并 | P0+P3+P4+P5+P6 |
| 简化 | ≤3 行/无新文件 | P1/P2/P6 精简 | P0+P3+P4 |
| 紧急 | hotfix | P1 跳过/P2 精简 | P3 标准+P4 |

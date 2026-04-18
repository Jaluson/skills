# Spring Boot 架构设计规范

## 一、模块划分原则

### 1.1 按业务域划分模块

```
project-root/
├── module-user/        # 用户域
├── module-order/       # 订单域
├── module-product/     # 产品域
├── module-common/      # 公共模块
└── module-api/        # API 聚合模块
```

### 1.2 公共模块职责

| 模块 | 职责 |
|------|------|
| common | 工具类、常量、枚举、异常定义 |
| infrastructure | 数据库访问、缓存、消息队列等基础设施 |
| api | 对外暴露的 API 接口定义 |

---

## 二、依赖管理

### 2.1 依赖原则

- 层级依赖：外层模块依赖内层模块，禁止反向依赖
- 依赖版本：统一在 parent 中管理版本
- 禁止依赖：禁止业务模块依赖实现类

### 2.2 依赖范围

| scope | 使用场景 |
|-------|----------|
| compile | 默认，所有场景可用 |
| provided | JDK 或容器提供，如 servlet-api |
| runtime | 仅运行时需要，如数据库驱动 |
| test | 仅测试使用，如 junit |

---

## 三、微服务架构规范

### 3.1 服务拆分原则

- 按业务域拆分，避免跨域调用
- 服务粒度适中，单一服务职责清晰
- 无状态设计，状态外置到缓存/数据库

### 3.2 服务间通信

- 同步调用：使用 OpenFeign
- 异步消息：使用 RocketMQ/Kafka
- 避免循环依赖

---

## 四、设计模式应用

### 4.1 常用模式

| 模式 | 应用场景 |
|------|----------|
| Factory | 创建复杂对象，如 DTO 转 Entity |
| Strategy | 多支付方式、多缓存策略 |
| Template | 分页查询、批量操作 |
| AOP | 日志、事务、安全检查 |
| Builder | 复杂对象构建 |

### 4.2 事务策略

```java
// 单体事务
@Transactional(rollbackFor = Exception.class)

// 分布式事务（Seata）
@GlobalTransactional(rollbackFor = Exception.class)
```

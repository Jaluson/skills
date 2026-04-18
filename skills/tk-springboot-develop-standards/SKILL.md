---
name: tk-springboot-develop-standards
description: Spring Boot 开发规约。触发：Spring Boot/Java 代码编写、审查、API 开发、数据库操作、异常处理、测试。
version: 2.0.0
---

# Spring Boot 开发规约（强制执行）

> 本文件是**必须遵守的指令**，不是参考文档。AI 在任何涉及 Spring Boot/Java 代码的任务中必须严格遵循以下规则。

---

## 第零条：铁律（违反即为任务失败）

> 以下规则优先级最高，任何情况下不得违反。

### 0.1 编译验证（强制）
- 代码编写完毕后**必须**执行 `mvn compile` 或 `./mvnw compile`
- **编译未通过禁止声称任务完成**
- 编译失败时：修复 → 重新编译 → 直到通过

### 0.2 依赖注入（强制）
- **禁止** `@Autowired` 字段注入
- **必须**使用构造方法注入
```java
// 唯一正确方式
@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### 0.3 分层职责（强制）
| 层级 | 允许 | 禁止 |
|------|------|------|
| Controller | 参数校验(`@Valid`)、调用 Service、返回响应 | 写业务逻辑、直接操作数据库 |
| Service | 业务逻辑、事务管理(`@Transactional`) | 操作 HttpServletRequest、直接返回 Entity |
| Repository | 数据库 CRUD | 写业务逻辑 |

### 0.4 数据库表设计（强制）
- **主键**：必须使用雪花ID，禁止数据库自增（除非用户明确要求）
- **表命名**：业务表 `t_` 前缀（如 `t_user`），系统表 `sys_` 前缀（如 `sys_dict`）
- **审计字段**：必须有 `id`、`create_time`、`update_time`、`create_by`、`update_by`
- **索引命名**：唯一索引 `uk_{表名}_{字段}`，普通索引 `idx_{表名}_{字段}`

---

## 一、命名规约

### 1.1 类命名
| 类型 | 格式 | 示例 |
|------|------|------|
| Controller | XxxController | UserController |
| Service 接口 | XxxService | UserService |
| Service 实现 | XxxServiceImpl | UserServiceImpl |
| Repository | XxxRepository | UserRepository |
| Entity | XxxEntity | UserEntity |
| DTO | XxxDTO | UserDTO |
| VO | XxxVO | UserVO |

### 1.2 方法命名
| 操作 | 前缀 | 示例 |
|------|------|------|
| 新增 | save / create | saveUser |
| 修改 | update | updateUser |
| 删除 | delete / remove | deleteById |
| 查单个 | get | getUserById |
| 查列表 | list | listUsers |
| 分页 | page | pageUsers |
| 统计 | count | countUsers |
| 判存在 | exists | existsUser |

### 1.3 变量命名
- 禁止拼音和无意义缩写（`uList`、`map1`、`flag`）
- 布尔用 `is/has/can` 前缀
- 集合用复数或 `List/Map/Set` 后缀

---

## 二、RESTful API 规约

### 2.1 URL 规范
```
GET    /users              # 列表
GET    /users/{id}         # 详情
POST   /users              # 创建
PUT    /users/{id}         # 更新
DELETE /users/{id}         # 删除
POST   /users/{id}/enable  # 动作类资源用动词
```

### 2.2 统一响应格式
```json
{ "code": 200, "message": "success", "data": {} }

// 分页
{ "code": 200, "message": "success", "data": { "list": [], "total": 100, "page": 1, "pageSize": 10 } }
```

### 2.3 HTTP 状态码
200 成功 | 201 创建成功 | 400 参数错误 | 401 未认证 | 403 无权限 | 404 不存在 | 500 内部错误

---

## 三、异常处理规约

- 使用 `@RestControllerAdvice` 全局异常处理
- 业务异常用自定义 `BusinessException(code, message)`
- ERROR 日志必须包含异常堆栈：`log.error("订单创建失败: orderId={}", orderId, e)`
- 禁止捕获异常后什么都不做
- 禁止记录敏感信息（密码、token）

---

## 四、事务规约

- `@Transactional(rollbackFor = Exception.class)` 加在 Service 方法上
- 禁止在 Controller 层使用 `@Transactional`

---

## 五、数据库操作规约

### 5.1 建表模板
```sql
CREATE TABLE t_user (
    id          BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
    username    VARCHAR(50) NOT NULL COMMENT '用户名',
    -- ... 业务字段 ...
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by   VARCHAR(50) COMMENT '创建人',
    update_by   VARCHAR(50) COMMENT '更新人',
    deleted     TINYINT DEFAULT 0 COMMENT '逻辑删除标记'
) COMMENT '用户表';
```

### 5.2 SQL 规范
- 关键字大写
- 优先 JOIN，避免子查询
- 禁止拼接用户输入（防注入）
- 批量操作用 batch

---

## 六、测试规约

- 使用 JUnit 5 + Mockito，遵循 AAA 模式（Arrange / Act / Assert）
- 核心业务覆盖率 >= 80%，新增代码 >= 70%
- 测试命名：`test{Method}_{Scenario}_{ExpectedResult}`
- 必须覆盖：正常流程、资源不存在、边界值

---

## 七、Git 提交规约

```
<type>(<scope>): <subject>

类型：feat | fix | docs | style | refactor | test | chore
示例：feat(user): 添加用户注册功能
```

---

## 八、代码审查检查清单

| 层级 | 检查项 | 等级 |
|------|--------|------|
| Controller | `@Valid` 参数校验 | 严重 |
| Controller | 构造方法注入（非 @Autowired） | 严重 |
| Controller | 无业务逻辑 | 严重 |
| Service | `@Transactional` 事务注解 | 严重 |
| Service | 空值用工具类判断 | 中等 |
| DB | 表名 `t_`/`sys_` 前缀 | 严重 |
| DB | 雪花ID主键 | 严重 |
| DB | 审计字段完整 | 严重 |

---

## 九、任务交付物（代码修改时必须输出）

| 交付物 | 时机 | 说明 |
|--------|------|------|
| 接口文档 | 修改/新增 API 时 | URL、参数、响应示例、错误码 |
| Curl 测试命令 | 修改/新增 API 时 | 可直接复制使用 |
| SQL 文档 | 修改/新增表时 | DDL + DML 示例 |
| 测试用例说明 | 修改/新增功能时 | 覆盖正常/异常/边界 |
| **编译验证** | **代码编写完毕后** | **`mvn compile` 必须通过** |

---

## 完成前自检（必须逐项确认）

> 任务结束前，AI 必须确认以下所有项目：

- [ ] 编译验证已通过（`mvn compile` 零错误）
- [ ] 使用了构造方法注入（无 @Autowired 字段注入）
- [ ] Controller 层无业务逻辑
- [ ] Service 层有 @Transactional 注解
- [ ] 数据库表使用雪花ID + 审计字段 + 正确前缀
- [ ] API 遵循 RESTful 规范 + 统一响应格式
- [ ] 异常使用 BusinessException + 全局异常处理
- [ ] 日志包含上下文信息，无敏感数据
- [ ] 已输出接口文档/Curl/SQL/测试用例（如适用）

---

## 关联文件

- `references/architecture.md` - 架构设计详细规范
- `references/code-standards.md` - 代码编写规范详解
- `references/testing.md` - 测试规范详解
- `references/quality-gates.md` - 质量门禁标准
- `references/modern-java-features.md` - Java 8~25 & Spring Boot 3/4 新特性速查

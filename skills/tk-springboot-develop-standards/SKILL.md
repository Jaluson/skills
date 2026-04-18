---
name: tk-springboot-develop-standards
description: |
  Spring Boot 开发全面规约技能。当用户讨论 Spring Boot 项目开发、Java 代码规范、Spring 项目架构、分层设计、RESTful API 开发、数据库操作、日志规范、异常处理、单元测试编写等场景时触发。适用于代码审查、开发规约检查、Spring Boot 项目结构评审、API 设计评审等任务。
version: 1.2.0
---

# Spring Boot 开发规约

本 skill 提供 Spring Boot 开发的全面规约指导，涵盖分层架构、代码规范、API 设计、数据库操作、异常处理、日志规范及测试要求。

## 触发场景

当用户进行以下操作时自动触发：
- 代码审查或开发规约检查
- Spring Boot 项目结构设计
- RESTful API 开发与评审
- 数据库表设计或 SQL 审查
- 异常处理方案设计
- 日志规范制定
- 单元测试/集成测试编写
- **任何涉及代码修改的任务（必须同步输出相关文档 + 编译验证）**

---

## 任务文档输出要求（前置规约）

### 11.1 文档输出范围

**每个涉及代码修改的任务都必须同步输出以下文档：**

| 文档类型 | 输出时机 | 说明 |
|----------|----------|------|
| 接口文档 | 修改/新增 API 时 | 使用 OpenAPI/Swagger 规范或手写 Markdown |
| 测试文档 | 修改/新增功能时 | 单元测试、集成测试用例说明 |
| Curl 快捷测试 | 修改/新增 API 时 | 提供可直接复制使用的 curl 命令示例 |
| SQL 文档 | 修改/新增表或查询时 | DDL 建表语句、DML 示例、数据字典 |
| **编译验证** | **代码编写完毕后** | **必须执行 `./mvnw compile` 或 `mvn compile` 验证通过** |

### 11.2 接口文档模板

```markdown
## 接口名称

### 基本信息
- **URL**: `/api/users/{id}`
- **Method**: GET
- **Content-Type**: application/json

### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | long | 是 | 用户ID |

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

### 11.3 Curl 测试文档模板

```markdown
### 创建用户
```bash
curl -X POST 'http://localhost:8080/api/users' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 查询用户
```bash
curl -X GET 'http://localhost:8080/api/users/1' \
  -H 'Accept: application/json'
```

### 更新用户
```bash
curl -X PUT 'http://localhost:8080/api/users/1' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newemail@example.com"
  }'
```

### 删除用户
```bash
curl -X DELETE 'http://localhost:8080/api/users/1' \
  -H 'Content-Type: application/json'
```
```

### 11.4 SQL 文档模板

```markdown
## 用户表 (t_user)

### 表结构
```sql
CREATE TABLE t_user (
    id          BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID，由应用层生成）',
    username    VARCHAR(50) NOT NULL COMMENT '用户名',
    email       VARCHAR(100) COMMENT '邮箱',
    status      TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by   VARCHAR(50) COMMENT '创建人',
    update_by   VARCHAR(50) COMMENT '更新人',
    deleted     TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
    INDEX idx_username (username),
    INDEX idx_status (status)
) COMMENT '用户表';
```

### 索引说明
| 索引名 | 类型 | 字段 | 说明 |
|--------|------|------|------|
| idx_username | 普通 | username | 用户名查询 |
| idx_status | 普通 | status | 状态筛选 |

### DML 示例
```sql
-- 插入
INSERT INTO t_user (username, email, create_by) VALUES ('test', 'test@example.com', 'admin');

-- 更新
UPDATE t_user SET email = 'new@example.com', update_by = 'admin' WHERE id = 1;

-- 查询
SELECT * FROM t_user WHERE deleted = 0 AND username = 'test';

-- 删除（逻辑删除）
UPDATE t_user SET deleted = 1, update_by = 'admin' WHERE id = 1;
```
```

### 11.5 测试文档模板

```markdown
## 用户服务测试用例

### 单元测试用例

#### 1. 创建用户 - 正常流程
- **测试方法**: `createUser_Success`
- **前置条件**: 用户名唯一
- **输入**: UserDTO{username="test", email="test@example.com"}
- **预期输出**: 返回 UserVO{id=1, username="test", email="test@example.com"}
- **验证点**:
  - 返回对象非空
  - ID 已赋值
  - 用户名正确

#### 2. 创建用户 - 用户名重复
- **测试方法**: `createUser_DuplicateUsername_ThrowsException`
- **前置条件**: 用户名已存在
- **输入**: UserDTO{username="existing", email="test@example.com"}
- **预期输出**: 抛出 BusinessException(code=400, message="用户名已存在")
- **验证点**:
  - 异常类型正确
  - 错误码正确
  - 用户未创建

### 集成测试用例

#### 1. 创建用户 API - 正常流程
- **测试方法**: `createUser_API_Success`
- **测试步骤**:
  1. POST /api/users 发送创建请求
  2. 验证返回 201 Created
  3. GET /api/users/{id} 验证用户已创建
- **验证点**:
  - 响应状态码 201
  - 返回用户ID
  - 可通过 GET 获取
```

---

## 一、分层架构规约

### 1.1 标准分层结构

```
├── controller        # 控制层，处理请求参数校验、调用 Service
├── service          # 业务层，核心业务逻辑处理
│   ├── impl         # 业务实现
├── repository       # 数据访问层，数据库操作
├── entity           # 实体类，与数据库表对应
├── dto              # 数据传输对象
├── vo               # 视图对象，响应给前端
├── constant         # 常量定义
├── enums            # 枚举类
├── exception        # 自定义异常
├── config           # 配置类
└── util             # 工具类
```

### 1.2 分层职责

| 层级 | 职责 | 不应该做的事 |
|------|------|-------------|
| Controller | 参数校验、调用 Service、返回响应 | 禁止在此层写业务逻辑 |
| Service | 业务逻辑处理、事务管理 | 禁止直接操作 HttpServletRequest |
| Repository | 数据库 CRUD 操作 | 禁止写复杂业务逻辑 |

### 1.3 包名规范

```
com.company.project.module
├── controller
├── service
│   └── impl
├── repository
├── entity
├── dto
├── vo
├── enums
├── constant
├── exception
├── config
└── util
```

---

## 二、代码命名规约

### 2.1 类命名

| 类型 | 规约 | 示例 |
|------|------|------|
| Controller | XxxController | UserController |
| Service 接口 | XxxService | UserService |
| Service 实现 | XxxServiceImpl | UserServiceImpl |
| Repository | XxxRepository | UserRepository |
| Entity | XxxEntity | UserEntity |
| DTO | XxxDTO | UserDTO |
| VO | XxxVO | UserVO |
| 枚举 | XxxEnum | StatusEnum |

### 2.2 方法命名

| 操作 | 规约 | 示例 |
|------|------|------|
| 新增 | save / create | saveUser, createOrder |
| 修改 | update | updateUser |
| 删除 | delete / remove | deleteById, removeUser |
| 查询单个 | get | getUserById |
| 查询列表 | list | listUsers |
| 统计 | count | countUsers |
| 判断是否存在 | exists | existsUser |
| 分页查询 | page | pageUsers |

### 2.3 变量命名

- 使用有意义的英文单词或词组
- 禁止使用拼音或无意义缩写
- 布尔变量使用 is/has/can 前缀
- 集合类型使用复数名词或 List/Map/Set 后缀

```java
// ✅ 正确示例
List<UserDTO> userList;
Map<String, Object> dataMap;
boolean isActive;
boolean hasPermission;

// ❌ 错误示例
List<UserDTO> uList;
Map<String, Object> map1;
boolean flag;
```

---

## 三、RESTful API 设计规约

### 3.1 URL 路径规范

```
# 标准格式
GET    /users              # 查询用户列表
GET    /users/{id}         # 查询单个用户
POST   /users              # 创建用户
PUT    /users/{id}         # 更新用户
DELETE /users/{id}         # 删除用户

# 动作类资源使用动词
POST   /users/{id}/enable   # 启用用户
POST   /users/{id}/disable  # 禁用用户
```

### 3.2 请求与响应格式

**请求头必须包含：**
```
Content-Type: application/json
```

**统一响应格式：**
```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

**分页响应格式：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [ ],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3.3 HTTP 状态码使用

| 状态码 | 场景 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 四、数据库操作规约

### 4.1 表设计原则

**主键ID规范（重要）：**
- **必须使用雪花ID（Snowflake ID）**，禁止使用数据库自增ID
- 除非用户明确指定使用自增ID
- 雪花ID由生成器在应用层生成，确保分布式环境下ID唯一性

**表命名规范（重要）：**
- **业务表**：使用 `t_` 前缀 + 模块名 + 表名，如 `t_user`（用户表）、`t_order`（订单表）、`t_product`（产品表）
- **系统表**：使用 `sys_` 前缀，如 `sys_user`（系统用户，与业务用户区分）、`sys_dict`（字典表）
- 表名使用小写，单词间用下划线分隔
- 必须有 id、create_time、update_time、create_by、update_by 审计字段
- 字段添加注释
- 合适添加索引

```sql
-- 业务表示例：用户表、订单表
-- 注意：id 由应用层雪花ID生成器生成，数据库不负责自增
CREATE TABLE t_user (
    id          BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
    username    VARCHAR(50) NOT NULL COMMENT '用户名',
    email       VARCHAR(100) COMMENT '邮箱',
    status      TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    create_by   VARCHAR(50) COMMENT '创建人',
    update_by   VARCHAR(50) COMMENT '更新人',
    deleted     TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
    INDEX idx_username (username),
    INDEX idx_status (status)
) COMMENT '用户表';

-- 系统表示例：字典表、配置表
-- 注意：id 由应用层雪花ID生成器生成，数据库不负责自增
CREATE TABLE sys_dict (
    id          BIGINT PRIMARY KEY COMMENT '主键ID（雪花ID）',
    dict_type   VARCHAR(50) NOT NULL COMMENT '字典类型',
    dict_key    VARCHAR(50) NOT NULL COMMENT '字典键',
    dict_value  VARCHAR(255) COMMENT '字典值',
    sort_order  INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT '系统字典表';
```

**索引命名规范：**
- 唯一索引：`uk_{表名}_{字段名}`
- 普通索引：`idx_{表名}_{字段名}`
- 联合索引：`idx_{表名}_{字段1}_{字段2}`

### 4.2 SQL 编写规范

- 关键字使用大写
- 子查询尽量避免，优先使用 JOIN
- 禁止在 SQL 中直接拼接用户输入参数（防 SQL 注入）
- 批量操作使用 batch 方式

### 4.3 事务管理

```java
// ✅ 正确：Service 层方法添加事务
@Transactional(rollbackFor = Exception.class)
public void updateUser(UserDTO userDTO) {
    // 业务逻辑
}

// ❌ 错误：在 Controller 层添加事务
@RestController
public class UserController {
    @Transactional // 不要这样做
    public void update() { }
}
```

---

## 五、异常处理规约

### 5.1 统一异常处理

使用 `@ControllerAdvice` 实现全局异常处理：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> handleValidException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldError().getDefaultMessage();
        return Result.error(400, message);
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.error(500, "系统内部错误");
    }
}
```

### 5.2 自定义异常

```java
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
```

### 5.3 异常使用原则

- 业务异常使用自定义 BusinessException
- 不要捕获异常后什么都不做
- 不要用异常替代业务判断
- finally 块中关闭资源

---

## 六、日志规约

### 6.1 日志级别使用

| 级别 | 场景 |
|------|------|
| ERROR | 错误，需要调查处理 |
| WARN | 警告，不影响运行但需要关注 |
| INFO | 信息，记录正常业务流程 |
| DEBUG | 调试，开发环境使用 |

### 6.2 日志内容规范

```java
// ✅ 正确：包含上下文信息
log.info("用户登录成功: userId={}, username={}", userId, username);

// ❌ 错误：日志信息不完整
log.info("用户登录成功");

// ✅ 正确：ERROR 级别记录完整异常信息
log.error("订单创建失败: orderId={}", orderId, e);

// ❌ 错误：ERROR 日志没有异常堆栈
log.error("订单创建失败");
```

### 6.3 日志禁止

- 禁止记录敏感信息（密码、密钥、token）
- 禁止使用 System.out/err 替代日志
- 禁止直接打印 JSON 大对象

---

## 六点五、编译验证要求（强制）

### 6.5.1 编译检查

**代码编写完毕后必须执行编译验证，确保代码正常：**

```bash
# Maven 项目
./mvnw compile

# 或直接使用 mvn
mvn compile
```

**编译通过标准：**
- 0 错误（ERROR）
- 0 警告（WARN）—— 最佳实践

### 6.5.2 编译验证流程

```
代码编写完成
    ↓
执行 ./mvnw compile 编译
    ↓
检查编译结果
    ↓
失败 → 修复错误 → 重新编译
    ↓
成功 → 继续下一步
```

### 6.5.3 编译失败处理

| 错误类型 | 处理方式 |
|----------|----------|
| 语法错误 | 修复代码语法 |
| 依赖缺失 | 添加缺失的依赖 |
| 类型不匹配 | 检查泛型/类型转换 |
| 循环依赖 | 重构模块依赖关系 |

**编译未通过前禁止：**
- 提交代码
- 运行测试
- 部署

---

## 七、测试规约

### 7.1 测试分层

| 测试类型 | 范围 | 执行时机 |
|----------|------|----------|
| 单元测试 | Service 层业务逻辑 | 每次提交 |
| 集成测试 | Controller 层 API | 合并前 |
| 端到端测试 | 完整业务流程 | release 前 |

### 7.2 单元测试规范

使用 JUnit 5 + Mockito，遵循 AAA 模式（Arrange-Given / Act / Assert）：

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductService productService;

    @InjectMocks
    private OrderServiceImpl orderService;

    @Test
    void createOrder_Success() {
        // Arrange - 准备测试数据
        OrderDTO orderDTO = OrderDTO.builder()
            .productId(1L)
            .quantity(2)
            .build();

        ProductVO productVO = ProductVO.builder()
            .id(1L)
            .price(new BigDecimal("100.00"))
            .stock(10)
            .build();

        when(productService.getProductById(1L)).thenReturn(productVO);
        when(orderRepository.save(any(OrderEntity.class)))
            .thenAnswer(invocation -> {
                OrderEntity e = invocation.getArgument(0);
                e.setId(1L);
                return e;
            });

        // Act - 执行被测方法
        OrderVO result = orderService.createOrder(orderDTO);

        // Assert - 验证结果
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(2, result.getQuantity());
        assertEquals(new BigDecimal("200.00"), result.getTotalPrice());

        verify(productService, times(1)).getProductById(1L);
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    void createOrder_ProductNotFound() {
        // Given
        OrderDTO orderDTO = OrderDTO.builder()
            .productId(999L)
            .quantity(1)
            .build();
        when(productService.getProductById(999L)).thenReturn(null);

        // When & Then
        BusinessException ex = assertThrows(
            BusinessException.class,
            () -> orderService.createOrder(orderDTO)
        );
        assertEquals(404, ex.getCode());
        assertEquals("商品不存在", ex.getMessage());
        verify(orderRepository, never()).save(any());
    }
}
```

**核心测试场景覆盖：**
| 场景 | 测试方法命名 | 验证点 |
|------|-------------|--------|
| 正常流程 | `createOrder_Success` | 返回正确对象 |
| 资源不存在 | `createOrder_ProductNotFound` | 抛出正确异常 |
| 资源不足 | `createOrder_InsufficientStock` | 抛出正确异常 |
| 边界值 | `createOrder_ExactStock` | 刚好足够时能成功 |

### 7.3 测试命名

```
test[MethodName]_[Scenario]_[ExpectedResult]

示例：
testSaveUser_Success_ReturnsUserVO
testSaveUser_DuplicateUsername_ThrowsException
testGetUserById_NotFound_ThrowsBusinessException
```

### 7.4 测试覆盖率要求

- 核心业务模块覆盖率 ≥ 80%
- 新增代码覆盖率 ≥ 70%

---

## 八、配置与环境

### 8.1 多环境配置

```
application.yml           # 主配置
application-dev.yml       # 开发环境
application-test.yml      # 测试环境
application-prod.yml      # 生产环境
```

### 8.2 敏感配置

- 密码、密钥等敏感信息使用环境变量或配置中心
- 禁止硬编码敏感信息
- 生产环境配置不得提交到代码仓库

---

## 九、Git 提交规范

### 9.1 提交信息格式

```
<type>(<scope>): <subject>

feat(user): 添加用户注册功能
fix(order): 修复订单查询分页问题
docs(api): 更新 API 文档
style(code): 代码格式调整
refactor(service): 重构用户服务层
test(user): 添加用户服务单元测试
chore(deps): 升级 Spring Boot 版本
```

### 9.2 Type 类型

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

## 十、代码审查检查清单

### 10.1 Controller 层审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| 参数校验 | 必须使用 `@Valid/@Validated` 注解 | 严重 |
| 字段注入 | 禁止 `@Autowired` 字段注入，必须用构造方法 | 严重 |
| 业务逻辑 | 禁止在 Controller 写业务逻辑 | 严重 |
| 异常处理 | 禁止捕获异常后返回错误信息而不抛异常 | 中等 |
| 日志记录 | 关键操作应记录日志 | 低 |

**修复示例：**
```java
// ❌ 错误
@RestController
public class UserController {
    @Autowired
    private UserService userService;

    @PostMapping("/add")
    public Result addUser(@RequestBody UserDTO userDTO) {
        if (userDTO.getUsername() == null) {
            return Result.error(400, "用户名不能为空");
        }
        return Result.success(userService.saveUser(userDTO));
    }
}

// ✅ 正确
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public Result createUser(@RequestBody @Valid UserDTO userDTO) {
        log.info("创建用户: username={}", userDTO.getUsername());
        return Result.success(userService.saveUser(userDTO));
    }
}
```

### 10.2 Service 层审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| 事务注解 | Service 方法添加 `@Transactional` | 严重 |
| 构造注入 | 依赖使用构造方法注入 | 中等 |
| 空值判断 | 集合/字符串判空使用工具类 | 中等 |
| 异常抛出 | 业务异常应使用自定义 BusinessException | 中等 |

### 10.3 数据库设计审查

| 检查项 | 标准 | 问题等级 |
|--------|------|----------|
| 表命名 | 业务表用 `t_` 前缀，系统表用 `sys_` 前缀 | 严重 |
| 主键 | 必须使用雪花ID，禁止自增 | 严重 |
| 审计字段 | 必须有 create_time, update_time, create_by, update_by | 严重 |
| 索引命名 | 唯一索引 `uk_`，普通索引 `idx_` | 中等 |
| 字段注释 | 所有字段必须有中文注释 | 低 |

---

## 十一、现代化特性

### 11.1 虚拟线程集成

虚拟线程（Virtual Threads）显著降低线程内存开销，适合 I/O 密集型任务：

```yaml
# application.yml 配置虚拟线程平台
spring:
  threads:
    virtual:
      enabled: true
```

```java
// 代码中使用虚拟线程
@Bean
public ExecutorService virtualThreadExecutor() {
    return Executors.newVirtualThreadPerTaskExecutor();
}
```

**虚拟线程下的线程池配置：**

```java
// 虚拟线程下不再需要大线程池
@Configuration
public class VirtualThreadConfig {
    @Bean
    public TaskExecutor virtualThreadTaskExecutor() {
        // 虚拟线程适用于 I/O 密集型任务
        return new TaskExecutor() {
            private final ExecutorService executor = 
                Executors.newVirtualThreadPerTaskExecutor();
            
            @Override
            public void execute(Runnable task) {
                executor.execute(task);
            }
        };
    }
}
```

### 11.2 GraalVM 原生镜像支持

Spring Boot 原生支持 GraalVM 编译，显著提升启动速度：

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

**AOT 编译配置：**

```yaml
# AOT 编译配置
spring:
  aot:
    enabled: true
```

### 11.3 声明式 HTTP Interface

```java
// 定义声明式 HTTP 客户端
@HttpExchange("/api/users")
public interface UserRestClient {

    @GetExchange("/{id}")
    UserVO getUser(@PathVariable("id") Long id);

    @PostExchange
    UserVO createUser(@RequestBody CreateUserRequest request);

    @PutExchange("/{id}")
    UserVO updateUser(@PathVariable("id") Long id, @RequestBody UpdateUserRequest request);

    @DeleteExchange("/{id}")
    void deleteUser(@PathVariable("id") Long id);
}

// 注册 HTTP Interface
@Configuration
public class RestClientConfig {

    @Bean
    UserRestClient userRestClient(RestClient restClient) {
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(UserRestClient.class);
    }
}
```

### 11.4 Jakarta EE 迁移

Spring Boot 使用 Jakarta EE：

| 旧 API | 新 API |
|--------|--------|
| javax.servlet.* | jakarta.servlet.* |
| javax.persistence.* | jakarta.persistence.* |
| javax.validation.* | jakarta.validation.* |
| javax.transaction.* | jakarta.transaction.* |

```java
// 使用 jakarta 前缀
import jakarta.servlet.http.HttpServletRequest;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotNull;
```

### 11.5 Records 作为 DTO/VO

Records 适合作为不可变 DTO/VO：

```java
// Record 作为请求 DTO
public record CreateUserRequest(
    @NotBlank String username,
    @Email String email,
    @Size(min = 6) String password
) {}

// Record 作为响应 VO
public record UserVO(
    Long id,
    String username,
    String email,
    LocalDateTime createTime
) {}

// Record 作为结果封装
public record Result<T>(
    int code,
    String message,
    T data
) {
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }
    
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }
}

// 使用处
@RestController
public class UserController {
    @PostMapping
    public Result<UserVO> createUser(@Valid @RequestBody CreateUserRequest request) {
        // 直接使用 record
        return Result.success(userService.createUser(request));
    }
}
```

### 11.6 Pattern Matching for switch 增强

```java
// switch pattern matching
sealed interface Shape permits Circle, Rectangle, Square {}
record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
record Square(double side) implements Shape {}

double calculateArea(Shape shape) {
    return switch (shape) {
        case Circle(double r) -> Math.PI * r * r;
        case Rectangle(double w, double h) -> w * h;
        case Square(double s) -> s * s;
        case null -> 0.0;
    };
}

// 运行时类型检查
Object obj = getShape();
String description = switch (obj) {
    case Circle c -> "Circle with radius " + c.radius();
    case Rectangle r -> "Rectangle " + r.width() + "x" + r.height();
    case String s -> "String: " + s;
    default -> "Unknown shape";
};
```

---

## 十二、现代化开发工具

### 12.1 构造方法绑定（Constructor Binding）最佳实践

```java
// 配置属性类使用构造方法绑定
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    @NotBlank String name,
    @Min(1) @Max(65535) int port,
    @Email String adminEmail,
    List<String> allowedOrigins
) {}

// 启用构造方法绑定
@EnableConfigurationProperties(AppProperties.class)
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// application.yml
app:
  name: my-application
  port: 8080
  admin-email: admin@example.com
  allowed-origins:
    - https://example.com
    - https://app.example.com
```

### 12.2 自动化配置增强

```java
// 自定义自动配置
@Configuration(proxyBeanMethods = false)
@AutoConfigureBefore(UserServiceAutoConfiguration.class)
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
public class CustomAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public CustomService customService() {
        return new CustomService();
    }
}

// 在 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports 中注册
```

---

## 关联文件

- `references/architecture.md` - 架构设计详细规范
- `references/code-standards.md` - 代码编写规范详解
- `references/testing.md` - 测试规范详解
- `references/quality-gates.md` - 质量门禁标准
- `references/modern-java-features.md` - Java 8~25 & Spring Boot 3/4 新特性速查

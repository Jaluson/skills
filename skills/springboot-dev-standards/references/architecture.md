# Spring Boot 生产级架构设计

## 目录

- [分层架构](#分层架构)
- [包组织方式](#包组织方式)
- [Entity 设计](#entity-设计)
- [DTO 与 VO 设计](#dto-与-vo-设计)
- [Mapper/DAO 层设计](#mapperdao-层设计)
- [Service 层设计](#service-层设计)
- [Controller 层设计](#controller-层设计)
- [全局异常处理](#全局异常处理)
- [统一返回值封装](#统一返回值封装)
- [配置管理](#配置管理)
- [数据库设计规范](#数据库设计规范)

---

## 分层架构

### 严格的分层依赖规则

```
Controller 层
  ↓ 只能调用 Service 接口
Service 层
  ↓ 只能调用 Mapper/DAO 接口
Mapper/DAO 层
  ↓ 只能操作 Entity
Entity 层

禁止的依赖方向：
  × Entity → Service（数据模型不能依赖业务逻辑）
  × Mapper → Service（数据访问不能依赖业务逻辑）
  × Service → Controller（业务逻辑不能依赖 API 层）
  × 任何层 → 任何高层的直接依赖
```

### 每层的职责边界

| 层 | 职责 | 禁止 |
|----|------|------|
| Controller | 接收请求、参数校验、调用 Service、封装返回值 | 业务逻辑、SQL |
| Service | 业务逻辑、事务管理、调用 Mapper/外部服务 | 接收 HttpServletRequest、直接写 SQL |
| Mapper/DAO | 数据访问、SQL/CRUD 操作 | 业务逻辑 |
| Entity | 数据模型，与数据库表对应 | 业务方法 |
| DTO | 接口入参数据结构 | 包含持久化逻辑 |
| VO | 接口出参数据结构 | 包含持久化逻辑 |

---

## 包组织方式

### 按模块分包（推荐）

```
com.example.project/
├── common/                     # 全局共享
│   ├── config/                 # 配置类
│   ├── constant/               # 常量
│   ├── enums/                  # 枚举
│   ├── exception/              # 异常定义
│   ├── result/                 # 统一返回值
│   ├── utils/                  # 工具类
│   └── base/                   # 基类
│       ├── BaseEntity.java
│       ├── BaseController.java
│       └── BaseService.java
├── module/                     # 业务模块
│   ├── user/
│   │   ├── controller/
│   │   │   └── UserController.java
│   │   ├── service/
│   │   │   ├── UserService.java
│   │   │   └── impl/
│   │   │       └── UserServiceImpl.java
│   │   ├── mapper/
│   │   │   └── UserMapper.java
│   │   ├── entity/
│   │   │   └── User.java
│   │   ├── dto/
│   │   │   ├── UserCreateDTO.java
│   │   │   └── UserUpdateDTO.java
│   │   ├── vo/
│   │   │   └── UserVO.java
│   │   └── converter/
│   │       └── UserConverter.java
│   ├── order/
│   │   └── ...
│   └── ...
├── Application.java
```

### 按层分包（小型项目可用）

```
com.example.project/
├── config/
├── constant/
├── controller/
├── service/
│   └── impl/
├── mapper/
├── entity/
├── dto/
├── vo/
├── enums/
├── exception/
├── utils/
└── Application.java
```

**规则：进入已有项目时，遵循已有的包组织方式，不改变。**

---

## Entity 设计

### 标准 Entity

```java
@Data
@TableName("sys_user")   // MyBatis-Plus
// 或 @Table(name = "sys_user")  // JPA
public class User extends BaseEntity {

    /**
     * 用户名
     */
    @TableField("username")
    private String username;

    /**
     * 邮箱
     */
    @TableField("email")
    private String email;

    /**
     * 状态：0-禁用，1-正常
     */
    @TableField("status")
    private Integer status;

    /**
     * 部门ID
     */
    @TableField("dept_id")
    private Long deptId;
}
```

### BaseEntity（公共字段）

```java
@Data
public abstract class BaseEntity {

    @TableId(type = IdType.ASSIGN_ID)  // 雪花ID，禁止使用 IdType.AUTO 自增
    private Long id;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableField(value = "created_by", fill = FieldFill.INSERT)
    private Long createdBy;

    @TableField(value = "updated_by", fill = FieldFill.INSERT_UPDATE)
    private Long updatedBy;

    @TableField("deleted")
    @TableLogic
    private Integer deleted;
}
```

### 自动填充处理器（MetaObjectHandler）

`BaseEntity` 中使用 `FieldFill.INSERT` / `FieldFill.INSERT_UPDATE` 注解的公共字段，
**必须**配合以下 Handler 才能生效。每个项目只需一个实现类：

```java
@Component
public class MyBatisMetaObjectHandler implements MetaObjectHandler {

    /**
     * 插入时自动填充
     */
    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "createdBy", Long.class, getCurrentUserId());
        this.strictInsertFill(metaObject, "updatedBy", Long.class, getCurrentUserId());
        this.strictInsertFill(metaObject, "deleted", Integer.class, 0);
    }

    /**
     * 更新时自动填充
     */
    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
        this.strictUpdateFill(metaObject, "updatedBy", Long.class, getCurrentUserId());
    }

    /**
     * 获取当前登录用户ID
     * 根据项目的安全框架自行实现，以下为常见方案：
     * - Spring Security: SecurityContextHolder.getContext().getAuthentication()
     * - Sa-Token: StpUtil.getLoginIdAsLong()
     * - 自定义 Token: 从 ThreadLocal / RequestContextHolder 中获取
     */
    private Long getCurrentUserId() {
        // TODO: 根据项目安全框架实现
        return 0L;
    }
}
```

> **注意**：`strictInsertFill` / `strictUpdateFill` 只在字段为 null 时才填充。
> 如果 Entity 中手动设置了值，Handler 不会覆盖。

### Entity 设计规则

- 所有 Entity 继承 `BaseEntity`（如果项目有定义）
- 字段类型用包装类（`Long` 不用 `long`，`Integer` 不用 `int`）
- 数据库列名用 `snake_case`，Java 字段名用 `camelCase`
- 枚举字段在 Entity 中用 `Integer` 存储，在 DTO/VO 中用枚举类型
- 不在 Entity 中写业务方法

### 枚举类设计标准

所有枚举必须遵循 `code` + `desc` 模式，提供根据 code 反查的方法：

```java
@Getter
@AllArgsConstructor
public enum UserStatusEnum {

    DISABLED(0, "禁用"),
    NORMAL(1, "正常");

    private final Integer code;
    private final String desc;

    private static final Map<Integer, UserStatusEnum> CODE_MAP =
            Arrays.stream(values()).collect(Collectors.toMap(UserStatusEnum::getCode, e -> e));

    /**
     * 根据 code 获取枚举
     */
    public static UserStatusEnum getByCode(Integer code) {
        return CODE_MAP.get(code);
    }

    /**
     * 根据 code 获取描述（返回给前端用）
     */
    public static String getDescByCode(Integer code) {
        UserStatusEnum e = CODE_MAP.get(code);
        return e != null ? e.getDesc() : null;
    }
}
```

**Entity / VO 中的使用：**

```java
// Entity 中用 Integer 存储
@TableField("status")
private Integer status;

// VO 中用 String 返回描述
private String status;     // 返回 "正常" / "禁用"
// 或返回枚举对象（前端需要 code + desc 时）
// private UserStatusEnum status;
```

**Converter 中的转换：**

```java
vo.setStatus(UserStatusEnum.getDescByCode(user.getStatus()));
```

**MyBatis-Plus 枚举映射（可选，如项目统一配置）：**

```java
// 方式一：在字段上加 @EnumValue
public enum UserStatusEnum {
    DISABLED(0, "禁用"),
    NORMAL(1, "正常");

    @EnumValue  // 标记存入数据库的值
    private final Integer code;
    // ...
}

// 方式二：全局配置（application.yml）
// mybatis-plus:
//   configuration:
//     default-enum-type-handler: org.apache.ibatis.type.EnumOrdinalTypeHandler
```

> **规则**：所有状态、类型等可枚举的字段，**必须**定义枚举类，禁止在代码中直接使用数字常量。

---

## DTO 与 VO 设计

### DTO（Data Transfer Object）— 接口入参

```java
/**
 * 创建用户请求参数
 */
@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(max = 50, message = "用户名长度不能超过50")
    private String username;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "部门ID不能为空")
    private Long deptId;

    @Size(min = 6, max = 20, message = "密码长度6-20位")
    private String password;
}
```

### VO（View Object）— 接口出参

```java
/**
 * 用户信息返回
 */
@Data
public class UserVO {

    private Long id;
    private String username;
    private String email;
    private String status;
    private String deptName;
    private LocalDateTime createdAt;
}
```

### Converter（对象转换）

Converter 是纯工具类，**必须**使用私有构造器防止实例化：

```java
/**
 * 用户对象转换器
 */
public class UserConverter {

    private UserConverter() {
        throw new UnsupportedOperationException("工具类不允许实例化");
    }

    public static UserVO toVO(User user) {
        if (user == null) return null;
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setEmail(user.getEmail());
        vo.setStatus(UserStatusEnum.getDescByCode(user.getStatus()));
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }

    public static User toEntity(UserCreateDTO dto) {
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setDeptId(dto.getDeptId());
        return user;
    }

    public static List<UserVO> toVOList(List<User> users) {
        if (users == null) return Collections.emptyList();
        return users.stream()
                .map(UserConverter::toVO)
                .collect(Collectors.toList());
    }
}
```

> 也可以使用 Lombok `@UtilityClass` 替代手动私有构造器。

如果项目使用 MapStruct：
```java
@Mapper(componentModel = "spring")
public interface UserConverter {
    UserVO toVO(User user);
    User toEntity(UserCreateDTO dto);
    List<UserVO> toVOList(List<User> users);
}
```

---

## Mapper/DAO 层设计

### MyBatis-Plus Mapper

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {

    // 复杂查询写在 XML 中
    List<UserVO> selectUserList(@Param("query") UserQueryDTO query);

    // 存在性检查：使用 EXISTS（性能优于 SELECT COUNT(*)）
    default boolean existsByUsername(String username) {
        return exists(new LambdaQueryWrapper<User>()
            .eq(User::getUsername, username)
            .eq(User::getDeleted, 0)
        );
    }

    // 简单查询用 MyBatis-Plus 内置方法或 QueryWrapper
}
```

### MyBatis XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.project.module.user.mapper.UserMapper">

    <resultMap id="userVOMap" type="com.example.project.module.user.vo.UserVO">
        <id property="id" column="id"/>
        <result property="username" column="username"/>
        <result property="email" column="email"/>
        <result property="deptName" column="dept_name"/>
    </resultMap>

    <select id="selectUserList" resultMap="userVOMap">
        SELECT u.id, u.username, u.email, d.name AS dept_name
        FROM sys_user u
        LEFT JOIN sys_dept d ON u.dept_id = d.id
        WHERE u.deleted = 0
        <if test="query.username != null and query.username != ''">
            AND u.username LIKE CONCAT('%', #{query.username}, '%')
        </if>
        <if test="query.status != null">
            AND u.status = #{query.status}
        </if>
        ORDER BY u.created_at DESC
    </select>

</mapper>
```

### JPA Repository

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameAndDeleted(String username, Integer deleted);

    @Query("SELECT new com.example.project.module.user.vo.UserVO(u.id, u.username, u.email) " +
           "FROM User u WHERE u.deleted = 0 AND u.username LIKE %:keyword%")
    Page<UserVO> findUserPage(@Param("keyword") String keyword, Pageable pageable);
}
```

---

## Service 层设计

### 接口 + 实现分离

```java
// Service 接口
public interface UserService {

    /**
     * 根据ID查询用户
     */
    UserVO getById(Long id);

    /**
     * 分页查询用户列表
     */
    PageResult<UserVO> page(UserQueryDTO query);

    /**
     * 创建用户
     */
    Long create(UserCreateDTO dto);

    /**
     * 更新用户
     */
    void update(Long id, UserUpdateDTO dto);

    /**
     * 删除用户
     */
    void delete(Long id);
}

// Service 实现
@Service
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final DeptService deptService;

    // 构造器注入（推荐，不用 @Autowired）
    public UserServiceImpl(UserMapper userMapper, DeptService deptService) {
        this.userMapper = userMapper;
        this.deptService = deptService;
    }

    @Override
    public UserVO getById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new NotFoundException("用户不存在");
        }
        return UserConverter.toVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(UserCreateDTO dto) {
        // 参数格式校验已通过 DTO 注解在 Controller 层完成（@NotBlank, @Size, @UniqueUsername 等）
        // 此处只关注核心业务逻辑

        User user = UserConverter.toEntity(dto);
        user.setStatus(UserStatusEnum.NORMAL.getCode());
        user.setPassword(encryptPassword(dto.getPassword()));
        userMapper.insert(user);

        log.info("创建用户成功, userId={}, username={}", user.getId(), user.getUsername());
        return user.getId();
    }
}
```

### Service 设计规则

- 接口和实现分离（`UserService` / `UserServiceImpl`）
- 使用构造器注入（不用 `@Autowired` 字段注入）
- **CUD 操作必须加 `@Transactional(rollbackFor = Exception.class)`，确保原子性**
- `rollbackFor = Exception.class` 确保所有异常都回滚
- 事务边界应尽量小，只包裹必要的写操作，避免大事务
- **参数校验优先用 DTO 注解**，Service 中不写格式校验代码（非空、长度、格式等）
- 仅在需要业务上下文时在 Service 中校验（如查询余额、权限判断）
- 存在性检查优先用自定义注解（如 `@UniqueUsername`），需要抛特定错误码时才手动校验
- 关键操作记录日志（用 `log.info`，不用 `System.out`）

---

## Controller 层设计

### 标准 RESTful Controller

```java
@RestController
@RequestMapping("/api/users")
@Slf4j
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 分页查询用户列表
     */
    @GetMapping
    public Result<PageResult<UserVO>> page(UserQueryDTO query) {
        return Result.success(userService.page(query));
    }

    /**
     * 根据ID查询用户详情
     */
    @GetMapping("/{id}")
    public Result<UserVO> getById(@PathVariable Long id) {
        return Result.success(userService.getById(id));
    }

    /**
     * 创建用户
     */
    @PostMapping
    public Result<Long> create(@RequestBody @Valid UserCreateDTO dto) {
        return Result.success(userService.create(dto));
    }

    /**
     * 更新用户
     */
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody @Valid UserUpdateDTO dto) {
        userService.update(id, dto);
        return Result.success();
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return Result.success();
    }
}
```

### Controller 设计规则

- URL 使用 RESTful 风格：`/api/{resource}` + HTTP 方法区分操作
- `@Valid` 触发参数校验
- Controller 只做：接收请求 → 参数校验 → 调用 Service → 封装返回值
- 不在 Controller 中写任何业务逻辑
- 构造器注入 Service
- 每个方法有简短的 Javadoc

---

## 全局异常处理

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return Result.fail(e.getCode(), e.getMessage());
    }

    /**
     * 参数校验异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("参数校验失败: {}", message);
        return Result.fail(400, message);
    }

    /**
     * 未知异常
     */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.fail(500, "系统繁忙，请稍后重试");
    }
}
```

---

## 统一返回值封装

```java
@Data
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> fail(Integer code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
}
```

### 分页返回封装

```java
@Data
public class PageResult<T> {

    /** 数据列表 */
    private List<T> records;

    /** 总记录数 */
    private Long total;

    /** 当前页码 */
    private Integer pageNum;

    /** 每页条数 */
    private Integer pageSize;

    /** 总页数 */
    private Integer pages;

    public static <T> PageResult<T> of(List<T> records, Long total, Integer pageNum, Integer pageSize) {
        PageResult<T> result = new PageResult<>();
        result.setRecords(records);
        result.setTotal(total);
        result.setPageNum(pageNum);
        result.setPageSize(pageSize);
        result.setPages((int) Math.ceil((double) total / pageSize));
        return result;
    }

    /**
     * 从 MyBatis-Plus 的 Page 对象转换
     */
    public static <T> PageResult<T> of(Page<T> page) {
        return of(page.getRecords(), page.getTotal(), (int) page.getCurrent(), (int) page.getSize());
    }

    /**
     * 从 Spring Data 的 Page 对象转换
     */
    public static <T> PageResult<T> of(org.springframework.data.domain.Page<T> page) {
        return of(page.getContent(), page.getTotalElements(),
                page.getNumber() + 1, page.getSize());
    }
}
```

前端统一接收格式：
```json
{
    "code": 200,
    "message": "success",
    "data": {
        "records": [...],
        "total": 100,
        "pageNum": 1,
        "pageSize": 10,
        "pages": 10
    }
}
```

---

## 配置管理

### 配置分层

```yaml
# application.yml — 公共配置
server:
  port: 8080

spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/mydb}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:}

# application-dev.yml — 开发环境
# application-prod.yml — 生产环境
```

### 配置类

```java
@Configuration
@ConfigurationProperties(prefix = "app")
@Data
public class AppConfig {

    private Integer maxUploadSize = 10; // MB
    private String uploadPath = "/tmp/uploads";
    private Boolean enableCache = true;
}
```

规则：
- 环境相关的值用 `${ENV_VAR:default_value}` 支持环境变量覆盖
- 配置集中到 `@ConfigurationProperties` 类，不用分散的 `@Value`
- 敏感信息（密码、密钥）不硬编码，通过环境变量或配置中心注入

---

## 数据库设计规范

> **注意**：完整的数据库设计规范（含字段类型选择、索引设计、SQL 标准、反模式清单）请参考
> `database-design-standards` skill 的参考文档：`data-types.md`、`index-design.md`、
> `sql-standards.md`、`anti-patterns.md`。以下为本文件保留的 Spring Boot 项目特有规范摘要。

### 表命名

- 表名：`snake_case`，模块前缀，如 `sys_user`、`biz_order`
- 字段名：`snake_case`，如 `created_at`、`user_name`
- 主键：`id`，BIGINT，**必须使用雪花ID（Snowflake ID），禁止使用自增ID**
  - MyBatis-Plus：`@TableId(type = IdType.ASSIGN_ID)`
  - JPA：`@GeneratedValue(generator = "snowflake")` 配合自定义 ID 生成器
  - 禁止使用 `IdType.AUTO`、`@GeneratedValue(strategy = GenerationType.IDENTITY)` 等自增策略
- 公共字段：`created_at`、`updated_at`、`created_by`、`updated_by`、`deleted`

### 字段类型选择

| Java 类型 | 数据库类型 | 说明 |
|-----------|-----------|------|
| Long | BIGINT | ID、外键 |
| String | VARCHAR(n) | 短文本，明确指定长度 |
| String | TEXT | 长文本（备注、内容） |
| Integer | INT | 状态、枚举值 |
| BigDecimal | DECIMAL(n,m) | 金额，禁止用 Float/Double |
| LocalDateTime | DATETIME | 时间 |
| Boolean | TINYINT(1) | 布尔值 |

### 索引规范

- 主键索引：自动创建
- 唯一索引：业务唯一字段（如 username）
- 普通索引：高频查询条件字段
- 联合索引：多字段组合查询，遵循最左前缀原则
- 不建无意义的索引

### 雪花ID（Snowflake ID）配置指南

#### 为什么禁止自增ID

- **安全性**：自增ID可被遍历，暴露业务量级和数据总量
- **分布式**：分库分表场景下自增ID会冲突
- **迁移性**：数据迁移时ID冲突风险高
- **信息量**：雪花ID包含时间戳，可从中推算创建时间，有利于排查问题

#### MyBatis-Plus 雪花ID配置

MyBatis-Plus 内置雪花算法，使用 `IdType.ASSIGN_ID` 即可自动生成：

```java
// Entity 中使用
@TableId(type = IdType.ASSIGN_ID)
private Long id;
```

如需自定义 workerId 和 datacenterId（多实例部署时必须配置）：

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    public IdentifierGenerator identifierGenerator(
            @Value("${snowflake.worker-id:1}") Long workerId,
            @Value("${snowflake.datacenter-id:1}") Long datacenterId) {
        return new DefaultIdentifierGenerator(workerId, datacenterId);
    }
}
```

```yaml
# application.yml
snowflake:
  worker-id: ${WORKER_ID:1}       # 实例编号，每台机器唯一（0-31）
  datacenter-id: ${DATACENTER_ID:1} # 机房编号（0-31）
```

#### JPA 雪花ID配置

```java
// 1. 自定义 ID 生成器
public class SnowflakeIdGenerator implements IdentifierGenerator {

    private final Snowflake snowflake;

    public SnowflakeIdGenerator(long workerId, long datacenterId) {
        this.snowflake = new Snowflake(workerId, datacenterId);
    }

    @Override
    public Long nextId(Object entity) {
        return snowflake.nextId();
    }
}

// 2. 注册为 Bean
@Configuration
public class JpaIdConfig {

    @Bean
    public SnowflakeIdGenerator snowflakeIdGenerator(
            @Value("${snowflake.worker-id:1}") Long workerId,
            @Value("${snowflake.datacenter-id:1}") Long datacenterId) {
        return new SnowflakeIdGenerator(workerId, datacenterId);
    }
}

// 3. Entity 中使用
@Entity
@Table(name = "sys_user")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(generator = "snowflake")
    @GenericGenerator(name = "snowflake", strategy = "bean:snowflakeIdGenerator")
    private Long id;
}
```

#### 前端精度丢失问题

雪花ID为 18-19 位数字，超过 JavaScript 的 `Number.MAX_SAFE_INTEGER`（2^53-1），前端接收后会精度丢失。
**必须**在 VO/返回值中对 Long 类型的 ID 字段加 `@JsonFormat` 注解：

```java
@Data
public class UserVO {

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    // ... 其他字段
}
```

或在全局 Jackson 配置中统一处理：

```java
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        // 所有 Long 类型序列化为 String
        module.addSerializer(Long.class, ToStringSerializer.instance);
        module.addSerializer(Long.TYPE, ToStringSerializer.instance);
        mapper.registerModule(module);
        return mapper;
    }
}
```

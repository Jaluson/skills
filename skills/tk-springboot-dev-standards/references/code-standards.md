# Spring Boot 代码规范 — 严格生产级

## 目录

- [命名规范](#命名规范)
- [Java 编码规范](#java-编码规范)
- [数据库交互性能规范](#数据库交互性能规范)
- [异常处理规范](#异常处理规范)
- [日志规范](#日志规范)
- [参数校验规范](#参数校验规范)
- [事务管理规范](#事务管理规范)
- [并发与线程安全](#并发与线程安全)
- [禁止模式清单](#禁止模式清单)
- [强制模式清单](#强制模式清单)
- [Spring Boot 版本兼容](#spring-boot-版本兼容)

---

## 命名规范

### 文件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| Entity | PascalCase | `User.java`, `OrderItem.java` |
| DTO | PascalCase + DTO 后缀 | `UserCreateDTO.java` |
| VO | PascalCase + VO 后缀 | `UserVO.java` |
| Service 接口 | PascalCase + Service | `UserService.java` |
| Service 实现 | PascalCase + ServiceImpl | `UserServiceImpl.java` |
| Controller | PascalCase + Controller | `UserController.java` |
| Mapper/DAO | PascalCase + Mapper/Repository | `UserMapper.java` |
| 配置类 | PascalCase + Config | `RedisConfig.java` |
| 工具类 | PascalCase + Utils/Helper | `DateUtils.java` |
| 常量类 | PascalCase + Constants | `UserConstants.java` |
| 枚举 | PascalCase + Enum 后缀（可选） | `UserStatus.java` |
| 异常类 | PascalCase + Exception | `BusinessException.java` |
| Converter | PascalCase + Converter | `UserConverter.java` |

### 代码命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 类名 | PascalCase | `UserService` |
| 方法名 | camelCase，动词开头 | `getUserById`、`createOrder` |
| 变量名 | camelCase | `userList`、`orderCount` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 包名 | 全小写，点分隔 | `com.example.project.module.user` |
| 数据库表名 | snake_case，模块前缀 | `sys_user`、`biz_order` |
| 数据库字段 | snake_case | `create_time`、`user_name` |
| URL 路径 | kebab-case，复数名词 | `/api/users`、`/api/order-items` |
| 配置键 | kebab-case | `app.max-upload-size` |

### 方法命名约定

```java
// 查询
getById(Long id)           // 单个查询
list()                     // 列表查询
page(PageQuery query)      // 分页查询
count()                    // 计数

// 操作
create(CreateDTO dto)      // 创建
update(Long id, UpdateDTO) // 更新
delete(Long id)            // 删除

// 布尔判断
existsByUsername(String)   // 存在性检查
isActive()                 // 状态判断

// 私有方法
validateXxx()              // 校验
convertToXxx()             // 转换
buildXxxQuery()            // 构建查询
```

---

## Java 编码规范

### 类结构顺序

```java
public class UserServiceImpl implements UserService {

    // 1. 常量
    private static final int MAX_RETRY = 3;

    // 2. 依赖注入的字段（用 final + 构造器注入）
    private final UserMapper userMapper;
    private final DeptService deptService;

    // 3. 构造器
    public UserServiceImpl(UserMapper userMapper, DeptService deptService) {
        this.userMapper = userMapper;
        this.deptService = deptService;
    }

    // 4. 公共方法（按接口定义顺序）
    @Override
    public UserVO getById(Long id) { /* ... */ }

    @Override
    public Long create(UserCreateDTO dto) { /* ... */ }

    // 5. 私有方法
    private void validateUsername(String username) { /* ... */ }
}
```

### 导入规则

```java
// 分组（每组之间空一行）：
// 1. java.*
import java.util.List;
import java.util.Map;

// 2. javax.*
import javax.validation.Valid;

// 3. 第三方库
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

// 4. 项目内部
import com.example.project.module.user.entity.User;
import com.example.project.module.user.mapper.UserMapper;

// 5. 静态导入（很少使用）
import static com.example.project.common.constant.CommonConstant.*;
```

### 注解使用

```java
// 注解顺序：Spring → 框架 → 自定义
@RestController          // Spring
@RequestMapping("/api/users")
@Slf4j                  // Lombok
@RequiredArgsConstructor // Lombok
@Tag(name = "用户管理")  // Swagger/SpringDoc
public class UserController {
    // ...
}
```

### 方法设计

```java
// 好：单一职责，命名清晰，逻辑分明
@Override
@Transactional(rollbackFor = Exception.class)
public Long create(UserCreateDTO dto) {
    validateUsernameUnique(dto.getUsername());
    User user = UserConverter.toEntity(dto);
    user.setPassword(encryptPassword(dto.getPassword()));
    userMapper.insert(user);
    log.info("创建用户成功, id={}", user.getId());
    return user.getId();
}

// 坏：职责混杂，逻辑嵌套
public Long create(UserCreateDTO dto) {
    if (dto.getUsername() != null) {        // 应该用 @Valid 校验
        User existing = userMapper.selectOne(  // 应该提取为校验方法
            new LambdaQueryWrapper<User>().eq(User::getUsername, dto.getUsername())
        );
        if (existing != null) {
            throw new RuntimeException("重复"); // 应该用自定义异常
        }
    }
    User user = new User();
    user.setUsername(dto.getUsername());    // 应该用 Converter
    // ... 一大堆 set
    userMapper.insert(user);
    return user.getId();
}
```

---

## 数据库交互性能规范

### 存在性检查：必须使用 EXISTS

**核心原则**：仅需判断"是否存在"时，使用 `EXISTS` 或 `SELECT 1 ... LIMIT 1`，禁止使用 `SELECT COUNT(*)` 或查出完整记录后再判空。

```java
// 好：使用 EXISTS（只判断是否存在，数据库查到第一条即返回）
boolean exists = userMapper.existsByUsername(username);

// 好：MyBatis-Plus 的 exists 方法（内部使用 SELECT 1 ... LIMIT 1）
boolean exists = userMapper.exists(
    new LambdaQueryWrapper<User>().eq(User::getUsername, username)
);

// 好：MyBatis XML 中使用 EXISTS
// <select id="existsByUsername" resultType="boolean">
//     SELECT EXISTS(SELECT 1 FROM sys_user WHERE username = #{username} AND deleted = 0)
// </select>

// 坏：使用 SELECT COUNT(*)（会扫描所有匹配行）
Long count = userMapper.selectCount(
    new LambdaQueryWrapper<User>().eq(User::getUsername, username)
);
if (count > 0) { ... }

// 坏：查出完整记录再判空（加载了不必要的字段和数据）
User existing = userMapper.selectOne(
    new LambdaQueryWrapper<User>().eq(User::getUsername, username)
);
if (existing != null) { ... }
```

### EXISTS 适用的典型场景

| 场景 | 说明 |
|------|------|
| 唯一性校验 | 创建/更新前检查用户名、编码、手机号等是否已存在 |
| 关联数据检查 | 删除前检查是否有子表数据引用 |
| 状态前置检查 | 操作前检查目标数据是否处于某种状态 |
| 权限/归属校验 | 检查当前用户是否为目标数据的所有者 |

### MyBatis-Plus Mapper 定义示例

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {

    /**
     * 检查用户名是否已存在
     * 使用 SELECT 1 ... LIMIT 1 而非 SELECT COUNT(*)
     */
    default boolean existsByUsername(String username) {
        return exists(new LambdaQueryWrapper<User>()
            .eq(User::getUsername, username)
            .eq(User::getDeleted, 0)
        );
    }
}
```

### MyBatis XML 中的 EXISTS 写法

```xml
<!-- 好：EXISTS 子查询 -->
<select id="existsByUsername" resultType="boolean">
    SELECT EXISTS(
        SELECT 1 FROM sys_user
        WHERE username = #{username} AND deleted = 0
    )
</select>

<!-- 好：SELECT 1 + LIMIT 1 -->
<select id="existsByUsername" resultType="boolean">
    SELECT COUNT(*) > 0 FROM (
        SELECT 1 FROM sys_user
        WHERE username = #{username} AND deleted = 0
        LIMIT 1
    ) t
</select>

<!-- 坏：全表扫描统计 -->
<select id="countByUsername" resultType="long">
    SELECT COUNT(*) FROM sys_user WHERE username = #{username} AND deleted = 0
</select>
```

### 其他数据库性能规则

- **禁止 `SELECT *`**：明确列出需要的字段（已在禁止模式清单中）
- **分页必须有限制**：`pageSize` 设上限，防止一次拉取大量数据
- **避免大事务中的查询**：事务内不做非必要的远程调用和耗时查询
- **批量操作用批量接口**：`insertBatch` / `updateBatch` 替代循环单条操作
- **索引覆盖查询**：高频查询的字段应包含在索引中，减少回表

---

## 异常处理规范

### 自定义异常体系

```java
// 业务异常基类
public class BusinessException extends RuntimeException {

    private final Integer code;

    public BusinessException(String message) {
        super(message);
        this.code = 400;
    }

    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }
}

// 特定场景异常（可选，用于区分错误类型）
public class UnauthorizedException extends BusinessException {
    public UnauthorizedException(String message) {
        super(401, message);
    }
}

public class ForbiddenException extends BusinessException {
    public ForbiddenException(String message) {
        super(403, message);
    }
}

public class NotFoundException extends BusinessException {
    public NotFoundException(String message) {
        super(404, message);
    }
}
```

### 异常使用规则

```java
// 好：抛出具体的业务异常
if (user == null) {
    throw new NotFoundException("用户不存在");
}

if (!user.isActive()) {
    throw new BusinessException("用户已被禁用");
}

// 坏：抛出通用异常
if (user == null) {
    throw new RuntimeException("error");    // 无具体信息
}

// 坏：吞掉异常
try {
    something();
} catch (Exception e) {
    // 空 catch
}

// 坏：异常中暴露敏感信息
throw new BusinessException("数据库连接失败: " + dbUrl); // 不要暴露内部信息
```

### 错误码体系

#### 错误码分段规则

采用 5 位数字编码，按模块分段，便于定位和扩展：

```
错误码格式：XABBB

X     — 错误类型
  1     参数/请求错误
  2     认证/授权错误
  4     业务逻辑错误
  5     系统/第三方错误

A     — 模块编号
  0     公共/通用
  1     用户模块
  2     订单模块
  3     商品模块
  ...   按项目模块扩展

BBB   — 模块内具体错误编号（001-999）
```

| 范围 | 含义 | 示例 |
|------|------|------|
| 10000-10999 | 通用参数错误 | 10001=参数不能为空 |
| 20000-20999 | 通用认证错误 | 20001=未登录 |
| 40000-40999 | 通用业务错误 | 40001=操作太频繁 |
| 40100-40199 | 用户模块业务错误 | 40101=用户名已存在 |
| 40200-40299 | 订单模块业务错误 | 40201=库存不足 |
| 50000-50999 | 系统内部错误 | 50001=数据库异常 |

#### 错误码常量类

```java
/**
 * 全局错误码常量
 * 规则：5位数字，分段管理，新增模块在对应段内追加
 */
public final class ErrorCode {

    private ErrorCode() {}

    // ==================== 通用参数错误 10000-10999 ====================
    public static final int PARAM_MISSING = 10001;
    public static final int PARAM_INVALID = 10002;

    // ==================== 通用认证错误 20000-20999 ====================
    public static final int UNAUTHORIZED = 20001;
    public static final int TOKEN_EXPIRED = 20002;
    public static final int FORBIDDEN = 20003;

    // ==================== 通用业务错误 40000-40999 ====================
    public static final int OPERATION_TOO_FREQUENT = 40001;
    public static final int DATA_NOT_FOUND = 40002;
    public static final int DATA_DUPLICATE = 40003;

    // ==================== 用户模块 40100-40199 ====================
    public static final int USER_NOT_FOUND = 40101;
    public static final int USER_DISABLED = 40102;
    public static final int USERNAME_EXISTS = 40103;
    public static final int PASSWORD_WRONG = 40104;

    // ==================== 系统错误 50000-50999 ====================
    public static final int SYSTEM_ERROR = 50001;
    public static final int DB_ERROR = 50002;
    public static final int THIRD_PARTY_ERROR = 50003;
}
```

#### 使用方式

```java
// 抛出带错误码的业务异常
throw new BusinessException(ErrorCode.USERNAME_EXISTS, "用户名已存在");

// 在全局异常处理器中统一封装错误码
@ExceptionHandler(BusinessException.class)
public Result<Void> handleBusinessException(BusinessException e) {
    log.warn("业务异常: code={}, msg={}", e.getCode(), e.getMessage());
    return Result.fail(e.getCode(), e.getMessage());
}
```

---

## 日志规范

### 日志级别使用

```java
// ERROR：系统错误，需要立即处理
log.error("数据库连接失败", exception);
log.error("支付回调处理失败, orderId={}", orderId, exception);

// WARN：业务异常或潜在问题
log.warn("用户登录失败, username={}, reason={}", username, "密码错误");
log.warn("配置项缺失，使用默认值: {}", defaultValue);

// INFO：关键业务操作记录
log.info("用户登录成功, userId={}, ip={}", userId, ip);
log.info("订单创建成功, orderId={}, amount={}", orderId, amount);
log.info("定时任务执行完成, task={}, cost={}ms", taskName, cost);

// DEBUG：调试信息（生产环境通常关闭）
log.debug("查询参数: {}", queryParams);
log.debug("SQL执行: sql={}, params={}", sql, params);
```

### 日志规则

- 使用 `{}` 占位符，不用字符串拼接
- 关键操作必须有 INFO 日志
- 异常日志包含完整堆栈：`log.error("msg", exception)`
- 不在日志中打印敏感信息（密码、token、身份证号）
- 不使用 `System.out.println` / `System.err.println`
- 不在循环中打印日志（除非有条件控制）

---

## 参数校验规范

### 核心原则：注解优先，减少手动校验

**能用注解校验的，不要写手动 if-else。** 校验逻辑应尽可能前置到 DTO 的注解声明中，
让 Service 层只关注核心业务逻辑，而不是充斥着大量的参数校验代码。

```
校验分层策略：

Controller 层（@Valid / @Validated 触发）
├── 格式校验：@NotBlank, @Size, @Email, @Pattern 等（标准 JSR 303）
├── 范围校验：@Min, @Max, @DecimalMin, @DecimalMax 等
├── 分组校验：@Validated(Create.class) 区分创建/更新场景
├── 嵌套校验：@Valid 触发嵌套对象的校验
└── 自定义注解校验：@UniqueUsername, @ValidEnum 等

Service 层（仅在必要时）
└── 需要访问数据库或复杂业务上下文的校验（尽量也用自定义注解封装）
```

### 标准 DTO 校验注解

```java
@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 50, message = "用户名长度2-50")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "用户名只能包含字母数字下划线")
    @UniqueUsername(message = "用户名已存在")    // 自定义注解校验唯一性
    private String username;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "角色不能为空")
    private Long roleId;

    @Size(min = 6, max = 20, message = "密码长度6-20")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
             message = "密码必须包含大小写字母和数字")
    private String password;
}
```

### 自定义校验注解

**将业务校验封装为注解**，避免在 Service 中写大量手动校验代码。

#### 1. 唯一性校验注解（查数据库场景）

```java
// ====== 注解定义 ======
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueUsernameValidator.class)
public @interface UniqueUsername {
    String message() default "用户名已存在";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// ====== 校验器实现 ======
@Component  // 必须是 Spring Bean，才能注入 Mapper
public class UniqueUsernameValidator implements ConstraintValidator<UniqueUsername, String> {

    @Autowired
    private UserMapper userMapper;

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (StringUtils.isBlank(username)) {
            return true; // 空值由 @NotBlank 处理，避免重复报错
        }
        return !userMapper.existsByUsername(username);
    }
}
```

**效果对比：**

```java
// 坏：Service 中手动校验（每个 Service 方法都要写一遍）
@Transactional(rollbackFor = Exception.class)
public Long create(UserCreateDTO dto) {
    validateUsernameUnique(dto.getUsername());  // 手动调用
    validateEmailUnique(dto.getEmail());        // 手动调用
    validatePhoneUnique(dto.getPhone());        // 手动调用
    User user = UserConverter.toEntity(dto);
    userMapper.insert(user);
    return user.getId();
}

// 好：注解声明在 DTO 上，Service 代码精简
@Transactional(rollbackFor = Exception.class)
public Long create(UserCreateDTO dto) {
    // DTO 的 @Valid 已在 Controller 层触发，到此处所有校验已通过
    User user = UserConverter.toEntity(dto);
    userMapper.insert(user);
    log.info("创建用户成功, userId={}", user.getId());
    return user.getId();
}
```

#### 2. 枚举值校验注解

```java
// ====== 注解定义 ======
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidEnumValidator.class)
public @interface ValidEnum {
    String message() default "值不在有效范围内";
    Class<? extends Enum<?>> enumClass();
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// ====== 校验器实现 ======
public class ValidEnumValidator implements ConstraintValidator<ValidEnum, Integer> {

    private Class<? extends Enum<?>> enumClass;

    @Override
    public void initialize(ValidEnum annotation) {
        this.enumClass = annotation.enumClass();
    }

    @Override
    public boolean isValid(Integer value, ConstraintValidatorContext context) {
        if (value == null) return true; // 空值由 @NotNull 处理
        for (Enum<?> e : enumClass.getEnumConstants()) {
            if (((EnumCode) e).getCode().equals(value)) return true;
        }
        return false;
    }
}

// ====== 使用 ======
@NotNull(message = "状态不能为空")
@ValidEnum(enumClass = UserStatusEnum.class, message = "用户状态值无效")
private Integer status;
```

#### 3. 类级别跨字段校验（多字段联动）

```java
// 场景：密码和确认密码必须一致

// ====== 注解定义 ======
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordMatchValidator.class)
public @interface PasswordMatch {
    String message() default "两次密码输入不一致";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// ====== 校验器实现 ======
public class PasswordMatchValidator implements ConstraintValidator<PasswordMatch, Object> {

    @Override
    public boolean isValid(Object dto, ConstraintValidatorContext context) {
        try {
            String password = (String) new PropertyDescriptor("password", dto.getClass())
                    .getReadMethod().invoke(dto);
            String confirmPassword = (String) new PropertyDescriptor("confirmPassword", dto.getClass())
                    .getReadMethod().invoke(dto);
            if (password == null || confirmPassword == null) return true;
            return password.equals(confirmPassword);
        } catch (Exception e) {
            return false;
        }
    }
}

// ====== 使用（加在类上） ======
@Data
@PasswordMatch(groups = Create.class)  // 仅在创建时校验
public class UserCreateDTO {
    @NotBlank(message = "密码不能为空")
    private String password;

    @NotBlank(message = "确认密码不能为空")
    private String confirmPassword;
}
```

### 校验分组（Create / Update 分离）

**核心场景**：创建和更新时，同一 DTO 的校验规则不同。通过分组避免定义两个几乎一样的 DTO。

```java
// ====== 定义分组接口 ======
public interface Create {}  // 创建校验组
public interface Update {}  // 更新校验组

// ====== DTO 中按组指定校验规则 ======
@Data
public class UserDTO {

    // 创建时不能为空，更新时可以为空（不修改密码时无需传）
    @NotBlank(message = "密码不能为空", groups = Create.class)
    @Size(min = 6, max = 20, message = "密码长度6-20", groups = {Create.class, Update.class})
    private String password;

    @NotBlank(message = "用户名不能为空", groups = Create.class)
    @Size(min = 2, max = 50, message = "用户名长度2-50")
    @UniqueUsername(groups = Create.class)  // 仅创建时校验唯一性
    private String username;

    @Email(message = "邮箱格式不正确")
    private String email;
}
```

```java
// ====== Controller 中使用分组 ======
@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public Result<Long> create(@RequestBody @Validated(Create.class) UserDTO dto) {
        // 触发 Create 组校验：密码必填、用户名必填且唯一
        return Result.success(userService.create(dto));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id,
                               @RequestBody @Validated(Update.class) UserDTO dto) {
        // 触发 Update 组校验：密码选填（但如果传了要校验长度）、用户名不校验唯一性
        userService.update(id, dto);
        return Result.success();
    }
}
```

**分组继承**（复杂场景下 Update = Create 的全部规则 + 额外规则）：

```java
// Default 分组：所有未指定分组的注解默认属于 Default
// Update 继承 Default：Update 校验 = Default 全部规则 + Update 组规则
public interface Update extends Default {}

// 这样标注了 groups = {} 的注解在 Update 时也会生效
@NotBlank(message = "用户名不能为空")  // 等价于 groups = Default.class
private String username;
```

### 分页查询参数

```java
@Data
public class PageQuery {

    @Min(value = 1, message = "页码最小为1")
    private Integer pageNum = 1;

    @Min(value = 1, message = "每页条数最小为1")
    @Max(value = 100, message = "每页条数最大为100")
    private Integer pageSize = 10;

    private String keyword;       // 搜索关键词（可选）
    private String orderBy;       // 排序字段（可选）
    private String orderDirection; // 排序方向（可选）
}
```

### Controller 中触发校验

```java
@PostMapping
public Result<Long> create(@RequestBody @Valid UserCreateDTO dto) {
    // @Valid 触发校验，失败抛出 MethodArgumentNotValidException
    return Result.success(userService.create(dto));
}

@GetMapping
public Result<PageResult<UserVO>> page(@Valid UserQueryDTO query) {
    // GET 请求参数校验
    return Result.success(userService.page(query));
}
```

### @Valid vs @Validated 选择

| 特性 | `@Valid` | `@Validated` |
|------|----------|-------------|
| 来源 | JSR 303 标准 | Spring 扩展 |
| 嵌套校验 | 支持（在嵌套对象字段上加 `@Valid`） | 不支持 |
| 分组校验 | 不支持 | 支持（指定校验组） |
| 使用位置 | 方法参数、字段 | 类、方法、参数 |

**选择规则：**

```java
// 场景 1：普通校验（绝大多数情况）— 用 @Valid
@PostMapping
public Result<Long> create(@RequestBody @Valid UserCreateDTO dto) { }

// 场景 2：需要分组校验（创建和更新校验规则不同）— 用 @Validated
@PostMapping
public Result<Long> create(@RequestBody @Validated(Create.class) UserDTO dto) { }

@PutMapping("/{id}")
public Result<Void> update(@PathVariable Long id,
                           @RequestBody @Validated(Update.class) UserDTO dto) { }

// 场景 3：嵌套对象校验 — 必须用 @Valid
@Data
public class OrderCreateDTO {
    @Valid                           // 必须加 @Valid 才能触发嵌套校验
    @NotNull(message = "收货地址不能为空")
    private AddressDTO address;
}

// 场景 4：路径参数校验 — 必须在类上加 @Validated
@RestController
@Validated
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public Result<UserVO> getById(
            @PathVariable @Min(value = 1, message = "ID必须为正数") Long id) {
        // 路径参数校验需要在类级别加 @Validated 才生效
    }
}
```

> **规则**：默认使用 `@Valid`。仅在需要分组校验或路径参数校验时使用 `@Validated`。

### 注解校验不适用场景

以下场景不适合用注解，应在 Service 中手动校验：

| 场景 | 原因 | 示例 |
|------|------|------|
| 依赖数据库上下文 | 校验需要查询其他表的数据 | 转账时检查余额是否充足 |
| 需要抛特定错误码 | 注解校验统一返回 400，无法区分业务错误码 | 需要返回 40101 用户名已存在 |
| 依赖当前登录用户 | 校验需要当前用户信息 | 检查当前用户是否有权操作 |
| 跨请求状态校验 | 校验依赖请求外的状态 | 防重复提交、操作频率限制 |

> **即使存在上述场景，也应先通过 DTO 注解完成格式层面的校验（非空、格式、长度等），
> 再在 Service 中仅处理必须依赖业务上下文的校验。不要把格式校验也放到 Service 中。**

---

## 事务管理规范

### 原子性原则：CUD 操作必须有事务

**核心原则**：所有涉及数据变更的操作（新增、修改、删除）必须在事务保护下执行，
确保操作的原子性——要么全部成功，要么全部回滚，不允许出现中间状态。

```java
// 新增操作：必须加 @Transactional
@Transactional(rollbackFor = Exception.class)
public Long create(UserCreateDTO dto) {
    // 校验 + 插入，必须在同一事务中
    User user = UserConverter.toEntity(dto);
    userMapper.insert(user);
    log.info("创建用户成功, id={}", user.getId());
    return user.getId();
}

// 修改操作：必须加 @Transactional
@Transactional(rollbackFor = Exception.class)
public void update(Long id, UserUpdateDTO dto) {
    User user = userMapper.selectById(id);
    if (user == null) {
        throw new NotFoundException("用户不存在");
    }
    // 校验 + 更新，必须在同一事务中
    UserConverter.updateEntity(user, dto);
    userMapper.updateById(user);
    log.info("更新用户成功, id={}", id);
}

// 删除操作：必须加 @Transactional（可能涉及级联操作）
@Transactional(rollbackFor = Exception.class)
public void delete(Long id) {
    User user = userMapper.selectById(id);
    if (user == null) {
        throw new NotFoundException("用户不存在");
    }
    userMapper.deleteById(id);
    // 如果有子表数据需要级联删除，也在同一事务中
    userRoleMapper.deleteByUserId(id);
    log.info("删除用户成功, id={}", id);
}

// 读操作：不加事务（或加 @Transactional(readOnly = true)）
public UserVO getById(Long id) {
    // 查询操作
}

// 涉及多个写操作：必须加事务确保原子性
@Transactional(rollbackFor = Exception.class)
public void transferMoney(Long fromId, Long toId, BigDecimal amount) {
    accountMapper.deduct(fromId, amount);
    accountMapper.add(toId, amount);
    // 任何一步失败都要回滚，保证资金安全
}
```

### 事务注意事项

```java
// 注意 1：rollbackFor 必须指定 Exception.class
@Transactional  // 坏：默认只回滚 RuntimeException
@Transactional(rollbackFor = Exception.class)  // 好：回滚所有异常

// 注意 2：避免事务方法中调用远程服务（长事务）
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderCreateDTO dto) {
    orderMapper.insert(order);
    // 坏：远程调用可能导致长事务
    paymentService.initPayment(order.getId());
    // 好：用事件或消息队列异步处理
    eventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));
}

// 注意 3：避免同类方法自调用（事务失效）
@Service
public class UserServiceImpl implements UserService {

    public void methodA() {
        // 这里调用 methodB，methodB 的 @Transactional 会失效
        // 因为是内部调用，不经过代理
        this.methodB();
    }

    @Transactional(rollbackFor = Exception.class)
    public void methodB() {
        // ...
    }
}

// 注意 4：事务方法必须是 public（非 public 方法事务注解不生效）
@Transactional(rollbackFor = Exception.class)
public void createUser(UserCreateDTO dto) { /* ... */ }

// 注意 5：事务边界应尽量小，只包裹必要的写操作
// 坏：事务范围过大，包含了不必要的查询和校验
@Transactional(rollbackFor = Exception.class)
public void processOrder(OrderDTO dto) {
    // 大量查询和外部调用（不需要在事务中）
    externalService.validate(dto);
    List<Item> items = externalService.getItems(dto);

    // 只有这里需要事务保护
    orderMapper.insert(order);
    orderItemMapper.insertBatch(items);
}

// 好：将需要事务的部分提取为独立方法
public void processOrder(OrderDTO dto) {
    // 非事务操作
    externalService.validate(dto);
    List<Item> items = externalService.getItems(dto);

    // 只对写操作加事务
    saveOrderInternal(dto, items);
}

@Transactional(rollbackFor = Exception.class)
public void saveOrderInternal(OrderDTO dto, List<Item> items) {
    orderMapper.insert(order);
    orderItemMapper.insertBatch(items);
}
```

---

## 并发与线程安全

### 线程安全规则

```java
// 禁止在 Service 中使用可变的实例变量
@Service
public class UserServiceImpl implements UserService {

    // 坏：Service 是单例，这个变量会被所有请求共享
    private List<User> cache = new ArrayList<>();

    // 好：无状态，所有数据通过方法参数传递
    private final UserMapper userMapper;

    // 如果必须缓存：用线程安全的容器
    private final ConcurrentHashMap<Long, User> localCache = new ConcurrentHashMap<>();
}
```

### SimpleDateFormat 线程安全

```java
// 坏：SimpleDateFormat 非线程安全
private static final SimpleDateFormat SDF = new SimpleDateFormat("yyyy-MM-dd");

// 好：用 DateTimeFormatter（线程安全）
private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

// 或用 ThreadLocal（不推荐，优先用 DateTimeFormatter）
private static final ThreadLocal<SimpleDateFormat> SDF =
    ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));
```

---

## 禁止模式清单

| 编号 | 禁止模式 | 正确做法 |
|------|----------|----------|
| 1 | `System.out.println` | 使用 `log.info/debug` |
| 2 | 空 catch 块 | 至少记录日志或抛出包装异常 |
| 3 | `new RuntimeException()` | 使用自定义 `BusinessException` |
| 4 | 硬编码配置值 | 使用 `@Value` 或 `@ConfigurationProperties` |
| 5 | 直接返回 Entity 给前端 | 转换为 VO 后返回 |
| 6 | Controller 中写业务逻辑 | 委托给 Service 层 |
| 7 | Service 中直接拼 SQL | SQL 写在 Mapper XML 或用 QueryWrapper |
| 8 | 魔法值 | 用常量或枚举 |
| 9 | `SELECT *` | 明确列出需要的字段 |
| 10 | 字段注入 `@Autowired` | 构造器注入 |
| 11 | 金额用 `float/double` | 使用 `BigDecimal` |
| 12 | 在日志中打印敏感信息 | 脱敏后打印 |
| 13 | `@Transactional` 不指定 rollbackFor | 添加 `rollbackFor = Exception.class` |
| 14 | 吞掉异常不处理 | 记录日志或向上抛出 |
| 15 | 数据库主键使用自增ID（`IdType.AUTO` / `GenerationType.IDENTITY`） | 必须使用雪花ID（`IdType.ASSIGN_ID`） |
| 16 | 用 `SELECT COUNT(*)` 或查完整记录判断是否存在 | 使用 `EXISTS` 或 `SELECT 1 ... LIMIT 1` |
| 17 | 新增/修改/删除操作不加事务 | CUD 操作必须加 `@Transactional(rollbackFor = Exception.class)` |

---

## 强制模式清单

| 编号 | 强制模式 | 说明 |
|------|----------|------|
| 1 | DTO 参数校验 | `@Valid` + 校验注解 |
| 2 | 统一返回值封装 | 所有接口返回 `Result<T>` |
| 3 | 全局异常处理 | `@RestControllerAdvice` |
| 4 | 公共方法 Javadoc | Service 接口方法必须有注释 |
| 5 | 构造器注入 | 不用 `@Autowired` 字段注入 |
| 6 | CUD 事务原子性 | 新增/修改/删除操作必须加 `@Transactional(rollbackFor = Exception.class)` |
| 7 | Entity/DTO/VO 分离 | 不直接传递 Entity 给前端 |
| 8 | 日志记录关键操作 | 创建/更新/删除操作有 INFO 日志 |
| 9 | 分页参数限制 | pageSize 最大值限制（防过量查询） |
| 10 | 雪花ID主键 | `@TableId(type = IdType.ASSIGN_ID)`，禁止自增 |
| 11 | EXISTS 存在性检查 | 仅判断是否存在时，使用 `EXISTS` 或 `SELECT 1 ... LIMIT 1`，禁止 `SELECT COUNT(*)` |

---

## Spring Boot 版本兼容

### javax vs jakarta 包名差异

Spring Boot 2.x 使用 `javax` 命名空间，Spring Boot 3.x 迁移到 `jakarta`。
**必须在 P0 阶段确认项目使用的 Spring Boot 版本**，使用对应的包名：

| 功能 | Spring Boot 2.x | Spring Boot 3.x |
|------|-----------------|-----------------|
| 参数校验注解 | `javax.validation.Valid` | `jakarta.validation.Valid` |
| 校验约束 | `javax.validation.constraints.*` | `jakarta.validation.constraints.*` |
| Servlet API | `javax.servlet.*` | `jakarta.servlet.*` |
| Persistence | `javax.persistence.*` | `jakarta.persistence.*` |

### 判断方法

```bash
# 查看 pom.xml 中的 Spring Boot 版本
grep 'spring-boot-starter-parent' pom.xml
# 2.x → 使用 javax
# 3.x → 使用 jakarta
```

> **规则**：进入已有项目时，使用项目已有的包名。新建项目默认使用 Spring Boot 3.x + jakarta。

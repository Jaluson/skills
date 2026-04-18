# Java 8~25 & Spring Boot 3/4 新特性速查

> 本文档记录各版本核心新特性、适用场景及最佳实践。编写代码时应根据项目 JDK 版本选择合适的特性。

---

## LTS 版本升级路径

```
Java 8 → Java 11 → Java 17 → Java 21 → Java 25
                    ↑ LTS     ↑ LTS     ↑ LTS
```

| LTS 版本 | 发布时间 | 推荐场景 |
|----------|----------|----------|
| Java 8 | 2014.03 | 遗留系统维护 |
| Java 11 | 2018.09 | 企业稳定版 |
| Java 17 | 2021.09 | 当前主流基线 |
| Java 21 | 2023.09 | 新项目推荐 |
| Java 25 | 2025.09 | 最新 LTS |

---

## 一、Java 8 新特性（基础层）

> 所有现代 Java 的起点，务必掌握。

### 1.1 Lambda 表达式

```java
// 匿名内部类 → Lambda
Runnable r = () -> System.out.println("hello");

// 集合排序
list.sort((a, b) -> a.getName().compareTo(b.getName()));
// 或方法引用
list.sort(Comparator.comparing(User::getName));
```

**适用场景**：集合操作、事件回调、函数式接口参数

### 1.2 Stream API

```java
// 筛选 + 映射 + 收集
List<String> names = users.stream()
    .filter(u -> u.getStatus() == 1)
    .map(User::getName)
    .collect(Collectors.toList());

// 分组
Map<Integer, List<User>> grouped = users.stream()
    .collect(Collectors.groupingBy(User::getStatus));

// 统计
IntSummaryStatistics stats = orders.stream()
    .mapToInt(Order::getAmount)
    .summaryStatistics();
```

**适用场景**：集合转换、过滤、分组、统计、聚合

### 1.3 Optional

```java
// 避免 NPE
Optional<User> user = repository.findById(id);

// 存在则处理，不存在给默认值
String email = user.map(User::getEmail).orElse("default@mail.com");

// 不存在则抛业务异常
User u = user.orElseThrow(() -> new BusinessException(404, "用户不存在"));
```

**适用场景**：方法返回值可能为空时，替代 null 判断

### 1.4 默认方法（Default Methods）

```java
public interface BaseService<T> {
    // 默认实现，实现类可选择覆盖
    default List<T> findAll() {
        return getRepository().findAll();
    }

    default long count() {
        return getRepository().count();
    }
}
```

**适用场景**：接口演进（加方法不破坏实现类）、通用基类接口

### 1.5 Date/Time API

```java
// 替代 Date + Calendar
LocalDate today = LocalDate.now();
LocalDateTime now = LocalDateTime.now();

// 格式化
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String text = now.format(fmt);

// 计算
LocalDate expiry = today.plusMonths(3);
Duration diff = Duration.between(start, end);
```

**适用场景**：所有日期时间操作，禁止使用 Date/Calendar

---

## 二、Java 9~10 新特性

### 2.1 集合工厂方法（Java 9）

```java
// 快速创建不可变集合
List<String> list = List.of("a", "b", "c");
Set<Integer> set = Set.of(1, 2, 3);
Map<String, Integer> map = Map.of("key1", 1, "key2", 2);
```

**适用场景**：常量定义、测试数据、配置项

### 2.2 接口私有方法（Java 9）

```java
public interface DataProcessor {
    default void process(String data) {
        validate(data);
        doProcess(data);
    }

    // 私有方法：复用逻辑
    private void validate(String data) {
        if (data == null || data.isBlank()) {
            throw new IllegalArgumentException("数据为空");
        }
    }

    private void doProcess(String data) { /* ... */ }
}
```

**适用场景**：接口中 default 方法的公共逻辑提取

### 2.3 var 局部变量类型推断（Java 10）

```java
// ✅ 推荐：右侧类型明显时使用
var users = userRepository.findAll();
var map = new HashMap<String, List<Order>>();
var stream = users.stream().filter(u -> u.isActive());

// ❌ 不推荐：降低可读性
var result = process(data); // process 返回什么？不清楚
```

**适用场景**：局部变量声明，右侧构造函数或方法调用类型明确时

---

## 三、Java 11 新特性（LTS）

### 3.1 HTTP Client

```java
// 替代 HttpURLConnection
HttpClient client = HttpClient.newHttpClient();

// GET
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Authorization", "Bearer " + token)
    .GET()
    .build();
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

// 异步 POST
HttpRequest postRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
    .build();
CompletableFuture<HttpResponse<String>> future =
    client.sendAsync(postRequest, HttpResponse.BodyHandlers.ofString());
```

**适用场景**：调用外部 HTTP 接口（简单场景），替代 RestTemplate/HttpClient 的轻量选择

### 3.2 String 增强

```java
// 判空
"  ".isBlank();  // true
"hello".strip();  // 去首尾空白（优于 trim，支持 Unicode）
"aa".repeat(3);   // "aaaaaa"
"hello\nworld".lines().count();  // 2
```

---

## 四、Java 12~16 新特性

### 4.1 Switch 表达式（Java 14 标准化）

```java
// ✅ 新写法：表达式形式，自动返回
String statusText = switch (status) {
    case 0 -> "禁用";
    case 1 -> "正常";
    case 2 -> "冻结";
    default -> "未知";
};

// ✅ 带代码块
String result = switch (type) {
    case "A" -> {
        log.info("处理 A 类型");
        yield "TypeA";
    }
    case "B" -> {
        log.info("处理 B 类型");
        yield "TypeB";
    }
    default -> "Unknown";
};
```

**适用场景**：所有 switch 语句，替代 if-else 链

### 4.2 instanceof 模式匹配（Java 16 标准化）

```java
// ✅ 新写法：类型检查 + 自动绑定
if (obj instanceof String s) {
    // s 已经是 String 类型，直接使用
    System.out.println(s.length());
}

if (event instanceof OrderCreatedEvent e) {
    processOrder(e.getOrder());
}
```

**适用场景**：类型检查后立即使用的场景，替代强制转换

### 4.3 Records（Java 16 标准化）

```java
// 不可变数据载体，自动生成 constructor/getter/equals/hashCode/toString
public record UserVO(Long id, String username, String email) {}

public record PageQuery(int page, int pageSize, String keyword) {
    // 可添加紧凑构造器做校验
    public PageQuery {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 10;
    }
}

// 作为 DTO/VO 使用
public record Result<T>(int code, String message, T data) {
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }
}
```

**适用场景**：DTO、VO、请求参数、配置对象、方法返回多个值

### 4.4 Stream.toList()（Java 16）

```java
// ✅ 新写法
List<String> names = users.stream().map(User::getName).toList();

// ❌ 旧写法
List<String> names = users.stream().map(User::getName).collect(Collectors.toList());
```

**适用场景**：所有 `.collect(Collectors.toList())` 的替换（注意返回不可变列表）

---

## 五、Java 17 新特性（LTS）

### 5.1 Sealed Classes（密封类）

```java
// 限定子类范围，增强类型安全
public sealed interface PaymentResult
    permits Success, Failed, Pending {}

public record Success(String transactionId, BigDecimal amount) implements PaymentResult {}
public record Failed(String errorCode, String errorMessage) implements PaymentResult {}
public record Pending(String transactionId, LocalDateTime estimatedTime) implements PaymentResult {}

// 使用：编译器知道所有可能的子类型
String message = switch (result) {
    case Success s -> "支付成功: " + s.transactionId();
    case Failed f  -> "支付失败: " + f.errorMessage();
    case Pending p -> "处理中，预计: " + p.estimatedTime();
    // 不需要 default，编译器已穷举
};
```

**适用场景**：状态机、结果类型、领域事件、有限状态集合

### 5.2 文本块（Java 15 标准化，Java 17 LTS）

```java
// ✅ 多行字符串
String sql = """
    SELECT u.id, u.username, u.email
    FROM t_user u
    WHERE u.status = 1
      AND u.deleted = 0
    ORDER BY u.create_time DESC
    """;

String json = """
    {
        "code": 200,
        "message": "success",
        "data": []
    }
    """;
```

**适用场景**：SQL 语句、JSON 模板、HTML 片段、日志模板

---

## 六、Java 18~20 新特性

### 6.1 UTF-8 默认编码（Java 18）

```java
// 不再需要显式指定 UTF-8
// Charset.defaultCharset() 始终返回 UTF-8
// 解决 Windows 中文环境乱码问题
```

**适用场景**：跨平台文本处理，无需 `StandardCharsets.UTF_8`

---

## 七、Java 21 新特性（LTS）

> 当前新项目推荐基线版本。

### 7.1 虚拟线程（Virtual Threads）

```java
// 方式一：Spring Boot 自动配置
// application.yml
// spring.threads.virtual.enabled: true

// 方式二：手动创建
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
        .map(url -> executor.submit(() -> httpClient.fetch(url)))
        .toList();
    // 等待全部完成
    for (Future<String> f : futures) {
        results.add(f.get());
    }
}

// 方式三：Thread.startVirtualThread
Thread.startVirtualThread(() -> {
    logService.asyncSave(logEntry);
});
```

**适用场景**：I/O 密集型任务（HTTP 调用、数据库查询、文件读写）。每个并发任务一个线程，无需管理线程池大小。

**注意事项**：
- 避免在虚拟线程中使用 `synchronized`（Java 24 已修复钉住问题，之前版本会钉住载体线程）
- 避免频繁 `ThreadLocal`（虚拟线程数量多时内存开销大）
- CPU 密集型任务不适合用虚拟线程

### 7.2 Record Patterns（记录模式）

```java
// 嵌套解构
if (obj instanceof Point(int x, int y)) {
    System.out.println("x=" + x + ", y=" + y);
}

// switch 中使用
String describe(Shape shape) {
    return switch (shape) {
        case Circle(var center, var radius) -> "圆，半径=" + radius;
        case Rectangle(var tl, var br)      -> "矩形";
    };
}
```

**适用场景**：配合 Record 使用，简化数据提取

### 7.3 Pattern Matching for switch（标准版）

```java
// 结合类型检查 + 条件判断
String format(Object obj) {
    return switch (obj) {
        case Integer i when i > 0  -> "正整数: " + i;
        case Integer i             -> "非正整数: " + i;
        case String s              -> "字符串: " + s;
        case int[] arr             -> "整数数组，长度=" + arr.length;
        case null                  -> "null";
        default                    -> "其他";
    };
}
```

**适用场景**：替代 if-else 类型检查链，复杂条件分支

### 7.4 Sequenced Collections

```java
// 统一的有顺序集合接口
SequencedCollection<String> seq = new ArrayList<>(List.of("a", "b", "c"));

seq.getFirst();   // "a"
seq.getLast();    // "c"
seq.reversed();   // 反转视图

// LinkedHashSet 也实现了 SequencedSet
SequencedSet<String> set = new LinkedHashSet<>(List.of("x", "y", "z"));
set.getFirst();  // "x"
set.getLast();   // "z"
```

**适用场景**：需要获取首尾元素、反转的有序集合操作

---

## 八、Java 22 新特性

### 8.1 未命名变量和模式

```java
// 不需要的变量用 _ 替代
try {
    int result = riskyOperation();
} catch (Exception _) {  // 不使用异常对象
    log.error("操作失败");
}

// Lambda 中忽略参数
biConsumer.forEach((_, value) -> process(value));

// 模式匹配中忽略部分字段
if (obj instanceof Point(int x, _)) {
    System.out.println("x = " + x);
}
```

**适用场景**：不需要使用的变量、异常捕获忽略、Lambda 忽略参数

### 8.2 外部函数和内存 API（FFM API）

```java
// 替代 JNI，安全访问本地内存
try (Arena arena = Arena.ofConfined()) {
    MemorySegment segment = arena.allocate(64);
    // 写入字符串
    segment.setString(0, "Hello, FFM!");
    // 读取
    String value = segment.getString(0);
}
```

**适用场景**：需要调用本地库（C/C++）、高性能内存操作

---

## 九、Java 23~24 新特性

### 9.1 Markdown 文档注释（Java 23 标准化）

```java
/**
 * # 用户服务
 *
 * 提供用户相关的业务操作。
 *
 * ## 使用示例
 * ```java
 * UserService service = new UserService(repository);
 * UserVO user = service.findById(1L);
 * ```
 *
 * @param id 用户ID
 * @return 用户信息
 * @throws BusinessException 用户不存在时抛出
 */
public UserVO findById(Long id) { ... }
```

**适用场景**：所有 Javadoc，替代传统 HTML 标签

### 9.2 Class-File API（Java 24 标准化）

```java
// 解析和生成 class 文件的标准 API
// 主要用于框架开发者（Spring、Hibernate 等）
// 替代 ASM、Byte Buddy 等第三方库
```

**适用场景**：框架/工具开发，一般业务开发不直接使用

### 9.3 Stream Gatherers（Java 24 标准化）

```java
// 自定义中间操作
List<List<Integer>> batches = numbers.stream()
    .gather(Gatherers.windowFixed(3))
    .toList();
// [[1,2,3], [4,5,6], [7,8,9]]

// 去重（保留首次出现的）
stream.gather(Gatherers.distinctBy(User::getDepartment));

// 折叠
stream.gather(Gatherers.fold(() -> "", (acc, elem) -> acc + elem));
```

**适用场景**：复杂的流中间操作（窗口、分组、去重、折叠）

### 9.4 虚拟线程同步不钉住（Java 24）

```java
// Java 24 修复：虚拟线程中使用 synchronized 不再钉住载体线程
// 之前版本需要在虚拟线程中使用 ReentrantLock 替代 synchronized
// Java 24+ 可以安全地在虚拟线程中使用 synchronized
```

---

## 十、Java 25 新特性（LTS）

> 最新 LTS 版本。

### 10.1 Scoped Values（标准化）

```java
// 替代 ThreadLocal，更适合虚拟线程
private static final ScopedValue<UserContext> CURRENT_USER = ScopedValue.newInstance();

// 设置作用域值
ScopedValue.where(CURRENT_USER, new UserContext(userId, role))
    .run(() -> {
        // 在此作用域内可访问
        doBusiness();
    });

// 读取
UserContext ctx = CURRENT_USER.get();
```

**适用场景**：替代 ThreadLocal 传递上下文（用户信息、事务、请求上下文），尤其适合虚拟线程场景

### 10.2 灵活构造函数体（标准化）

```java
// super() 之前可以执行逻辑
public class ValidatedUser extends BaseEntity {
    public ValidatedUser(String name, String email) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        super(name); // 验证后再调用 super
        this.email = email;
    }
}
```

**适用场景**：子类构造器需要先验证再初始化父类

### 10.3 简化入口方法（标准化）

```java
// Java 25: 最简程序
void main() {
    println("Hello, World!");
}
```

**适用场景**：教学、脚本、快速原型

### 10.4 紧凑对象头（Compact Object Headers）

```java
// 减少 Java 对象内存占用
// 普通对象头：16 bytes → 8~12 bytes
// 数十亿对象的系统中可节省大量内存
// 启用: -XX:+UseCompactObjectHeaders
```

**适用场景**：高密度对象系统、内存敏感型应用

---

## 十一、Spring Boot 3.x 新特性

### 11.1 声明式 HTTP 客户端

```java
// 定义接口即可，Spring 自动生成实现
@HttpExchange("/api/users")
public interface UserClient {

    @GetExchange("/{id}")
    UserVO getUser(@PathVariable("id") Long id);

    @PostExchange
    UserVO createUser(@RequestBody CreateUserRequest request);

    @PutExchange("/{id}")
    UserVO updateUser(@PathVariable("id") Long id, @RequestBody UpdateUserRequest request);

    @DeleteExchange("/{id}")
    void deleteUser(@PathVariable("id") Long id);
}

// 注册
@Configuration
public class ClientConfig {
    @Bean
    UserClient userClient(RestClient restClient) {
        return HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build()
                .createClient(UserClient.class);
    }
}
```

**适用场景**：微服务间 HTTP 调用、调用第三方 REST API

### 11.2 ProblemDetail 标准错误响应

```java
// RFC 7807 标准错误格式
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusiness(BusinessException e) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, e.getMessage());
        detail.setTitle("业务异常");
        detail.setProperty("errorCode", e.getCode());
        detail.setProperty("timestamp", Instant.now());
        return detail;
    }
}
```

**适用场景**：REST API 统一错误响应格式

### 11.3 GraalVM 原生镜像

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
</plugin>
```

```bash
# 编译为本地可执行文件
./mvnw -Pnative native:compile
# 启动时间从秒级降到毫秒级
```

**适用场景**：Serverless、CLI 工具、需要极速启动的微服务

### 11.4 Micrometer Observation API

```java
// 统一的指标 + 链路追踪
@Observed(name = "user.service", contextualName = "findUser")
public UserVO findById(Long id) {
    return userRepository.findById(id)
        .map(this::toVO)
        .orElseThrow(() -> new BusinessException(404, "用户不存在"));
}
```

**适用场景**：全链路可观测性（metrics + tracing），替代 Spring Cloud Sleuth

### 11.5 虚拟线程支持

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

```java
// Tomcat 每个请求一个虚拟线程，无需配置线程池
// @Async 默认使用虚拟线程
// 异步请求处理使用虚拟线程
```

**适用场景**：I/O 密集型应用（数据库、HTTP 调用、文件操作），高并发低延迟

---

## 十二、Spring Boot 4.x 新特性

### 12.1 HTTP Service Clients（增强版声明式客户端）

```java
// Spring Boot 4.x 增强的声明式 HTTP 客户端
// 类似 OpenFeign 但原生支持，无需额外依赖
@HttpClient(baseUrl = "https://api.example.com")
public interface UserApi {

    @Get("/users/{id}")
    UserVO getUser(@Path("id") Long id);

    @Post("/users")
    UserVO createUser(@Body CreateUserRequest request);

    @Get("/users?page={page}&size={size}")
    PageResult<UserVO> listUsers(@Query("page") int page, @Query("size") int size);
}
```

**适用场景**：微服务间调用、第三方 API 集成

### 12.2 API Versioning（API 版本管理）

```java
// 自动配置的 API 版本控制
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping(value = "/{id}", headers = "X-API-Version=1")
    public UserV1 getUserV1(@PathVariable Long id) { ... }

    @GetMapping(value = "/{id}", headers = "X-API-Version=2")
    public UserV2 getUserV2(@PathVariable Long id) { ... }
}
```

**适用场景**：REST API 多版本共存，平滑升级

### 12.3 OpenTelemetry Starter

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-opentelemetry</artifactId>
</dependency>
```

**适用场景**：零配置接入 OpenTelemetry，自动导出 metrics 和 traces

### 12.4 依赖升级要点

| 依赖 | Spring Boot 3.x | Spring Boot 4.x |
|------|-----------------|-----------------|
| Spring Framework | 6.x | 7.0 |
| Hibernate | 6.x | 7.1 |
| Tomcat | 10.x | 11.0 |
| Jackson | 2.x | 3.0 |
| Jakarta Servlet | 6.0 | 6.1 |
| Jakarta Persistence | 3.1 | 3.2 |
| Flyway | 10.x | 11.x |

---

## 十三、版本特性速查表

### 按使用频率分类

#### 日常必用（Java 8+）

| 特性 | 版本 | 示例场景 |
|------|------|----------|
| Lambda | 8 | 集合操作、回调 |
| Stream API | 8 | 集合转换、过滤、聚合 |
| Optional | 8 | 空值安全处理 |
| Date/Time API | 8 | 所有日期时间操作 |
| var | 10 | 局部变量简化 |
| switch 表达式 | 14 | 替代 if-else 链 |
| Records | 16 | DTO/VO/配置对象 |
| Stream.toList() | 16 | 简化收集操作 |
| 文本块 | 15 | SQL、JSON 模板 |

#### 架构设计推荐（Java 17+）

| 特性 | 版本 | 示例场景 |
|------|------|----------|
| Sealed Classes | 17 | 状态机、结果类型、领域事件 |
| instanceof 模式匹配 | 16 | 类型检查 + 自动绑定 |
| Pattern Matching switch | 21 | 复杂类型分支 |

#### 性能优化（Java 21+）

| 特性 | 版本 | 示例场景 |
|------|------|----------|
| 虚拟线程 | 21 | I/O 密集型高并发 |
| Scoped Values | 25 | 替代 ThreadLocal |
| 紧凑对象头 | 25 | 减少内存占用 |
| Stream Gatherers | 24 | 复杂流操作 |

#### 框架集成（Spring Boot）

| 特性 | 版本 | 示例场景 |
|------|------|----------|
| HTTP Interface | 3.x | 声明式 HTTP 客户端 |
| ProblemDetail | 3.x | 标准 REST 错误格式 |
| 虚拟线程支持 | 3.x | 高并发 |
| GraalVM 原生镜像 | 3.x | 极速启动 |
| API Versioning | 4.x | API 多版本管理 |
| OTel Starter | 4.x | 零配置可观测性 |

---

## 十四、最佳实践决策树

### 选择 Java 版本

```
新项目？
├── 是 → Java 21（当前 LTS，生态完善）
│       或 Java 25（最新 LTS，虚拟线程 + Scoped Values）
└── 遗留系统？
    ├── Java 8 → 评估升级到 17（性能 + 语法提升显著）
    ├── Java 11 → 升级到 17（Sealed Classes + Records）
    └── Java 17 → 升级到 21（虚拟线程 + Pattern Matching）
```

### 选择 Spring Boot 版本

```
新项目？
├── 稳定优先 → Spring Boot 3.x（成熟、生态完善）
└── 追求新特性 → Spring Boot 4.x（Spring Framework 7、Jackson 3）
```

### 特性选用原则

| 原则 | 说明 |
|------|------|
| **团队一致性** | 统一使用相同特性集，避免混用新旧风格 |
| **可读性优先** | 如果新特性降低可读性，不用 |
| **Preview 特性慎用** | 预览特性可能变更，生产环境只用标准化的 |
| **渐进式采用** | 先在非核心模块试点，验证后再推广 |
| **性能先行验证** | 虚拟线程等性能特性，先 benchmark 再上线 |

---

## 十五、迁移注意事项

### Java 版本迁移

| 迁移路径 | 主要变更 | 风险点 |
|----------|----------|--------|
| 8 → 11 | 模块系统、HTTP Client | 反射访问内部 API 可能报错 |
| 11 → 17 | Sealed Classes、强封装 | `--add-opens` 可能需要调整 |
| 17 → 21 | 虚拟线程、Pattern Matching | 第三方库兼容性检查 |
| 21 → 25 | Scoped Values、紧凑对象头 | ThreadLocal 迁移成本 |

### Spring Boot 版本迁移

| 迁移路径 | 主要变更 | 风险点 |
|----------|----------|--------|
| 2.x → 3.x | javax → jakarta、Security DSL 变更 | 包名替换、配置属性变更 |
| 3.x → 4.x | Jackson 2→3、Spring Framework 7 | JSON 序列化行为差异 |

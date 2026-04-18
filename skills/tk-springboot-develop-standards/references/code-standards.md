# 代码编写规范详解

## 一、方法设计原则

### 1.1 方法长度

- 单个方法不超过 50 行
- 超过则考虑拆分
- 优先按功能步骤拆分，其次按职责拆分

### 1.2 参数数量

- 方法参数不超过 5 个
- 超过则使用参数对象封装

### 1.3 返回值设计

- 统一返回 Result/Response 对象
- 避免返回 null，优先返回空集合
- 集合类型声明使用接口：List、Map、Set

---

## 二、控制语句规范

### 2.1 if-else 规范

```java
// ✅ 正确：条件过于复杂时提取方法
if (isValidUser(user) && hasPermission(user, resource)) {
    // 处理
}

// ✅ 正确：提取后
if (!canAccess(user, resource)) {
    return;
}

// ❌ 错误：嵌套过深
if (condition1) {
    if (condition2) {
        if (condition3) {
            // 处理
        }
    }
}
```

### 2.2 switch 规范

```java
// ✅ 正确：每个 case 都要有 break
switch (status) {
    case 0:
        doSomething();
        break;
    case 1:
        doOther();
        break;
    default:
        throw new IllegalArgumentException("未知状态");
}
```

---

## 三、集合处理规范

### 3.1 空值判断

```java
// ✅ 正确：使用工具类判断
if (CollectionUtils.isEmpty(userList)) {
    return;
}

// ❌ 错误：容易出错
if (userList == null || userList.size() == 0) {
    return;
}
```

### 3.2 集合遍历

```java
// ✅ 正确：使用增强 for 循环或迭代器
for (User user : userList) {
    // 处理
}

// ✅ 正确：需要操作索引时
for (int i = 0; i < userList.size(); i++) {
    // 处理
}

// ❌ 错误：在循环中修改集合
for (User user : userList) {
    if (user.isDeleted()) {
        userList.remove(user); // 不要这样做
    }
}
```

---

## 四、String 处理规范

### 4.1 字符串拼接

```java
// ✅ 正确：使用 StringBuilder
StringBuilder sb = new StringBuilder();
sb.append("SELECT * FROM user WHERE ");
sb.append("username = '").append(username).append("'");

// ✅ 正确：简单场景可用 +
String result = "Hello, " + name;

// ❌ 错误：循环中拼接
String sql = "";
for (User user : userList) {
    sql += "INSERT INTO..."; // 禁止
}
```

### 4.2 字符串判空

```java
// ✅ 正确：使用 StringUtils
if (StringUtils.isBlank(str)) {
    return;
}

// ❌ 错误
if (str == null || str.trim().equals("")) {
    return;
}
```

---

## 五、对象转换规范

### 5.1 DTO/VO/Entity 转换

```java
// ✅ 正确：使用 MapStruct
@Mapper(componentModel = "spring")
public interface UserConvert {
    UserDTO toDTO(UserEntity entity);
    UserEntity toEntity(UserDTO dto);
    List<UserDTO> toDTOList(List<UserEntity> entities);
}

// ✅ 正确：使用 BeanUtils
UserDTO dto = new UserDTO();
BeanUtils.copyProperties(entity, dto);

// ❌ 错误：手动一个个赋值
dto.setId(entity.getId());
dto.setName(entity.getName());
// ... 繁琐易错
```

### 5.2 转换时机

- Controller 层：接收 DTO，转换为 Entity 传给 Service
- Service 层：Entity 与 DTO 互转
- 避免在循环中进行对象转换

---

## 六、注解使用规范

### 6.1 常用注解

| 注解 | 使用位置 | 说明 |
|------|----------|------|
| @Autowired | 构造方法 | 推荐在构造方法上使用 |
| @Service | 类 | 标注业务层 |
| @Repository | 类 | 标注数据访问层 |
| @Controller/@RestController | 类 | 标注控制层 |
| @Valid/@Validated | 参数 | 参数校验 |
| @Transactional | 方法/类 | 事务管理 |

### 6.2 注解使用注意

```java
// ✅ 正确：构造方法注入
@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// ❌ 错误：字段注入
@Autowired
private UserRepository userRepository;
```

---

## 七、泛型使用规范

### 7.1 泛型通配符

```java
// ✅ 正确：消费数据使用 ? extends
void consume(List<? extends User> users) {
    for (User user : users) {
        // 只读
    }
}

// ✅ 正确：生产数据使用 ? super
void produce(List<? super UserDTO> list) {
    list.add(new UserDTO());
}

// ❌ 错误：同时读写
void wrong(List<?> list) {
    list.add(new Object()); // 编译错误
}
```

### 7.2 泛型约束

```java
// ✅ 正确：有界泛型
<T extends BaseEntity> T save(T entity) {
    // T 必须是 BaseEntity 子类
}
```

---

## 八、现代化 Java 特性

### 8.1 Records 作为 DTO/VO

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
@Service
public class UserService {
    public UserVO createUser(CreateUserRequest request) {
        // 直接使用 record
        UserEntity entity = toEntity(request);
        return toVO(userRepository.save(entity));
    }
}
```

### 8.2 Pattern Matching for switch 增强

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

### 8.3 构造方法绑定（Constructor Binding）

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
```

### 8.4 Jakarta EE 迁移检查清单

| 旧 API | 新 API | 检查点 |
|--------|--------|--------|
| javax.servlet.* | jakarta.servlet.* | 全面替换 import |
| javax.persistence.* | jakarta.persistence.* | Entity, Repository |
| javax.validation.* | jakarta.validation.* | Constraint 注解 |
| javax.transaction.* | jakarta.transaction.* | @Transactional |
| javax.annotation.* | jakarta.annotation.* | @PostConstruct 等 |

```bash
# 批量替换脚本
find . -name "*.java" -exec sed -i 's/javax\./jakarta./g' {} \;
```

---

## 九、Stream API 规范

### 9.1 Stream 基本使用

```java
// ✅ 正确：使用 Stream 进行集合转换
List<UserVO> userVOList = userEntityList.stream()
    .map(this::toVO)
    .collect(Collectors.toList());

// ✅ 正确：过滤 + 映射
List<String> activeUsernames = userEntityList.stream()
    .filter(u -> u.getStatus() == 1)
    .map(UserEntity::getUsername)
    .collect(Collectors.toList());

// ✅ 正确：分组
Map<Integer, List<UserEntity>> groupByStatus = userEntityList.stream()
    .collect(Collectors.groupingBy(UserEntity::getStatus));

// ✅ 正确：查找
Optional<UserEntity> admin = userEntityList.stream()
    .filter(u -> "admin".equals(u.getUsername()))
    .findFirst();

// ❌ 错误：在 Stream 中修改源数据
userList.stream()
    .forEach(u -> u.setStatus(0)); // 禁止：副作用
```

### 9.2 Stream 性能注意

```java
// ✅ 正确：简单操作用 for 循环（性能更好）
long sum = 0;
for (int i = 0; i < list.size(); i++) {
    sum += list.get(i).getAmount();
}

// ✅ 正确：复杂操作用 Stream（可读性更好）
List<OrderVO> result = orders.stream()
    .filter(o -> o.getStatus() == OrderStatus.PAID)
    .sorted(Comparator.comparing(Order::getCreateTime).reversed())
    .limit(10)
    .map(this::toVO)
    .collect(Collectors.toList());

// ❌ 错误：嵌套 Stream
list1.stream()
    .flatMap(a -> list2.stream()
        .filter(b -> b.getId().equals(a.getId())))
    // 可读性差，应提取方法
```

---

## 十、Optional 使用规范

### 10.1 基本用法

```java
// ✅ 正确：方法返回值使用 Optional
public Optional<UserEntity> findById(Long id) {
    return Optional.ofNullable(userRepository.selectById(id));
}

// ✅ 正确：链式调用
String email = findById(1L)
    .map(UserEntity::getEmail)
    .orElse("default@example.com");

// ✅ 正确：抛出自定义异常
UserEntity user = findById(id)
    .orElseThrow(() -> new BusinessException(404, "用户不存在"));

// ❌ 错误：直接调用 get()
Optional<UserEntity> user = findById(1L);
user.get(); // 危险：可能抛 NoSuchElementException

// ❌ 错误：用作字段或参数
public class UserService {
    private Optional<UserRepository> repo; // 禁止
    public void save(Optional<UserDTO> dto) { } // 禁止
}
```

### 10.2 Optional 最佳实践

```java
// ✅ 正确：存在时执行操作
findById(id).ifPresent(user -> {
    log.info("找到用户: {}", user.getUsername());
});

// ✅ 正确：存在和不存在分别处理
findById(id).ifPresentOrElse(
    user -> updateCache(user),
    () -> log.warn("用户不存在: id={}", id)
);

// ✅ 正确：过滤
findById(id)
    .filter(u -> u.getStatus() == 1)
    .ifPresent(u -> process(u));

// ✅ 正确：转换为集合（避免空集合判断）
List<UserEntity> users = optionalUser
    .map(Collections::singletonList)
    .orElseGet(Collections::emptyList);
```

---

## 十一、并发编程规范

### 11.1 线程安全集合

```java
// ✅ 正确：使用并发安全集合
ConcurrentHashMap<String, UserVO> cache = new ConcurrentHashMap<>();
CopyOnWriteArrayList<String> eventList = new CopyOnWriteArrayList<>();

// ❌ 错误：Collections.synchronizedXxx 性能差
Map<String, UserVO> cache = Collections.synchronizedMap(new HashMap<>());
```

### 11.2 线程池规范

```java
// ✅ 正确：自定义线程池（有界队列 + 拒绝策略）
@Bean
public ExecutorService businessExecutor() {
    int coreSize = Runtime.getRuntime().availableProcessors();
    return new ThreadPoolExecutor(
        coreSize,                     // 核心线程数
        coreSize * 2,                 // 最大线程数
        60L, TimeUnit.SECONDS,        // 空闲线程存活时间
        new LinkedBlockingQueue<>(1000), // 有界队列
        new ThreadFactory() {
            private final AtomicInteger counter = new AtomicInteger(0);
            @Override
            public Thread newThread(Runnable r) {
                return new Thread(r, "biz-" + counter.incrementAndGet());
            }
        },
        new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略
    );
}

// ❌ 错误：使用 Executors 快捷方法（无界队列，可能导致 OOM）
ExecutorService pool = Executors.newFixedThreadPool(10);
ExecutorService pool = Executors.newCachedThreadPool();
```

### 11.3 CompletableFuture 异步编程

```java
// ✅ 正确：异步编排
public CompletableFuture<OrderVO> createOrderAsync(OrderDTO dto) {
    return CompletableFuture
        .supplyAsync(() -> {
            // 异步查询商品
            return productService.getById(dto.getProductId());
        }, businessExecutor)
        .thenCombine(
            CompletableFuture.supplyAsync(() ->
                // 异步查询用户
                userService.getById(dto.getUserId()), businessExecutor),
            (product, user) -> {
                // 合并结果，创建订单
                return buildOrder(product, user, dto);
            }
        )
        .thenApplyAsync(order -> {
            // 异步保存
            return orderRepository.save(order);
        }, businessExecutor)
        .exceptionally(ex -> {
            log.error("创建订单失败", ex);
            throw new BusinessException(500, "创建订单失败");
        });
}

// ✅ 正确：等待多个异步任务完成
CompletableFuture<Void> allTasks = CompletableFuture.allOf(
    fetchTask1(),
    fetchTask2(),
    fetchTask3()
);
allTasks.join(); // 等待全部完成
```

### 11.4 虚拟线程

```java
// ✅ 虚拟线程：适合 I/O 密集型任务
// application.yml
// spring.threads.virtual.enabled: true

// 虚拟线程执行器
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
        .map(url -> executor.submit(() -> httpClient.get(url)))
        .toList();

    for (Future<String> future : futures) {
        String result = future.get();
        // 处理结果
    }
}
// 虚拟线程不需要手动管理线程池大小
```

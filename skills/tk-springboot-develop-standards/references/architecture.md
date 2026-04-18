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

---

## 五、数据库迁移规范（Flyway/Liquibase）

### 5.1 Flyway 迁移管理最佳实践

```sql
-- 版本化迁移文件命名规范
-- V{version}__{description}.sql
-- 例如：V1.0.0__create_user_table.sql

-- 迁移脚本示例
CREATE TABLE IF NOT EXISTS t_user (
    id          BIGINT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL,
    email       VARCHAR(100),
    status      TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by   VARCHAR(50),
    update_by   VARCHAR(50),
    deleted     TINYINT DEFAULT 0
);

-- 回调示例（Callbacks）
-- V1.1.0__add_user_index.sql
CREATE INDEX idx_username ON t_user(username);

-- 修复策略（用于修复失败的迁移）
-- 使用 repair 命令修复 checksum 问题
-- flyway.repair.enabled = true
```

### 5.2 Flyway 配置

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    sql-migration-prefix: V
    sql-migration-separator: __
    sql-migration-suffixes: .sql
    encoding: UTF-8
    validate-on-migrate: true
```

### 5.3 Liquibase 对比 Flyway

| 特性 | Flyway | Liquibase |
|------|--------|-----------|
| 格式 | SQL/Java | XML/YAML/JSON/SQL |
| 回滚支持 | 有限（社区版） | 完整 |
| 学习曲线 | 低 | 中 |
| 适用场景 | SQL 为主的项目 | 多格式/复杂变更 |

**选择建议：**
- 简单 SQL 迁移 → Flyway
- 需要完整回滚/复杂变更 → Liquibase

### 5.4 多数据源迁移策略

```java
// 配置多数据源 Flyway
@Configuration
public class FlywayConfig {
    @Bean
    @Primary
    public Flyway primaryFlyway(DataSource primaryDataSource) {
        return Flyway.configure()
            .dataSource(primaryDataSource)
            .locations("classpath:db/migration/primary")
            .baselineOnMigrate(true)
            .getObject();
    }
    
    @Bean
    public Flyway secondaryFlyway(DataSource secondaryDataSource) {
        return Flyway.configure()
            .dataSource(secondaryDataSource)
            .locations("classpath:db/migration/secondary")
            .baselineOnMigrate(true)
            .getObject();
    }
}
```

### 5.5 迁移测试最佳实践

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class UserMigrationTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @BeforeAll
    static void beforeAll() {
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .load();
        flyway.migrate();
    }
    
    @Test
    void testMigration() {
        // 验证表结构
        // 验证初始数据
    }
}
```

---

## 六、容器化部署规范

### 6.1 Docker 最佳实践

**多阶段构建：**

```dockerfile
# 构建阶段
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw package -DskipTests

# 运行阶段
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# 非 root 用户运行
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

ENTRYPOINT ["java", "-jar", "app.jar"]
```

**分层构建优化：**

```dockerfile
# 利用 Maven 缓存
COPY pom.xml .
RUN ./mvnw dependency:go-offline -DskipTests

# 然后复制代码
COPY src ./src
RUN ./mvnw package -DskipTests
```

### 6.2 Docker Compose 开发环境配置

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 6.3 Kubernetes 部署配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 5
            failureThreshold: 3
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
---
apiVersion: v1
kind: Service
metadata:
  name: spring-boot-app
spec:
  selector:
    app: spring-boot-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### 6.4 Helm Chart 基础模板

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    memory: 1Gi
    cpu: 500m
  requests:
    memory: 512Mi
    cpu: 250m

livenessProbe:
  path: /actuator/health/liveness
  initialDelaySeconds: 60

readinessProbe:
  path: /actuator/health/readiness
  initialDelaySeconds: 30
```

---

## 七、可观测性规范

### 7.1 OpenTelemetry 集成

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
</dependency>
```

```yaml
# application.yml
otel:
  exporter:
    otlp:
      endpoint: http://otel-collector:4317
  service:
    name: my-service
  traces:
    sampler: parentbased_traceidratio
    sampler-param: 0.1
```

```java
// 手动埋点
@Service
public class UserService {
    private static final Tracer tracer = Tracer.fromConfig();
    
    public UserVO getUserById(Long id) {
        Span span = tracer.spanBuilder("getUserById")
            .setAttribute("user.id", id)
            .startSpan();
        try {
            // 业务逻辑
            return userRepository.findById(id)
                .map(this::toVO)
                .orElseThrow(() -> new BusinessException(404, "用户不存在"));
        } finally {
            span.end();
        }
    }
}
```

### 7.2 Micrometer 指标最佳实践

```java
@Service
public class OrderService {
    private final MeterRegistry meterRegistry;
    
    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    public OrderVO createOrder(OrderDTO dto) {
        // 计数器
        Counter.builder("order.created")
            .tag("product.type", dto.getProductType())
            .register(meterRegistry)
            .increment();
        
        // 计时器
        Timer timer = Timer.builder("order.create.time")
            .register(meterRegistry);
        
        return timer.record(() -> {
            // 创建订单逻辑
            return createOrderInternal(dto);
        });
    }
    
    // Gauge 用于监控当前值
    public void updateStock(int stock) {
        Gauge.builder("product.stock", () -> stock)
            .tag("product.id", productId)
            .register(meterRegistry);
    }
}
```

### 7.3 结构化日志（JSON 格式）

```xml
<!-- pom.xml -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
</dependency>
```

```xml
<!-- logback-spring.xml -->
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <includeMdcKeyName>traceId</includeMdcKeyName>
        <includeMdcKeyName>userId</includeMdcKeyName>
        <customFields>{"service":"${SERVICE_NAME:-unknown}"}</customFields>
    </encoder>
</appender>

<springProfile name="prod">
    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</springProfile>
```

### 7.4 分布式追踪升级方案（Spring Cloud Sleuth → Micrometer）

Spring Boot 中 Sleuth 已整合到 Micrometer Tracing：

```yaml
# 旧版 Sleuth 配置（Spring Boot 2.x）
spring:
  sleuth:
    sampler:
      probability: 0.1

# Micrometer Tracing 配置
management:
  tracing:
    sampling:
      probability: 0.1
```

---

## 八、安全加固规范

### 8.1 Spring Security 6.x 新特性

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // API 项目禁用 CSRF
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        
        return http.build();
    }
}
```

### 8.2 OAuth2 资源服务器最佳实践

```java
@Configuration
@EnableWebSecurity
public class OAuth2ResourceServerConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );
        return http.build();
    }
    
    @Bean
    public JwtDecoder jwtDecoder() {
        return JwtDecoders.fromIssuerLocation(issuerUri);
    }
    
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = 
            new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");
        
        JwtAuthenticationConverter jwtAuthenticationConverter = 
            new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
            grantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }
}
```

### 8.3 JWT 刷新策略

```java
@Service
public class TokenService {
    private final RedisTemplate<String, String> redisTemplate;
    
    public String refreshToken(String oldToken) {
        // 验证旧 token
        Claims claims = jwtUtils.parseToken(oldToken);
        String userId = claims.getSubject();
        
        // 检查是否在刷新窗口内
        String refreshKey = "refresh:" + userId;
        if (Boolean.FALSE.equals(redisTemplate.hasKey(refreshKey))) {
            throw new BusinessException(401, "Token 已过期，请重新登录");
        }
        
        // 生成新 token
        return jwtUtils.generateToken(userId);
    }
}
```

### 8.4 CSRF/CORS 配置现代化

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOriginPatterns("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

## 九、性能优化规范

### 9.1 虚拟线程下的线程池配置

```java
// 虚拟线程配置 - 适用于 I/O 密集型服务
@Configuration
public class VirtualThreadPoolConfig {
    
    @Bean
    public AsyncTaskExecutor virtualThreadTaskExecutor() {
        return new SimpleAsyncTaskExecutor("virtual-") {
            @Override
            public void execute(Runnable task) {
                Thread.startVirtualThread(task);
            }
        };
    }
}

// WebClient 配置虚拟线程
@Bean
public WebClient webClient() {
    return WebClient.builder()
        .clientConnector(new HttpHandlerConnector(
            HttpHandler.create(),
            VirtualThreadPreserver.builder()
                .executor(Executors.newVirtualThreadPerTaskExecutor())
                .build()
        ))
        .build();
}
```

### 9.2 连接池优化（HikariCP）

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: user
    password: password
    driver-class-name: org.postgresql.Driver
    hikari:
      # 连接池大小：CPU 核心数 * 2 (I/O 密集型) 或 CPU 核心数 + 1 (CPU 密集型)
      maximum-pool-size: 20
      minimum-idle: 5
      # 连接超时
      connection-timeout: 30000
      # 空闲超时
      idle-timeout: 600000
      # 最大生命周期
      max-lifetime: 1800000
      # 连接测试
      connection-test-query: SELECT 1
      # 缓存准备语句
      cache-prep-stmts: true
      prep-stmt-cache-size: 250
      prep-stmt-cache-sql-limit: 2048
```

### 9.3 缓存最佳实践

**Redis 缓存配置：**

```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();
        
        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .withCacheConfiguration("users",
                config.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("products",
                config.entryTtl(Duration.ofHours(1)))
            .build();
    }
}
```

**Caffeine 本地缓存：**

```java
@Configuration
public class CaffeineConfig {
    
    @Bean
    public Cache<String, UserVO> userCache() {
        return Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats()
            .build();
    }
}
```

---

## 十、Kotlin 协程集成

### 10.1 Kotlin 协程依赖配置

```xml
<dependency>
    <groupId>org.jetbrains.kotlin</groupId>
    <artifactId>kotlin-stdlib</artifactId>
</dependency>
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-core</artifactId>
</dependency>
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-reactor</artifactId>
</dependency>
```

### 10.2 协程 Service 示例

```kotlin
@Service
class UserService(
    private val userRepository: UserRepository
) {
    suspend fun getUserById(id: Long): UserVO {
        return userRepository.findById(id)
            ?.toVO()
            ?: throw BusinessException(404, "用户不存在")
    }
    
    suspend fun listUsers(): List<UserVO> {
        return userRepository.findAll()
            .map { it.toVO() }
    }
    
    @Transactional
    suspend fun createUser(request: CreateUserRequest): UserVO {
        val entity = UserEntity(
            username = request.username,
            email = request.email
        )
        return userRepository.save(entity).toVO()
    }
}
```

### 10.3 协程 Controller

```kotlin
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService
) {
    @GetMapping("/{id}")
    suspend fun getUser(@PathVariable id: Long): Result<UserVO> {
        return Result.success(userService.getUserById(id))
    }
    
    @GetMapping
    suspend fun listUsers(): Result<List<UserVO>> {
        return Result.success(userService.listUsers())
    }
    
    @PostMapping
    suspend fun createUser(
        @RequestBody @Valid request: CreateUserRequest
    ): Result<UserVO> {
        return Result.success(userService.createUser(request))
    }
}
```

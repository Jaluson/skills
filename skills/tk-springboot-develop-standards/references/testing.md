# 测试规范详解

## 一、单元测试规范

### 1.1 单元测试原则

| 原则 | 说明 |
|------|------|
| AAA 模式 | Arrange-Given（准备）、Act（执行）、Assert（断言） |
| 独立性 | 测试之间无依赖，可独立运行 |
| 可重复 | 每次运行结果一致 |
| 快速执行 | 单个测试不超过 200ms |

### 1.2 测试数据准备

```java
@Test
void saveUser_Success() {
    // Arrange - 准备测试数据
    UserDTO userDTO = UserDTO.builder()
        .username("testuser")
        .email("test@example.com")
        .build();

    UserEntity savedEntity = UserEntity.builder()
        .id(1L)
        .username("testuser")
        .email("test@example.com")
        .build();

    when(userRepository.save(any(UserEntity.class))).thenReturn(savedEntity);

    // Act - 执行被测方法
    UserVO result = userService.saveUser(userDTO);

    // Assert - 验证结果
    assertNotNull(result);
    assertEquals(1L, result.getId());
    assertEquals("testuser", result.getUsername());
}
```

---

## 二、Mock 使用规范

### 2.1 Mockito 常用方法

```java
// 模拟方法返回值
when(userRepository.findById(1L)).thenReturn(Optional.of(user));

// 模拟 void 方法
doNothing().when(mailService).sendWelcomeEmail(anyString());

// 模拟异常
when(userRepository.findById(1L)).thenThrow(new BusinessException(404, "用户不存在"));

// 验证调用次数
verify(userRepository, times(1)).save(any());
verify(userRepository, never()).deleteById(any());
```

### 2.2 避免过度 Mock

```java
// ✅ 正确：集成测试使用真实对象
@SpringBootTest
class OrderServiceIntegrationTest {
    @Autowired
    private OrderService orderService;
    @Autowired
    private UserRepository userRepository; // 真实对象

    @Test
    void createOrder_Success() {
        // 使用真实数据库
    }
}

// ✅ 正确：单元测试按需 Mock
@UnitTest
class UserServiceTest {
    @Mock
    private UserRepository userRepository; // Mock
}
```

---

## 三、参数化测试

### 3.1 JUnit 5 参数化测试

```java
@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4, 5})
void testFactorial(int n) {
    assertDoesNotThrow(() -> calculator.factorial(n));
}

@ParameterizedTest
@CsvSource({
    "1, 1, 2",
    "2, 3, 5",
    "10, 20, 30"
})
void testAdd(int a, int b, int expected) {
    assertEquals(expected, calculator.add(a, b));
}
```

---

## 四、集成测试规范

### 4.1 @SpringBootTest 使用

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createUser_Success() {
        UserDTO userDTO = new UserDTO();
        userDTO.setUsername("test");
        userDTO.setEmail("test@example.com");

        HttpEntity<UserDTO> request = new HttpEntity<>(userDTO);

        ResponseEntity<Result> response = restTemplate.postForEntity(
            "/api/users",
            request,
            Result.class
        );

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(200, response.getBody().getCode());
    }
}
```

### 4.2 数据库事务管理

```java
@SpringBootTest
@Transaction
@TestExecutionListeners({
    TransactionalTestExecutionListener.class
})
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void saveAndFind() {
        UserEntity user = new UserEntity();
        user.setUsername("test");
        userRepository.save(user);

        // 测试结束后自动回滚，不污染数据库
    }
}
```

---

## 五、测试覆盖率

### 5.1 覆盖率指标

| 类型 | 目标 | 说明 |
|------|------|------|
| 行覆盖率 | ≥ 70% | 新增代码必须达标 |
| 分支覆盖率 | ≥ 60% | 条件分支覆盖 |
| 方法覆盖率 | ≥ 80% | 每个公开方法都要测试 |

### 5.2 覆盖率工具

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.70</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
    </configuration>
</plugin>
```

---

## 六、测试最佳实践

### 6.1 测试目录结构

```
src/
├── main/
│   └── java/...
└── test/
    ├── java/
    │   ├── unit/          # 单元测试
    │   └── integration/   # 集成测试
    └── resources/
        └── test/          # 测试资源
```

### 6.2 测试数据

```yaml
# test/resources/test-data.yml
test:
  users:
    - id: 1
      username: "admin"
      email: "admin@example.com"
    - id: 2
      username: "user"
      email: "user@example.com"
```

### 6.3 测试方法命名

```java
@Test
void shouldReturnUserWhenValidIdProvided() { }

@Test
void shouldThrowExceptionWhenUserNotFound() { }

@Test
void shouldUpdateUserSuccessfully() { }
```

---

## 七、JUnit 5 进阶用法

### 7.1 嵌套测试类

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    
    @InjectMocks
    private OrderServiceImpl orderService;

    @Nested
    @DisplayName("创建订单测试")
    class CreateOrderTests {
        
        @Test
        void shouldCreateOrderSuccessfully() {
            // given
            OrderDTO dto = OrderDTO.builder()
                .productId(1L)
                .quantity(2)
                .build();
            
            when(orderRepository.save(any())).thenAnswer(inv -> {
                OrderEntity e = inv.getArgument(0);
                e.setId(1L);
                return e;
            });
            
            // when
            OrderVO result = orderService.createOrder(dto);
            
            // then
            assertNotNull(result);
            assertEquals(1L, result.getId());
        }
        
        @Test
        void shouldThrowExceptionWhenProductNotFound() {
            // given
            when(productService.getProductById(any())).thenReturn(null);
            
            // when & then
            assertThrows(BusinessException.class, 
                () -> orderService.createOrder(new OrderDTO()));
        }
    }
    
    @Nested
    @DisplayName("查询订单测试")
    class QueryOrderTests {
        // ...
    }
}
```

### 7.2 @ParameterizedTest 进阶

```java
@ParameterizedTest
@CsvFileSource(resources = "/test-data/user-validation.csv", numLinesToSkip = 1)
void testUserValidation(String username, String email, boolean expected) {
    UserDTO dto = UserDTO.builder()
        .username(username)
        .email(email)
        .build();
    assertEquals(expected, validator.isValid(dto));
}

@ParameterizedTest
@ArgumentsSource(UserArgumentsProvider.class)
void testWithCustomProvider(String input, int expected) {
    assertEquals(expected, calculator.calculate(input));
}

// 自定义参数源
public class UserArgumentsProvider implements ArgumentsProvider {
    @Override
    public Stream<? extends Arguments> provideArguments(
            ExtensionContext context) {
        return Stream.of(
            Arguments.of("admin", 1),
            Arguments.of("user", 2),
            Arguments.of("guest", 3)
        );
    }
}
```

### 7.3 @DynamicTest 动态测试

```java
class DynamicTests {
    
    @TestFactory
    Stream<DynamicTest> dynamicTests() {
        List<String> testCases = List.of("add", "subtract", "multiply");
        
        return testCases.stream()
            .map(testCase -> DynamicTest.dynamicTest(
                "Test: " + testCase,
                () -> {
                    Calculator calculator = new Calculator();
                    int result = switch (testCase) {
                        case "add" -> calculator.add(1, 2);
                        case "subtract" -> calculator.subtract(5, 3);
                        case "multiply" -> calculator.multiply(3, 4);
                        default -> throw new IllegalArgumentException(testCase);
                    };
                    assertTrue(result >= 0);
                }
            ));
    }
}
```

### 7.4 测试接口默认方法

```java
interface RepositoryTests<T, ID> {
    
    @Mock
    JpaRepository<T, ID> repository();
    
    default void shouldSaveAndFindById() {
        T entity = createEntity();
        when(repository.save(any())).thenReturn(entity);
        when(repository.findById(any())).thenReturn(Optional.of(entity));
        
        T saved = repository.save(entity);
        T found = repository.findById(saved.getId()).orElse(null);
        
        assertNotNull(found);
    }
    
    T createEntity();
}

@ExtendWith(MockitoExtension.class)
class UserRepositoryTest implements RepositoryTests<UserEntity, Long> {
    
    @Override
    public UserEntity createEntity() {
        return UserEntity.builder()
            .username("test")
            .email("test@example.com")
            .build();
    }
}
```

### 7.5 生命周期回调进阶

```java
public class MockitoExtension implements BeforeEachCallback, AfterEachCallback {
    
    @Override
    public void beforeEach(ExtensionContext context) {
        // 每个测试方法前重置 Mock
        Mockito.reset();
    }
    
    @Override
    public void afterEach(ExtensionContext context) {
        // 验证没有未验证的调用
        Mockito.framework().clearInlineMocks();
    }
}
```

---

## 八、Mock 策略进阶

### 8.1 Mockito 进阶配置

```java
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserServiceImpl userService;
    
    @Test
    void shouldHandleComplexScenario() {
        // Lenient stubbing - 允许未 stub 的调用返回默认值
        when(userRepository.count()).thenReturn(10L);
        
        // 连续 stubbing
        when(userRepository.findById(any()))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(user));
        
        // Answer stubbing
        when(userRepository.save(any()))
            .thenAnswer(invocation -> {
                UserEntity e = invocation.getArgument(0);
                e.setId(System.currentTimeMillis());
                return e;
            });
    }
}
```

### 8.2 Mock 切片测试

```java
@WebMvcTest(UserController.class)
class UserControllerSliceTest {
    
    @MockBean
    private UserService userService;
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void shouldGetUser() throws Exception {
        when(userService.getUserById(1L))
            .thenReturn(new UserVO(1L, "test", "test@example.com"));
        
        mockMvc.get("/api/users/1")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.username").value("test"));
    }
}

@DataJpaTest
class UserRepositorySliceTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void shouldFindByUsername() {
        entityManager.persist(UserEntity.builder()
            .username("test")
            .email("test@example.com")
            .build());
        entityManager.flush();
        
        UserEntity found = userRepository.findByUsername("test");
        assertNotNull(found);
    }
}

@JsonTest
class UserVOJsonTest {
    
    @Autowired
    private JacksonTester<UserVO> json;
    
    @Test
    void shouldSerializeUserVO() throws IOException {
        UserVO vo = new UserVO(1L, "test", "test@example.com");
        
        assertThat(json.write(vo))
            .hasJsonPathValue("$.username", "test")
            .extractingJsonPathValue("$.email")
            .isEqualTo("test@example.com");
    }
}
```

### 8.3 BDD 风格测试

```java
@ExtendWith(MockitoExtension.class)
class BDDUserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserServiceImpl userService;
    
    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest("test", "test@example.com");
        UserEntity savedEntity = UserEntity.builder()
            .id(1L)
            .username("test")
            .email("test@example.com")
            .build();
        
        given(userRepository.save(any(UserEntity.class)))
            .willReturn(savedEntity);
        
        // When
        UserVO result = userService.createUser(request);
        
        // Then
        then(userRepository).should(times(1)).save(any(UserEntity.class));
        assertNotNull(result);
        assertEquals("test", result.getUsername());
    }
}
```

### 8.4 Mock 工厂类最佳实践

```java
@Component
public class MockFactory {
    
    public static <T> T createMock(Class<T> clazz) {
        return Mockito.mock(clazz, withSettings()
            .lenient()
            .defaultAnswer(RETURNS_DEFAULTS));
    }
    
    public static <T> T createStrictMock(Class<T> clazz) {
        return Mockito.mock(clazz, withSettings()
            .strictness(Strictness.STRICT_STUBS)
            .defaultAnswer(RETURNS_DEFAULTS));
    }
}

// 使用
@Mock
private UserRepository userRepository;
// 等同于
private UserRepository userRepository = MockFactory.createStrictMock(UserRepository.class);
```

---

## 九、Testcontainers 集成测试

### 9.1 PostgreSQL Testcontainer

```java
@Testcontainers
@SpringBootTest
class UserRepositoryIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void shouldSaveAndFindUser() {
        UserEntity entity = UserEntity.builder()
            .username("test")
            .email("test@example.com")
            .build();
        
        userRepository.save(entity);
        
        Optional<UserEntity> found = userRepository.findById(entity.getId());
        assertTrue(found.isPresent());
        assertEquals("test", found.get().getUsername());
    }
}
```

### 9.2 Redis Testcontainer

```java
@Testcontainers
@SpringBootTest
class CacheIntegrationTest {
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Test
    void shouldCacheUser() {
        String key = "user:1";
        String value = "test-user";
        
        redisTemplate.opsForValue().set(key, value);
        String result = redisTemplate.opsForValue().get(key);
        
        assertEquals(value, result);
    }
}
```

### 9.3 Kafka Testcontainer

```java
@Testcontainers
@SpringBootTest
class KafkaIntegrationTest {
    
    @Container
    static KafkaContainer<?> kafka = new KafkaContainer<>(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
    
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
    
    @Test
    void shouldSendMessage() throws Exception {
        String topic = "test-topic";
        String message = "test-message";
        
        kafkaTemplate.send(topic, message);
        
        // 使用消费者监听验证
        CountDownLatch latch = new CountDownLatch(1);
        kafkaTemplate.receive(topic, 1000)
            .ifPresent(record -> latch.countDown());
        
        assertTrue(latch.await(5, TimeUnit.SECONDS));
    }
}
```

### 9.4 @SpringBootTest 配置优化

```java
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
    }
)
@ActiveProfiles("test")
class OptimizedIntegrationTest {
    
    @LocalServerPort
    private int port;
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldLoadContext() {
        assertTrue(port > 0);
    }
}
```

### 9.5 测试专用配置

```java
// test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
  flyway:
    enabled: false

test:
  mock:
    enabled: true
  data:
    seeding: true
```

```java
// 使用 @ActiveProfiles("test") 激活测试配置
@SpringBootTest
@ActiveProfiles("test")
class TestWithProfile {
    // 测试配置
}
```

---

## 十、测试覆盖率门禁

### 10.1 Jacoco 进阶配置

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.70</minimum>
                    </limit>
                    <limit>
                        <counter>BRANCH</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.60</minimum>
                    </limit>
                    <limit>
                        <counter>METHOD</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.80</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
        <excludes>
            <exclude>**/*Test.class</exclude>
            <exclude>**/*Tests.class</exclude>
            <exclude>**/generated/**/*.class</exclude>
        </excludes>
    </configuration>
</plugin>
```

### 10.2 增量覆盖率分析

```groovy
// build.gradle
jacoco {
    verification {
        rule {
            enabled = true
            element = 'CLASS'
            includes = ['com.company.project.module.**']
            excludes = ['**/*Test', '**/*Test$*']
            
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = new BigDecimal("0.80")
            }
            
            limit {
                counter = 'BRANCH'
                value = 'COVEREDRATIO'
                minimum = new BigDecimal("0.70")
            }
        }
    }
}
```

### 10.3 SonarQube 集成

```bash
# Maven 提交到 SonarQube
./mvnw sonar:sonar \
  -Dsonar.host.url=http://sonarqube:9000 \
  -Dsonar.projectKey=my-project \
  -Dsonar.login=${SONAR_TOKEN}
```

```xml
<!-- pom.xml -->
<properties>
    <sonar.core.codeCoveragePlugin>jacoco</sonar.core.codeCoveragePlugin>
    <sonar.java.coveragePlugin>jacoco</sonar.java.coveragePlugin>
    <sonar.jacoco.rePorts>${project.build.directory}/jacoco.exec</sonar.jacoco.rePorts>
</properties>
```

### 10.4 覆盖率阈值设置

| 指标 | 核心业务模块 | 普通模块 | 新增代码 |
|------|-------------|----------|----------|
| 行覆盖率 | ≥ 80% | ≥ 70% | ≥ 70% |
| 分支覆盖率 | ≥ 70% | ≥ 60% | ≥ 60% |
| 方法覆盖率 | ≥ 85% | ≥ 80% | ≥ 80% |
| 类覆盖率 | ≥ 90% | ≥ 85% | - |

**Jacoco XML 报告配置：**

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <executions>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
            <configuration>
                <dataFile>${project.build.directory}/jacoco.exec</dataFile>
                <outputDirectory>${project.build.directory}/jacoco</outputDirectory>
            </configuration>
        </execution>
        <execution>
            <id>check</id>
            <phase>test</phase>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

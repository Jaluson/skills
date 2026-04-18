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

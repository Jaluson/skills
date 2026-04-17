# Spring Boot 测试规范

## 目录

- [测试分层策略](#测试分层策略)
- [测试文件组织](#测试文件组织)
- [测试命名约定](#测试命名约定)
- [单元测试规范](#单元测试规范)
- [集成测试规范](#集成测试规范)
- [Mock 规范](#mock-规范)
- [测试数据管理](#测试数据管理)
- [常见场景测试模板](#常见场景测试模板)

---

## 测试分层策略

| 测试类型 | 范围 | 占比 | 运行频率 | 速度 |
|----------|------|------|----------|------|
| 单元测试 | 单个方法/类 | 70% | 每次提交 | 快（ms 级） |
| 集成测试 | 多个组件协作 | 20% | 每次提交/合并 | 中（s 级） |
| 端到端测试 | 完整业务流程 | 10% | 发布前 | 慢（s-min 级） |

优先级：**单元测试 > 集成测试 > 端到端测试**

---

## 测试文件组织

```
src/test/java/
└── com/example/project/
    ├── module/
    │   ├── user/
    │   │   ├── service/
    │   │   │   └── UserServiceImplTest.java      ← 单元测试
    │   │   ├── controller/
    │   │   │   └── UserControllerTest.java        ← 单元测试（MockMvc）
    │   │   └── mapper/
    │   │       └── UserMapperTest.java            ← 集成测试
    │   └── ...
    └── integration/
        └── UserFlowIntegrationTest.java           ← 集成测试
```

规则：
- 测试类的包路径与源码包路径一致
- 测试类名 = 源码类名 + `Test`
- 集成测试可统一放在 `integration/` 包下

---

## 测试命名约定

### 测试方法命名

格式：`methodName_scenario_expectedResult`

```java
// 好的命名
@Test
void create_whenUsernameExists_throwException() { }

@Test
void getById_whenUserNotFound_throwNotFoundException() { }

@Test
void page_withValidQuery_returnPagedResult() { }

// 坏的命名
@Test
void test1() { }              // 无意义
@Test
void testCreate() { }         // 不描述场景
@Test
void testCreateUser() { }     // 不描述预期结果
```

### 测试类命名

| 源码类 | 测试类 | 类型 |
|--------|--------|------|
| `UserServiceImpl` | `UserServiceImplTest` | 单元测试 |
| `UserController` | `UserControllerTest` | 单元测试（MockMvc） |
| `UserMapper` | `UserMapperTest` | 集成测试 |

---

## 单元测试规范

### Service 单元测试

```java
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void getById_whenUserExists_returnUserVO() {
        // Given
        User user = new User();
        user.setId(1L);
        user.setUsername("test");
        user.setEmail("test@example.com");
        user.setStatus(1);
        when(userMapper.selectById(1L)).thenReturn(user);

        // When
        UserVO result = userService.getById(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("test");
    }

    @Test
    void getById_whenUserNotFound_throwNotFoundException() {
        // Given
        when(userMapper.selectById(999L)).thenReturn(null);

        // When & Then
        assertThatThrownBy(() -> userService.getById(999L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("用户不存在");
    }

    @Test
    void create_whenUsernameUnique_saveAndReturnId() {
        // Given
        UserCreateDTO dto = new UserCreateDTO();
        dto.setUsername("newuser");
        dto.setEmail("new@example.com");
        dto.setDeptId(1L);

        when(userMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(userMapper.insert(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1234567890L); // 模拟雪花ID
            return 1;
        });

        // When
        Long id = userService.create(dto);

        // Then
        assertThat(id).isEqualTo(1234567890L);
        verify(userMapper).insert(argThat(user ->
                user.getUsername().equals("newuser")
        ));
    }
}
```

### Controller 单元测试（MockMvc）

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void getById_returnUserVO() throws Exception {
        // Given
        UserVO vo = new UserVO();
        vo.setId(1L);
        vo.setUsername("test");
        when(userService.getById(1L)).thenReturn(vo);

        // When & Then
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("test"));
    }

    @Test
    void create_withInvalidInput_return400() throws Exception {
        // Given — 缺少必填字段
        String json = "{}";

        // When & Then
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }
}
```

---

## 集成测试规范

### Mapper 集成测试

```java
@DataJpaTest           // JPA 项目
// 或 @MybatisTest     // MyBatis 项目
class UserMapperTest {

    @Autowired
    private UserMapper userMapper;

    @Test
    void selectByUsername_whenUserExists_returnUser() {
        // Given — 插入测试数据
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setStatus(1);
        userMapper.insert(user);

        // When
        User result = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, "testuser")
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }
}
```

### Service 集成测试

```java
@SpringBootTest
@Transactional  // 每个测试方法执行后自动回滚，不污染数据库
class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserMapper userMapper;

    @Test
    void createAndQuery_fullFlow() {
        // Given
        UserCreateDTO dto = new UserCreateDTO();
        dto.setUsername("integration_test");
        dto.setEmail("integration@test.com");
        dto.setDeptId(1L);

        // When — 创建
        Long id = userService.create(dto);

        // Then — 查询验证
        UserVO result = userService.getById(id);
        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("integration_test");
    }
}
```

---

## Mock 规范

### 何时使用 Mock

| 场景 | 是否 Mock |
|------|-----------|
| 测试 Service 逻辑 | Mock Mapper/外部服务 |
| 测试 Controller 路由 | Mock Service |
| 测试 Mapper SQL | **不 Mock**，用真实数据库（H2/Testcontainers） |
| 测试完整业务流程 | **不 Mock**，用集成测试 |

### Mock 使用规则

```java
// 好：Mock 最小必要依赖
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {
    @Mock
    private OrderMapper orderMapper;       // 只 Mock 直接依赖
    @Mock
    private StockService stockService;     // 外部服务必须 Mock
    @InjectMocks
    private OrderServiceImpl orderService;
}

// 坏：Mock 所有依赖导致测试无意义
@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {
    @Mock private OrderMapper orderMapper;
    @Mock private StockService stockService;
    @Mock private PaymentService paymentService;
    @Mock private NotificationService notificationService;
    @Mock private LogService logService;
    // Mock 太多 → 说明类职责太多，需要拆分
}
```

### Mock 注意事项

```java
// 1. 不要 Mock 正在测试的类
// 坏
@Mock
private UserServiceImpl userService;   // 不应该 Mock 被测试的对象

// 2. 验证交互时只验证关键操作
verify(userMapper).insert(any(User.class));  // 好：验证关键操作
// 不要验证每一个 getter 调用

// 3. 使用 ArgumentCaptor 验证复杂参数
ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
verify(userMapper).insert(captor.capture());
assertThat(captor.getValue().getUsername()).isEqualTo("test");
```

---

## 测试数据管理

### 测试数据构建

```java
// 推荐：使用 Builder 模式或工厂方法构建测试数据
private User buildTestUser() {
    User user = new User();
    user.setId(1L);
    user.setUsername("testuser");
    user.setEmail("test@example.com");
    user.setStatus(UserStatusEnum.NORMAL.getCode());
    user.setCreatedAt(LocalDateTime.now());
    return user;
}

// 或使用 Lombok @Builder（如果 DTO/Entity 支持）
private UserCreateDTO buildCreateDTO() {
    return UserCreateDTO.builder()
            .username("testuser")
            .email("test@example.com")
            .deptId(1L)
            .password("password123")
            .build();
}
```

### 测试数据隔离

```java
// 集成测试中使用 @Transactional 自动回滚
@SpringBootTest
@Transactional
class UserServiceIntegrationTest {
    // 每个方法执行后自动回滚，测试之间互不影响
}

// 或使用 @BeforeEach 清理数据
@BeforeEach
void cleanUp() {
    userMapper.delete(new LambdaQueryWrapper<>());
}
```

---

## 常见场景测试模板

### 必须覆盖的场景

每个 Service 方法至少测试以下场景：

```
create 方法：
├── 正常创建 — 参数合法
├── 唯一性冲突 — 重复数据抛异常
└── 参数校验 — 必填字段为空

getById 方法：
├── 存在 — 返回正确数据
└── 不存在 — 抛 NotFoundException

update 方法：
├── 正常更新 — 数据变更正确
├── 不存在 — 抛 NotFoundException
└── 唯一性冲突 — 冲突字段重复

delete 方法：
├── 正常删除 — 返回成功
└── 不存在 — 抛 NotFoundException

page 方法：
├── 正常分页 — 返回正确分页数据
├── 空结果 — 返回空列表
└── 条件筛选 — 筛选条件生效
```

### 测试模板（Given-When-Then）

```java
@Test
void methodName_scenario_expectedResult() {
    // ==================== Given（准备数据） ====================

    // ==================== When（执行操作） ====================

    // ==================== Then（验证结果） ====================
}
```

> **规则**：每个测试方法必须遵循 Given-When-Then 三段式结构，并用注释清晰分隔。

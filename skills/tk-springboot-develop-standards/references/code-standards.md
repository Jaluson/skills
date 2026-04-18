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

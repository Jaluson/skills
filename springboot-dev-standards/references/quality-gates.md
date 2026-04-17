# Spring Boot 质量门禁与自动修复

## 目录

- [质量门禁体系](#质量门禁体系)
- [P0 门禁：阅读完整性](#p0-门禁阅读完整性)
- [P3 门禁：编码规范性](#p3-门禁编码规范性)
- [P4 门禁：编译与测试](#p4-门禁编译与测试)
- [自动修复决策树](#自动修复决策树)
- [代码优化规则](#代码优化规则)

---

## 质量门禁体系

| 级别 | 含义 | 未通过时行为 |
|------|------|-------------|
| BLOCKER | 必须通过 | 强制停留在当前阶段 |
| CRITICAL | 强烈建议通过 | 除非用户明确允许跳过 |
| WARNING | 建议优化 | 记录但允许推进 |

全局规则：
- 禁止通过 `@SuppressWarnings`、`//noinspection` 等方式绕过门禁
- 修复根本原因，不压制症状
- 每次修复后验证未引入新问题

---

## P0 门禁：阅读完整性

### BLOCKER 级

- [ ] **pom.xml / build.gradle 已读取**：确认依赖版本和 Spring Boot 版本
- [ ] **application.yml 已读取**：确认数据库、中间件等配置
- [ ] **目标文件已完整读取**：所有要修改/关联的文件
- [ ] **调用链已追踪**：至少追踪一层调用关系
- [ ] **项目模式已识别**：分层方式、返回值封装、异常处理模式

### 项目模式识别清单

```
项目模式识别结果：
├── 包组织：按模块 / 按层
├── 数据访问：MyBatis / MyBatis-Plus / JPA / 其他
├── 返回值封装：Result<T> / ApiResponse<T> / 其他
├── 异常处理：全局异常处理器 + 自定义异常 / 其他
├── 参数校验：@Valid + JSR303 / 手动校验
├── 分页方式：PageHelper / MyBatis-Plus Page / Spring Data Page
├── 依赖注入：构造器注入 / @Autowired 字段注入
├── 代码简化：Lombok / MapStruct / 无
└── API 文档：Swagger / SpringDoc / 无
```

---

## P3 门禁：编码规范性

### 逐文件检查

**分层正确性检查：**
- [ ] Controller 无业务逻辑（无 if/for 处理业务数据）
- [ ] Service 无 SQL（无拼接 SQL 的代码）
- [ ] Mapper/DAO 无业务逻辑
- [ ] Entity 无业务方法

**代码质量检查：**
- [ ] 命名符合规范（类名、方法名、变量名、常量名）
- [ ] 方法有 Javadoc（公共方法）
- [ ] 注解使用正确（`@Service`、`@RestController`、`@Mapper`、`@Transactional`）
- [ ] 依赖注入方式与项目一致
- [ ] 返回值统一封装

**禁止项扫描：**
- [ ] 无 `System.out.println`
- [ ] 无空 catch 块
- [ ] 无硬编码值
- [ ] 无 `SELECT *`
- [ ] 无魔法值（用常量或枚举替代）
- [ ] 无金额使用 float/double
- [ ] 无自增主键（`IdType.AUTO` / `GenerationType.IDENTITY`），必须使用雪花ID

**安全检查：**
- [ ] 参数校验已添加（`@Valid` 或 `@Validated` 在 Controller 方法参数上）
- [ ] SQL 无注入风险（使用 `#{}` 而非 `${}`，除非必要且有注释说明）
- [ ] 异常信息不暴露内部实现
- [ ] 分页参数有上限保护

**注解校验检查：**
- [ ] DTO 字段使用注解校验（`@NotBlank`, `@Size`, `@Email`, `@Pattern` 等）
- [ ] Service 中无格式校验代码（非空、长度、邮箱格式等应在 DTO 注解中完成）
- [ ] 唯一性校验优先使用自定义注解（如 `@UniqueUsername`），而非 Service 中手动校验
- [ ] 创建和更新校验规则不同时，使用 `@Validated(Create.class)` / `@Validated(Update.class)` 分组
- [ ] 嵌套对象字段上有 `@Valid` 注解

**数据库性能检查：**
- [ ] 存在性检查使用 `EXISTS` 或 `SELECT 1 ... LIMIT 1`，而非 `SELECT COUNT(*)`
- [ ] 无 `SELECT *`，明确列出所需字段
- [ ] 批量操作使用批量接口（`insertBatch`/`updateBatch`），非循环单条操作
- [ ] 查询条件中的字段有索引覆盖（高频查询场景）

**事务原子性检查：**
- [ ] 所有新增（create）方法有 `@Transactional(rollbackFor = Exception.class)`
- [ ] 所有修改（update）方法有 `@Transactional(rollbackFor = Exception.class)`
- [ ] 所有删除（delete）方法有 `@Transactional(rollbackFor = Exception.class)`
- [ ] 涉及多表写操作的方法有事务保护
- [ ] 事务边界合理，不包含不必要的远程调用和耗时查询

---

## P4 门禁：编译与测试

### 编译验证

```bash
# Maven 项目
mvn compile                          # 编译检查
mvn test-compile                     # 测试编译检查
mvn test                             # 运行测试
mvn package -DskipTests=false        # 完整构建

# Gradle 项目
gradle compileJava                   # 编译检查
gradle compileTestJava               # 测试编译检查
gradle test                          # 运行测试
gradle build                         # 完整构建
```

### 错误分类

**致命错误（阻塞）：**
- 编译错误（找不到符号、类型不匹配）→ 修正代码
- Bean 注入失败 → 检查注解和配置
- SQL 映射错误 → 检查 XML 和接口定义
- 测试失败 → 分析原因并修复

**重要警告（应该修复）：**
- 未使用的导入 → 清理
- 废弃的 API 使用 → 评估是否更新
- 依赖冲突 → 检查版本

### 自动修复循环

```
最多 5 轮：
  1. mvn compile（或 gradle compileJava）
  2. 收集所有编译错误
  3. 如果全部通过 → 运行测试
  4. 按文件分组修复
  5. 验证修复
  6. 回到步骤 1

测试阶段：
  1. mvn test
  2. 如果测试失败 → 分析失败日志
  3. 修复代码或修复测试
  4. 重新运行失败的测试

5 轮后仍有错误 → 报告给用户
```

### 常见编译错误修复

| 错误 | 常见原因 | 修复方法 |
|------|----------|----------|
| 找不到符号 | import 缺失或类名拼写错误 | 添加 import 或修正类名 |
| 不兼容的类型 | 类型转换问题 | 修正类型声明或添加转换 |
| 缺少注解 | 未标注 Spring 注解 | 添加 `@Service`/`@Mapper` 等 |
| Bean 注入失败 | 组件未注册到 Spring 容器 | 添加注解或检查包扫描配置 |
| SQL 映射错误 | XML namespace 与接口不匹配 | 检查 namespace 和方法签名 |
| 依赖找不到 | Maven/Gradle 未下载或版本不对 | 检查依赖坐标和仓库配置 |

### 常见测试错误修复

| 错误 | 常见原因 | 修复方法 |
|------|----------|----------|
| NullPointerException | Mock 不完整或返回 null | 补充 mock 配置 |
| AssertionFailedError | 逻辑变更导致预期不匹配 | 更新断言或修复代码 |
| Spring 上下文加载失败 | 配置问题 | 检查测试配置 |

---

## 自动修复决策树

```
发现编译错误
├── 找不到符号（Cannot find symbol）
│   ├── 类名拼写错误？→ 修正类名
│   ├── import 缺失？→ 添加 import
│   ├── 依赖未引入？→ 检查 pom.xml 添加依赖
│   └── 包路径错误？→ 修正包路径
│
├── 类型不兼容（Incompatible types）
│   ├── 赋值类型错误？→ 修正变量类型
│   ├── 泛型擦除？→ 添加显式类型参数
│   ├── 返回值类型不匹配？→ 修正方法签名
│   └── 自动装箱问题？→ 使用正确的包装类型
│
├── Bean 注入失败
│   ├── 组件未标注注解？→ 添加 @Service/@Component 等
│   ├── 包扫描路径未包含？→ 修正 @ComponentScan 或 @MapperScan
│   ├── 条件注解不满足？→ 检查 @ConditionalOnProperty 等
│   └── 循环依赖？→ 重构依赖关系或用 @Lazy
│
├── MyBatis 错误
│   ├── XML namespace 不匹配？→ 修正 namespace
│   ├── 方法签名不匹配？→ 检查 XML id 与接口方法名
│   ├── 参数映射错误？→ 检查 @Param 注解
│   └── SQL 语法错误？→ 修正 SQL
│
└── 测试错误
    ├── Mock 不完整？→ 补充 when/thenReturn
    ├── 上下文加载失败？→ 检查测试配置类
    └── 断言失败？→ 分析实际值与预期值差异
```

---

## 代码优化规则

在 P4 验证通过后，P5 审查阶段做最终优化。

### 优化 1：简化条件判断

```java
// 优化前
if (user.getStatus() == 1) {
    return true;
} else {
    return false;
}

// 优化后
return user.getStatus() == 1;
```

### 优化 2：使用 Optional 避免 NPE

```java
// 优化前
User user = userMapper.selectById(id);
if (user != null) {
    return UserConverter.toVO(user);
}
return null;

// 优化后（如果用 MyBatis-Plus 或 JPA 返回 Optional）
return Optional.ofNullable(userMapper.selectById(id))
        .map(UserConverter::toVO)
        .orElse(null);
```

### 优化 3：使用 Stream 简化集合操作

```java
// 优化前
List<Long> ids = new ArrayList<>();
for (User user : users) {
    ids.add(user.getId());
}

// 优化后
List<Long> ids = users.stream()
        .map(User::getId)
        .collect(Collectors.toList());
```

### 优化 4：提取重复的查询条件构建

```java
// 优化前：多处重复构建查询条件
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
wrapper.eq(User::getDeleted, 0);
if (username != null) {
    wrapper.like(User::getUsername, username);
}
if (status != null) {
    wrapper.eq(User::getStatus, status);
}

// 优化后：提取为私有方法
private LambdaQueryWrapper<User> buildUserQueryWrapper(String username, Integer status) {
    LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(User::getDeleted, 0)
           .like(StringUtils.isNotBlank(username), User::getUsername, username)
           .eq(status != null, User::getStatus, status);
    return wrapper;
}
```

### 优化原则

- 安全第一：优化不能改变行为
- 可测量：优化后代码更短、更清晰、或性能更好
- 不过度：不为优化而优化
- 与项目风格一致：如果项目没有用 Stream，不要为了"优雅"引入

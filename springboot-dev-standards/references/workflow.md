# Spring Boot 标准化开发流程 — 任务模板

## 目录

- [任务类型识别](#任务类型识别)
- [新增 REST API 流程](#新增-rest-api-流程)
- [新增 CRUD 模块流程](#新增-crud-模块流程)
- [新增数据库表/字段流程](#新增数据库表字段流程)
- [集成中间件流程](#集成中间件流程)
- [修改已有功能流程](#修改已有功能流程)
- [修复 Bug 流程](#修复-bug-流程)
- [批量操作流程](#批量操作流程)
- [定时任务流程](#定时任务流程)
- [文件上传/下载流程](#文件上传下载流程)

---

## 任务类型识别

| 任务类型 | 标志 | P0 重点 |
|----------|------|---------|
| 新增 API | "写个接口" "新增API" | 已有 Controller 模式、返回值封装 |
| CRUD 模块 | "增删改查" "管理xxx" | 现有 CRUD 模块作为模板 |
| 数据库变更 | "加个表" "加个字段" | 现有 Entity、migration 脚本 |
| 中间件集成 | "集成Redis" "加MQ" | 现有中间件配置模式 |
| 修改功能 | "修改xxx" "调整逻辑" | 目标文件完整代码、调用方 |
| Bug 修复 | "修复xxx" "xxx不工作" | 问题代码、错误日志、复现条件 |

---

## 新增 REST API 流程

### P0：阅读清单

```
必读：
├── 目标 Controller 文件（完整阅读）
├── 统一返回值封装类（Result/ApiResponse）
├── 全局异常处理器
├── 相关的 Service 接口
├── 相关的 Entity 和 DTO
└── API 文档配置（如有）

确认：
├── URL 命名风格（/api/xxx 还是 /xxx）
├── HTTP 方法使用规范
├── 参数传递方式（@RequestBody / @RequestParam / @PathVariable）
├── 返回值封装方式
└── 是否有权限控制注解
```

### P2：接口设计

```
设计项：
├── URL：/api/{resource}（RESTful）
├── HTTP 方法：GET（查）/ POST（增）/ PUT（改）/ DELETE（删）
├── 请求参数：
│   ├── 路径参数 @PathVariable
│   ├── 查询参数 @RequestParam
│   └── 请求体 @RequestBody @Valid
├── 返回值：Result<具体类型>
├── 权限：是否需要权限注解
└── Swagger 注解：@Operation / @Tag（如项目使用）
```

### P3：编码顺序

```
1. DTO.java（入参）→ 定义请求参数结构
2. VO.java（出参）→ 定义响应数据结构
3. Mapper/DAO → 添加需要的数据访问方法
4. Mapper XML → 编写 SQL（如需要）
5. Service 接口 → 添加方法签名
6. Service 实现 → 实现业务逻辑
7. Controller → 暴露 API 接口
8. Converter → 添加转换方法（如需要）
```

---

## 新增 CRUD 模块流程

### P0：阅读清单

```
必读：
├── 现有 CRUD 模块的完整代码（选一个最典型的作为参考）
│   ├── Entity
│   ├── DTO（Create + Update + Query）
│   ├── VO
│   ├── Converter
│   ├── Mapper + XML
│   ├── Service + ServiceImpl
│   └── Controller
├── BaseEntity（公共字段基类）
├── PageQuery（分页查询基类，如有）
├── PageResult（分页返回封装，如有）
└── 统一返回值封装类

重点观察：
├── Entity 的字段映射方式
├── 分页查询的实现模式
├── DTO 校验注解的使用
├── Service 的事务注解
├── Controller 的 URL 风格
└── Converter 的转换方式
```

### P2：文件设计清单

```
标准 CRUD 模块文件清单：
module/{module}/
├── entity/
│   └── {Entity}.java            → 数据模型
├── dto/
│   ├── {Entity}CreateDTO.java   → 创建参数
│   ├── {Entity}UpdateDTO.java   → 更新参数
│   └── {Entity}QueryDTO.java    → 查询参数（继承 PageQuery）
├── vo/
│   └── {Entity}VO.java          → 返回视图
├── converter/
│   └── {Entity}Converter.java   → 对象转换
├── mapper/
│   ├── {Entity}Mapper.java      → Mapper 接口
│   └── xml/{Entity}Mapper.xml   → SQL 映射（MyBatis）
├── service/
│   ├── {Entity}Service.java     → Service 接口
│   └── impl/
│       └── {Entity}ServiceImpl.java → Service 实现
└── controller/
    └── {Entity}Controller.java  → API 接口

标准 API 设计：
├── GET    /api/{module}         → 分页列表
├── GET    /api/{module}/{id}    → 详情查询
├── POST   /api/{module}         → 创建
├── PUT    /api/{module}/{id}    → 更新
└── DELETE /api/{module}/{id}    → 删除
```

### P3：编码顺序

```
1. Entity → 数据模型（与数据库表对应）
2. CreateDTO / UpdateDTO / QueryDTO → 入参定义
3. VO → 出参定义
4. {Entity}Mapper.java → Mapper 接口
5. {Entity}Mapper.xml → SQL（复杂查询）
6. {Entity}Converter.java → 对象转换
7. {Entity}Service.java → Service 接口
8. {Entity}ServiceImpl.java → 业务实现
9. {Entity}Controller.java → API 暴露
```

每步完成后做微自检。

---

## 新增数据库表/字段流程

### P0：阅读清单

```
必读：
├── 现有的数据库迁移脚本（Flyway/Liquibase/SQL 文件）
├── 现有 Entity 类的完整代码（参考字段映射方式）
├── BaseEntity（公共字段）
├── application.yml 中的数据库配置
└── 已有的索引命名规范

确认：
├── 表名前缀规范（sys_ / biz_ / t_）
├── 字段类型映射（Java ↔ DB）
├── 公共字段有哪些
├── 是否使用逻辑删除
└── 主键生成策略
```

### P2：表结构设计

```
表名：{prefix}_{module}
字段设计：
├── id BIGINT PRIMARY KEY COMMENT '雪花ID'
├── 业务字段...
├── 公共字段：
│   ├── created_at DATETIME
│   ├── updated_at DATETIME
│   ├── created_by BIGINT
│   ├── updated_by BIGINT
│   └── deleted TINYINT DEFAULT 0
└── 索引设计：
    ├── 唯一索引：业务唯一字段
    └── 普通索引：高频查询字段
```

### P3：编码顺序

```
1. SQL 脚本（建表语句）
2. Entity.java（对应字段映射）
3. Mapper.java（基础 CRUD）
4. 后续根据需要添加 DTO/VO/Service/Controller
```

---

## 集成中间件流程

### P0：阅读清单

```
必读：
├── pom.xml（确认依赖和版本）
├── application.yml（现有中间件配置模式）
├── 现有的配置类（参考配置模式）
├── 现有的中间件使用示例（参考使用方式）
└── 现有的工具类/封装（避免重复）

确认：
├── 配置类风格（@Configuration + @Bean）
├── 连接参数的管理方式（yml / 环境变量）
├── 是否有统一的工具类封装
└── 是否需要考虑多环境配置
```

### 常见中间件集成模板

**Redis 集成：**
```
1. pom.xml 添加 spring-boot-starter-data-redis
2. application.yml 添加 Redis 连接配置
3. RedisConfig.java 配置序列化方式
4. RedisUtils.java / RedisService.java 封装常用操作
5. 在 Service 中使用
```

**RabbitMQ 集成：**
```
1. pom.xml 添加 spring-boot-starter-amqp
2. application.yml 添加 RabbitMQ 配置
3. 定义 Queue/Exchange/Binding
4. 消息生产者 Service
5. 消息消费者 Listener
```

---

## 修改已有功能流程

### P0：重点阅读

```
必读（比新建更严格）：
├── 要修改的文件完整内容
├── 该文件的所有 import 依赖
├── 该文件被哪些文件引用（grep 查找）
├── 相关的测试文件
└── 调用链上下游文件

重点理解：
├── 现有逻辑为什么这样写（不要盲目改）
├── 修改会影响哪些调用方
├── 是否有其他逻辑依赖当前行为
└── 测试覆盖了哪些场景
```

### P3：修改原则

```
1. 先完整理解要修改的代码
2. 确认修改范围（最小改动）
3. 只改必要的行
4. 不重新格式化不相关的代码
5. 不改变不相关的代码风格
6. 修改后验证所有调用方不受影响
```

---

## 修复 Bug 流程

### P0：问题定位

```
收集信息：
├── 错误日志（完整的堆栈信息）
├── 复现条件（什么操作触发的）
├── 预期行为 vs 实际行为
├── 影响范围

阅读重点：
├── 错误堆栈指向的代码文件
├── 相关的调用链
├── 相关的配置
└── 相关的测试用例
```

### 根因分析检查清单

```
├── 空指针？→ 检查数据是否存在、是否判空
├── 类型转换错误？→ 检查数据类型
├── SQL 错误？→ 检查 SQL 语法和字段映射
├── 事务问题？→ 检查事务注解和边界
├── 并发问题？→ 检查共享状态和锁
├── 配置问题？→ 检查环境配置和属性值
├── 参数校验？→ 检查入参是否合法
└── 权限问题？→ 检查认证和授权逻辑
```

### 修复原则

```
1. 修复根因，不是症状
2. 最小修改
3. 验证修复不引入新问题
4. 考虑是否有类似问题需要一并修复
5. 评估是否需要添加测试防止回归
```

---

## 批量操作流程

### P0：阅读清单

```
必读：
├── 目标 Entity 和 Mapper
├── 现有的批量操作代码（如有）
├── 数据库连接池配置（确认批量大小上限）
└── 事务管理配置

确认：
├── 批量操作的规模（几百 / 几千 / 几万）
├── 是否需要事务保证（全部成功或全部失败）
├── 是否需要进度反馈
└── 超时和限流策略
```

### P2：批量方案设计

```
数据量分级策略：

├── < 500 条：单次事务，批量 insert/update
│   ├── MyBatis-Plus: saveBatch(list, batchSize)
│   └── JPA: saveAll(list)
│
├── 500 ~ 10000 条：分批处理，每批 500 条
│   ├── Lists.partition(list, 500) 分批
│   ├── 每批一个事务
│   └── 记录处理进度
│
└── > 10000 条：异步 + 分批 + 进度追踪
    ├── 异步任务（@Async 或消息队列）
    ├── 每批 500-1000 条
    ├── 返回任务ID，前端轮询进度
    └── 失败记录收集，支持部分失败
```

### P3：编码要点

```java
// 中等批量：分批处理
@Transactional(rollbackFor = Exception.class)
public BatchResult batchImport(List<UserCreateDTO> dtoList) {
    List<User> successList = new ArrayList<>();
    List<BatchFailRecord> failList = new ArrayList<>();

    List<List<UserCreateDTO>> partitions = Lists.partition(dtoList, 500);
    for (int i = 0; i < partitions.size(); i++) {
        List<UserCreateDTO> batch = partitions.get(i);
        for (UserCreateDTO dto : batch) {
            try {
                validateForImport(dto);
                User user = UserConverter.toEntity(dto);
                successList.add(user);
            } catch (BusinessException e) {
                failList.add(new BatchFailRecord(i * 500 + batch.indexOf(dto) + 1,
                        dto.toString(), e.getMessage()));
            }
        }
    }

    if (!successList.isEmpty()) {
        userMapper.insertBatchSomeColumn(successList);
    }
    log.info("批量导入完成, 成功={}, 失败={}", successList.size(), failList.size());
    return BatchResult.of(successList.size(), failList);
}
```

---

## 定时任务流程

### P0：阅读清单

```
必读：
├── 现有的定时任务代码（如有）
├── 任务调度框架（Spring @Scheduled / XXL-Job / Quartz）
├── 任务相关表和 Entity
└── 应用配置中的线程池设置

确认：
├── 任务执行频率（cron 表达式）
├── 是否允许并发执行
├── 任务超时时间
├── 失败重试策略
└── 是否需要分布式锁（多实例部署时）
```

### P2：定时任务设计

```
任务设计清单：
├── 任务标识：唯一任务名 + 描述
├── 执行频率：cron 表达式
├── 并发策略：是否允许重叠执行
├── 超时处理：超时后的行为（中断 / 标记失败）
├── 异常处理：失败是否重试、重试次数
├── 日志要求：开始/结束/耗时/处理数量
└── 监控告警：失败后是否通知
```

### P3：编码模板

```java
// Spring @Scheduled 方式
@Component
@Slf4j
public class UserCleanupTask {

    private final UserService userService;

    public UserCleanupTask(UserService userService) {
        this.userService = userService;
    }

    /**
     * 清理过期未激活用户
     * 每天凌晨 2 点执行
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanExpiredUsers() {
        log.info("清理过期用户任务开始");
        long startTime = System.currentTimeMillis();

        try {
            int count = userService.cleanExpiredUsers();
            long cost = System.currentTimeMillis() - startTime;
            log.info("清理过期用户任务完成, 清理数量={}, 耗时={}ms", count, cost);
        } catch (Exception e) {
            log.error("清理过期用户任务失败", e);
            // 可选：发送告警通知
        }
    }
}

// 分布式锁 + 定时任务（多实例部署时必须）
@Component
@Slf4j
public class OrderTimeoutTask {

    private final RedisTemplate<String, String> redisTemplate;
    private final OrderService orderService;

    public OrderTimeoutTask(RedisTemplate<String, String> redisTemplate,
                            OrderService orderService) {
        this.redisTemplate = redisTemplate;
        this.orderService = orderService;
    }

    @Scheduled(cron = "0 */5 * * * ?")
    public void cancelTimeoutOrders() {
        String lockKey = "task:order_timeout";
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, "1", Duration.ofMinutes(5));

        if (Boolean.FALSE.equals(acquired)) {
            log.debug("未获取到分布式锁，跳过本次执行");
            return;
        }

        try {
            orderService.cancelTimeoutOrders();
        } finally {
            redisTemplate.delete(lockKey);
        }
    }
}
```

---

## 文件上传/下载流程

### P0：阅读清单

```
必读：
├── 现有的文件上传代码（如有）
├── 文件存储方案（本地 / OSS / MinIO / S3）
├── application.yml 中的上传配置（大小限制、路径）
├── 现有的文件相关 Entity 和表结构
└── 前端上传方式（单文件 / 多文件 / 分片上传）

确认：
├── 允许的文件类型（白名单）
├── 单文件大小上限
├── 存储路径规则
├── 文件是否需要关联业务实体
└── 下载是否需要权限控制
```

### P2：设计清单

```
文件上传设计：
├── 存储方式：本地磁盘 / 对象存储（OSS/MinIO/S3）
├── 文件命名：UUID 或 雪花ID + 原始扩展名（禁止用原始文件名存储）
├── 路径规则：{basePath}/{yyyy/MM/dd}/{fileName}
├── 大小限制：spring.servlet.multipart.max-file-size
├── 类型校验：白名单校验（后缀 + Magic Number 双重校验）
└── 记录存储：文件元信息存入数据库（文件名、路径、大小、类型、业务关联ID）

文件下载设计：
├── 权限校验：是否需要登录、是否有权限
├── 下载方式：流式下载（大文件禁止全部加载到内存）
└── 响应头：Content-Type、Content-Disposition
```

### P3：编码模板

```java
// 文件上传 Service
@Service
@Slf4j
public class FileServiceImpl implements FileService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @Value("${file.upload-path:/data/uploads}")
    private String uploadPath;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileVO upload(MultipartFile file, Long bizId) {
        // 1. 校验
        validateFile(file);

        // 2. 生成存储路径
        String originalName = file.getOriginalFilename();
        String ext = getFileExtension(originalName);
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String storedName = IdWorker.getIdStr() + "." + ext;
        String relativePath = datePath + "/" + storedName;

        // 3. 存储文件
        Path fullPath = Paths.get(uploadPath, relativePath);
        try {
            Files.createDirectories(fullPath.getParent());
            file.transferTo(fullPath.toFile());
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "文件存储失败");
        }

        // 4. 保存记录
        FileRecord record = new FileRecord();
        record.setOriginalName(originalName);
        record.setStoredName(storedName);
        record.setFilePath(relativePath);
        record.setFileSize(file.getSize());
        record.setFileType(ext);
        record.setBizId(bizId);
        fileRecordMapper.insert(record);

        log.info("文件上传成功, fileId={}, originalName={}", record.getId(), originalName);
        return FileConverter.toVO(record);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "文件大小不能超过10MB");
        }
        String ext = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_TYPES.contains(ext.toLowerCase())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "不支持的文件类型");
        }
    }
}
```

```yaml
# application.yml 文件上传配置
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 50MB

file:
  upload-path: ${FILE_UPLOAD_PATH:/data/uploads}
```

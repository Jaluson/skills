# 数据库设计反模式

本文档是 D3 验证审查阶段的核心参考文件，AI 在 D3.2 反模式扫描时必须逐项对照检查。
每个反模式均标注影响等级，用于判断是否阻断交付。

---

## 影响等级说明

| 等级 | 含义 | 交付要求 |
|------|------|----------|
| **致命** | 架构级错误，会导致数据损坏、性能崩溃、安全风险 | 必须修复，否则禁止交付 |
| **严重** | 设计缺陷，影响可维护性或长期扩展 | 强烈建议修复 |
| **警告** | 次优实践，存在更好方案 | 建议优化，不强制修复 |

---

## 一、表设计反模式

### 1. 物理外键约束

**问题描述**：在数据库层使用 `FOREIGN KEY` 约束建立表间关联。

**错误示例**：
```sql
CREATE TABLE `biz_order` (
    `id`       BIGINT NOT NULL,
    `user_id`  BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
```

**正确做法**：在应用层通过 Service/Mapper 层保证数据一致性，数据库层仅记录外键值。
```sql
`user_id`  BIGINT NOT NULL COMMENT '用户ID',
KEY `idx_order_user_id` (`user_id`)  -- 索引必须有，但不加 FOREIGN KEY
```

**替代方案**：
- 数据校验在应用层 service 方法中执行
- 定期使用定时任务校准数据一致性
- 使用 CDC（Change Data Capture）工具做级联同步

**影响等级**：严重（分库分表时物理外键无法跨库关联）

---

### 2. ENUM 类型

**问题描述**：MySQL 的 `ENUM` 类型存在排序规则问题、修改成本高、跨数据库兼容差等缺陷。

**错误示例**：
```sql
`order_status` ENUM('pending','paid','shipped','completed','cancelled')
               NOT NULL DEFAULT 'pending' COMMENT '订单状态'
```

**正确做法**：使用 `TINYINT` + `COMMENT` 列举枚举值。
```sql
`order_status` TINYINT NOT NULL DEFAULT 0
               COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消'
```

**影响等级**：警告（ENUM 在 MySQL 8.0 中虽已改进，但可维护性仍不如 INT + COMMENT）

---

### 3. AUTO_INCREMENT 主键

**问题描述**：自增主键在分布式环境下无法保证全局唯一，数据迁移时会冲突，且暴露数据量。

**错误示例**：
```sql
`id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
PRIMARY KEY (`id`)
```

**正确做法**：使用雪花 ID（Snowflake ID），由应用层生成。
```sql
`id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
PRIMARY KEY (`id`)
```

**分布式替代方案**：
- 雪花算法（Snowflake）：包含时间戳 + 机器 ID + 序列号
- UUID v7：基于时间的有序 UUID
- 分布式 ID 生成服务（如 Leaf、UidGenerator）

**影响等级**：致命（分布式系统、自建 IDC 场景下必现问题）

---

### 4. FLOAT / DOUBLE 存储金额

**问题描述**：`FLOAT` 和 `DOUBLE` 是浮点数类型，存在二进制精度丢失问题，导致金额计算不准确。

**错误示例**：
```sql
`total_amount` DOUBLE NOT NULL DEFAULT 0 COMMENT '订单总金额'
-- 实际存储 99.99 可能变成 99.99000000001
```

**正确做法**：使用 `DECIMAL`，精确存储小数。
```sql
`total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单总金额（元）'
-- DECIMAL(12,2) 表示总共12位数字，其中2位小数
```

**数值范围参考**：
| 类型 | 适用场景 | 建议精度 |
|------|----------|----------|
| `DECIMAL(10,2)` | 单价、折扣率 | 小额交易 |
| `DECIMAL(12,2)` | 订单金额 | 常规业务 |
| `DECIMAL(16,2)` | 账户余额、大额交易 | 企业级业务 |
| `DECIMAL(20,4)` | 汇率、科学计算 | 金融级精度 |

**影响等级**：致命（金额计算错误会直接导致资损）

---

### 5. 万能大表（God Table）

**问题描述**：将大量无关业务字段堆积在一张表中，导致单表字段数过多（>30个）、数据膨胀、索引臃肿。

**错误示例**：
```sql
-- 一张表包含用户信息 + 订单信息 + 支付信息 + 物流信息 + 商品信息
CREATE TABLE `biz_everything` (
    `id` BIGINT NOT NULL,
    `username` VARCHAR(50), `password` VARCHAR(255), `real_name` VARCHAR(50),
    `email` VARCHAR(100), `phone` VARCHAR(20), `avatar` VARCHAR(500),
    `order_no` VARCHAR(32), `total_amount` DECIMAL(12,2),
    `pay_method` TINYINT, `pay_status` TINYINT,
    `express_company` VARCHAR(50), `tracking_no` VARCHAR(50),
    `product_name` VARCHAR(200), `product_code` VARCHAR(50),
    ... (超过50个字段)
);
```

**正确做法**：按业务域拆分表，通过外键关联。
```sql
-- 用户表
CREATE TABLE `sys_user` (...);
-- 订单表
CREATE TABLE `biz_order` (...);
-- 支付表
CREATE TABLE `biz_payment` (...);
-- 商品表
CREATE TABLE `biz_product` (...);
```

**拆分策略**：
| 策略 | 适用场景 |
|------|----------|
| 按实体拆分 | 用户、订单、商品等独立实体 |
| 按变更频率拆分 | 静态配置表 vs 动态业务表 |
| 按查询模式拆分 | 高频字段 vs 低频字段 |
| 按访问热度拆分 | 热数据表 vs 冷数据表 |

**影响等级**：严重（单表字段过多会增加索引维护成本，降低查询效率）

---

### 6. 无 COMMENT 字段 / 表

**问题描述**：字段和表缺少注释，导致后续维护人员无法理解字段含义，容易误用。

**错误示例**：
```sql
CREATE TABLE `biz_order` (
    `id`    BIGINT NOT NULL,
    `status` TINYINT DEFAULT 0,  -- 无 COMMENT
    `amt`   DECIMAL(12,2)        -- 无 COMMENT
);
```

**正确做法**：每个字段和表必须有清晰的中文 COMMENT。
```sql
CREATE TABLE `biz_order` (
    `id`          BIGINT         NOT NULL COMMENT '主键（雪花ID）',
    `order_no`   VARCHAR(32)    NOT NULL DEFAULT '' COMMENT '订单编号',
    `order_status` TINYINT     NOT NULL DEFAULT 0 COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消',
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单总金额（元）',
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT='订单主表';
```

**COMMENT 规范**：
- 表级 COMMENT：简要说明表的业务用途
- 字段 COMMENT：中文含义 + 枚举值说明 + 单位（如适用）
- 示例：`折扣率（0.0000-1.0000）`、`订单总金额（元）`

**影响等级**：严重（可维护性灾难，新人接手困难）

---

### 7. 缺少公共字段

**问题描述**：表缺少审计追踪字段，无法追溯数据变更历史和责任人。

**错误示例**：
```sql
CREATE TABLE `biz_order` (
    `id`    BIGINT NOT NULL,
    `amount` DECIMAL(12,2),
    -- 缺少 created_by, updated_by, created_at, updated_at, deleted
    PRIMARY KEY (`id`)
);
```

**正确做法**：按表类型添加必要的公共字段。
```sql
`created_by`  BIGINT    NOT NULL DEFAULT 0 COMMENT '创建人ID',
`updated_by`  BIGINT    NOT NULL DEFAULT 0 COMMENT '更新人ID',
`created_at`  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
`updated_at`  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
`deleted`     TINYINT   NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-已删除'
```

**各类型表的公共字段要求**：
| 表类型 | 必须字段 | 可选字段 |
|--------|----------|----------|
| 核心业务表 | id + 审计4字段 + deleted | tenant_id, version |
| 关联表 | id + 审计4字段 + deleted | — |
| 日志表 | id + created_at + created_by | status, error_msg |
| 配置表 | id + 审计4字段 + deleted | sort_order |

**影响等级**：严重（审计追踪缺失，合规场景必败）

---

### 8. 忽略字符集

**问题描述**：未指定或使用了错误的字符集，导致 emoji 表情、特殊字符存储失败或乱码。

**错误示例**：
```sql
-- 未指定字符集，使用数据库默认（可能是 latin1）
CREATE TABLE `biz_product` (
    `name` VARCHAR(100)
);

-- 使用了 utf8（MySQL 的 utf8 是残缺的，仅支持3字节）
-- emoji 表情需要 4 字节，utf8mb4 才能支持
```

**正确做法**：所有表必须指定 `utf8mb4` 字符集。
```sql
CREATE TABLE `biz_product` (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `name`        VARCHAR(100) NOT NULL DEFAULT '' COMMENT '商品名称',
    `description` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '商品描述'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='商品表';
```

**字符集选择建议**：
| 字符集 | 适用场景 |
|--------|----------|
| `utf8mb4` | 通用场景，emoji + 特殊符号 |
| `utf8mb4_unicode_ci` | 需要按语音排序（中文拼音排序） |
| `utf8mb4_general_ci` | 性能优先，排序准确性要求不高 |

**影响等级**：严重（乱码问题难以发现，一旦出现影响面大）

---

### 9. 过度使用 NULL

**问题描述**：所有字段默认为 NULL，增加存储成本、查询复杂度，且容易产生空指针异常。

**错误示例**：
```sql
`name`     VARCHAR(50) NULL,
`amount`   DECIMAL(12,2) NULL,
`status`   TINYINT NULL,
`created_at` DATETIME NULL
```

**正确做法**：默认 NOT NULL，仅在有明确业务理由时允许 NULL。
```sql
-- 有业务理由的场景
`paid_at`   DATETIME NULL COMMENT '支付时间（未支付时为空）',
`parent_id` BIGINT   NULL DEFAULT 0 COMMENT '父级ID（0表示顶级节点）',

-- 无业务理由的场景：NOT NULL + DEFAULT
`name`      VARCHAR(50) NOT NULL DEFAULT '' COMMENT '名称',
`amount`    DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '金额',
`status`    TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-禁用，1-启用'
```

**NOT NULL 原则**：
| 字段类型 | 建议 | 理由 |
|----------|------|------|
| 主键 | NOT NULL | 必须有值 |
| 外键 | NOT NULL | 引用关系必须明确 |
| 状态/类型 | NOT NULL | 业务枚举，不应有空状态 |
| 金额/数量 | NOT NULL | 默认为0，而非空 |
| 时间 | 根据业务判断 | 创建时间 NOT NULL，到期时间可 NULL |
| 名称/描述 | NOT NULL | 默认为空字符串，不为 NULL |
| 可选备注 | 可 NULL | 真正无值时才填 |

**影响等级**：警告（NULL 的三值逻辑会增加查询复杂度）

---

### 10. 触发器和存储过程

**问题描述**：将业务逻辑放入数据库触发器和存储过程中，导致代码分散、难以调试和测试、升级困难。

**错误示例**：
```sql
-- 禁止：触发器中执行业务逻辑
CREATE TRIGGER `tr_order_after_insert` AFTER INSERT ON `biz_order`
FOR EACH ROW
BEGIN
    INSERT INTO `log_stock` (product_id, quantity, type)
    VALUES (NEW.product_id, -NEW.quantity, 'order');
    UPDATE `biz_product` SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
END;

-- 禁止：存储过程中封装复杂业务
CREATE PROCEDURE `sp_create_order`(IN p_user_id BIGINT, ...)
BEGIN
    -- 大量业务逻辑...
END;
```

**正确做法**：业务逻辑全部在应用层实现。
```sql
-- 数据库只负责存储，存储过程仅用于极简的数据迁移脚本
-- 正确示例：应用层在事务中执行
@Transactional
public void createOrder(OrderDTO dto) {
    // 业务逻辑在 Java/TypeScript 代码中
    orderMapper.insert(order);
    stockService.deductStock(productId, quantity);  // 在应用层保证一致性
    logService.logOperation(...);
}
```

**存储过程的合理场景**（极少数）：
- 定时数据清理（低峰期批量处理）
- 跨库数据同步（不得已的 ETL 场景）
- DBA 维护脚本（不得提交到业务代码仓库）

**影响等级**：严重（业务逻辑分散，代码可维护性差）

---

### 11. 大字段存储

**问题描述**：在数据库表中存储图片、音视频、文档等二进制内容。

**错误示例**：
```sql
-- 禁止：将文件内容直接存入数据库
`avatar`      MEDIUMBLOB   NULL COMMENT '用户头像（二进制）',
`attachment`  LONGBLOB    NULL COMMENT '附件内容',
`file_content` LONGTEXT    NULL COMMENT '文件内容'
```

**正确做法**：存储文件路径或对象存储 URL，文件本体存于对象存储服务。
```sql
`avatar`      VARCHAR(500) NOT NULL DEFAULT '' COMMENT '用户头像URL',
`attachment_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '附件URL（对象存储地址）',
`file_path`   VARCHAR(500) NOT NULL DEFAULT '' COMMENT '文件存储路径'
```

**存储方案对比**：
| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| 数据库 BLOB | 极小文件、加密需求 | 数据一致性高 | 占用数据库空间，备份慢 |
| 文件系统 | 中等文件、内部系统 | 成本低 | 分布式部署麻烦 |
| 对象存储 | 所有场景 | 无限扩展、CDN 加速 | 需要业务代码对接 |
| 混合方案 | 大文件 + 需要持久化 | 灵活 | 实现复杂 |

**影响等级**：严重（数据库膨胀，备份和恢复时间大幅增加）

---

### 12. 未预留扩展字段

**问题描述**：字段长度设计过于保守，或表结构设计过于刚性，导致频繁 `ALTER TABLE`，影响线上服务。

**错误示例**：
```sql
-- 字段长度不够
`phone`     VARCHAR(11)   -- 中国手机号11位没问题，但扩展到国际号码就溢出了
`name`      VARCHAR(20)   -- 少数民族姓名、英文名可能超长
`address`   VARCHAR(100)  -- 详细地址可能超过100字符

-- 无扩展字段
-- 每次新增业务属性都要加字段
```

**正确做法**：
```sql
-- 合理预估长度，留出扩展空间
`phone`     VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '手机号（支持国际格式）',
`name`      VARCHAR(100) NOT NULL DEFAULT '' COMMENT '姓名',
`address`   VARCHAR(500) NOT NULL DEFAULT '' COMMENT '详细地址',

-- 预留 JSON 扩展字段（用于不确定的扩展属性）
`ext_data`  JSON NULL COMMENT '扩展数据（JSON格式）'
```

**ALTER TABLE 成本说明**：
- MySQL 5.6 及之前：`ALTER TABLE` 会锁表
- MySQL 5.7+：支持 `ALGORITHM=INPLACE, LOCK=NONE` 在线 DDL
- 但大表 DDL（百万行以上）仍然耗时较长，建议使用 pt-online-schema-change 或 gh-ost
- 最佳实践：通过 JSON 扩展字段减少 DDL 频率

**影响等级**：警告（频繁 DDL 影响服务稳定性）

---

## 二、索引设计反模式

### 1. 冗余索引

**问题描述**：创建了功能重复的索引，浪费存储空间，增加写入开销。

**错误示例**：
```sql
KEY `idx_user_id` (`user_id`),        -- 冗余：user_id 是外键，已有索引
KEY `idx_user_status` (`user_id`, `status`),
KEY `idx_user_status_created` (`user_id`, `status`, `created_at`)

-- idx_user_id 完全被 idx_user_status 覆盖（联合索引包含 user_id）
```

**正确做法**：
```sql
KEY `idx_order_user_id` (`user_id`),                    -- 外键索引
KEY `idx_order_status_created` (`order_status`, `created_at`),  -- 覆盖独立查询
KEY `idx_order_user_status` (`user_id`, `order_status`)          -- 覆盖联合查询
```

**冗余索引检测方法**：
```sql
-- 方法1：通过 SHOW INDEX 人工检查
SHOW INDEX FROM `biz_order`;

-- 方法2：利用 performance_schema 分析索引使用率
SELECT * FROM performance_schema.table_io_waits_summary_by_index_usage;

-- 方法3：使用工具（如 pt-duplicate-key-checker）
pt-duplicate-key-checker h=localhost,u=user,p=pass,d=dbname
```

**冗余索引判定原则**：
| 索引A | 索引B | 关系 |
|--------|--------|------|
| `(a)` | `(a, b)` | 冗余，A 被 B 覆盖 |
| `(a, b)` | `(a)` | 无冗余，两者独立 |
| `(a, b)` | `(b, a)` | 等价，顺序不同但效果相同 |
| `(a)` | `(a)` | 完全重复，应删除一个 |

**影响等级**：警告（增加写入开销和存储成本）

---

### 2. 索引滥用

**问题描述**：在数据量小或区分度低的字段上建索引，索引反而增加开销。

**错误示例**：
```sql
-- 在低区分度字段上建索引（性别只有0/1两种值）
KEY `idx_gender` (`gender`)

-- 在小表上建索引（100行以下）
KEY `idx_config_value` (`config_value`)
```

**正确做法**：
```sql
-- 区分度公式：COUNT(DISTINCT column) / COUNT(*) 越接近1越好
-- 性别字段区分度 = 2 / 总行数 ≈ 0，低于 0.01 的字段不建议建单字段索引
-- 如果必须查询：使用联合索引，如 (gender, created_at)

-- 小表（行数 < 10000）：优先全表扫描，索引收益不明显
-- 确实需要：联合索引优于单字段索引
```

**适合建索引的特征**：
| 特征 | 阈值 | 说明 |
|------|------|------|
| 数据量 | > 10万行 | 数据量越大索引收益越高 |
| 区分度 | > 0.01 | 区分度越高索引效率越高 |
| 查询频率 | 高频 | 频繁查询的字段优先建索引 |
| 更新频率 | 低频 | 写入频繁的字段建索引代价高 |

**影响等级**：警告（小表索引无收益反而增加维护成本）

---

### 3. 外键无索引

**问题描述**：外键字段未建索引，JOIN 查询时全表扫描。

**错误示例**：
```sql
CREATE TABLE `biz_order_item` (
    `id`       BIGINT NOT NULL COMMENT '主键',
    `order_id` BIGINT NOT NULL COMMENT '订单ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    PRIMARY KEY (`id`)
    -- 错误：order_id 和 product_id 都应该有索引
);
```

**正确做法**：外键字段必须加索引。
```sql
CREATE TABLE `biz_order_item` (
    `id`         BIGINT NOT NULL COMMENT '主键',
    `order_id`   BIGINT NOT NULL COMMENT '订单ID',
    `product_id` BIGINT NOT NULL COMMENT '商品ID',
    PRIMARY KEY (`id`),
    KEY `idx_item_order_id` (`order_id`),     -- 外键索引：支持 JOIN 查询
    KEY `idx_item_product_id` (`product_id`)  -- 外键索引：支持反向查询
);
```

**外键索引设计原则**：
- 每个 `xxx_id` 字段都应该有索引
- 关联表（M:N）的两个外键字段都需要索引
- 联合外键需要联合索引

**影响等级**：严重（JOIN 查询性能灾难）

---

### 4. 联合索引顺序错误

**问题描述**：联合索引字段顺序违背最左前缀原则，导致索引无法生效。

**错误示例**：
```sql
-- 查询：WHERE status = 1 AND created_at > '2026-01-01'
-- 错误：created_at 在前，status 在后，无法使用索引
KEY `idx_wrong` (`created_at`, `status`)

-- 查询：WHERE user_id = 1 ORDER BY created_at DESC
-- 错误：等值查询字段和排序字段顺序颠倒
KEY `idx_wrong2` (`created_at`, `user_id`)
```

**正确做法**：
```sql
-- 原则：等值查询字段在前，范围查询字段在后，排序字段在最后
-- 查询：WHERE status = 1 AND created_at > '2026-01-01'
-- 正确：status 等值在前，created_at 范围在后
KEY `idx_correct` (`status`, `created_at`)

-- 查询：WHERE user_id = 1 ORDER BY created_at DESC
-- 正确：等值字段在前
KEY `idx_correct2` (`user_id`, `created_at`)
```

**联合索引设计规范**：
| 字段类型 | 放置顺序 | 示例 |
|----------|----------|------|
| 等值查询字段 | 最前 | `status = 1` |
| 范围查询字段 | 中间 | `created_at > '...'` |
| 排序字段 | 最后 | `ORDER BY created_at` |

**影响等级**：严重（查询无法使用索引，全表扫描）

---

### 5. 索引缺失

**问题描述**：高频查询字段没有索引，导致慢查询。

**错误示例**：
```sql
-- 查询：SELECT * FROM biz_order WHERE order_no = 'xxx'
-- 错误：order_no 没有唯一索引
`order_no` VARCHAR(32) NOT NULL DEFAULT ''

-- 查询：SELECT * FROM biz_order WHERE user_id = 1 AND order_status = 0
-- 错误：没有覆盖该查询模式的联合索引
```

**正确做法**：
```sql
`order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单编号'
-- 需要唯一索引
UNIQUE KEY `uk_order_order_no` (`order_no`)

-- 需要联合索引
KEY `idx_order_user_status` (`user_id`, `order_status`)
```

**索引缺失排查方法**：
```sql
-- 1. 慢查询日志分析
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 2. EXPLAIN 分析高频查询
EXPLAIN SELECT * FROM biz_order WHERE user_id = 1 AND order_status = 0;

-- 3. performance_schema 统计
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE '%biz_order%'
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
```

**影响等级**：严重（慢查询影响用户体验）

---

## 三、SQL 编写反模式

### 1. SELECT *

**问题描述**：使用 `SELECT *` 返回所有字段，增加网络传输、无法使用覆盖索引、暴露敏感字段。

**错误示例**：
```sql
-- 禁止：SELECT *
SELECT * FROM sys_user WHERE id = 1;

-- 禁止：在分页查询中使用 SELECT *
SELECT * FROM biz_order ORDER BY created_at DESC LIMIT 0, 20;
```

**正确做法**：明确指定需要的字段。
```sql
-- 正确：只查需要的字段
SELECT `id`, `username`, `real_name`, `email`, `phone`
FROM `sys_user` WHERE `id` = 1;

-- 正确：使用覆盖索引
SELECT `id`, `order_status`, `total_amount`, `created_at`
FROM `biz_order`
WHERE `user_id` = 1 AND `order_status` = 0
ORDER BY `created_at` DESC LIMIT 0, 20;
```

**禁止使用 SELECT * 的场景**：
| 场景 | 原因 |
|------|------|
| API 接口返回 | 增加带宽消耗，可能暴露敏感字段 |
| 关联查询 | 可能产生大量冗余数据 |
| 分页查询 | 无法使用覆盖索引，效率低 |
| 联表查询 | 字段歧义，难以维护 |

**影响等级**：警告（性能和可维护性问题）

---

### 2. SELECT COUNT(*) 判存在

**问题描述**：用 `SELECT COUNT(*) FROM ... WHERE ...` 判断记录是否存在，效率低。

**错误示例**：
```sql
-- 低效：COUNT(*) 需要遍历所有匹配行
SELECT COUNT(*) FROM `biz_order` WHERE `user_id` = 1 AND `order_status` = 0;
if ($count > 0) { /* 存在 */ }
```

**正确做法**：使用 `EXISTS` 或 `LIMIT 1`。
```sql
-- 方案A：EXISTS（推荐）
SELECT EXISTS(SELECT 1 FROM `biz_order` WHERE `user_id` = 1 AND `order_status` = 0) AS `exists`;

-- 方案B：LIMIT 1
SELECT 1 FROM `biz_order` WHERE `user_id` = 1 AND `order_status` = 0 LIMIT 1;

-- 方案C：获取 ID（需要用到主键索引）
SELECT `id` FROM `biz_order` WHERE `user_id` = 1 AND `order_status` = 0 LIMIT 1;
```

**性能对比**：
| 方法 | 全表扫描 | 索引使用 | 适用场景 |
|------|----------|----------|----------|
| `COUNT(*)` | 是（需计数） | 可用 | 确实需要知道精确数量 |
| `EXISTS` | 否（找到即停） | 可用 | 仅判断存在性 |
| `LIMIT 1` | 否（找到即停） | 可用 | 仅判断存在性 |

**影响等级**：警告（存在多条匹配时性能差异明显）

---

### 3. 循环中执行 SQL

**问题描述**：在循环中逐条执行 SQL（N+1 问题），性能极差。

**错误示例**：
```java
// 错误：在循环中查数据库
List<Order> orders = orderMapper.selectList();
for (Order order : orders) {
    User user = userMapper.selectById(order.getUserId());  // N次查询
    order.setUser(user);
}
```

**正确做法**：批量查询或 JOIN。
```java
// 方案A：批量查询
List<Order> orders = orderMapper.selectList();
Set<Long> userIds = orders.stream().map(Order::getUserId).collect(Collectors.toSet());
Map<Long, User> userMap = userMapper.selectByIds(userIds).stream()
    .collect(Collectors.toMap(User::getId, Function.identity()));
for (Order order : orders) {
    order.setUser(userMap.get(order.getUserId()));
}

// 方案B：JOIN 查询（字段多时推荐）
SELECT o.*, u.username, u.real_name
FROM biz_order o
LEFT JOIN sys_user u ON o.user_id = u.id
WHERE o.user_id = 1;
```

**批量操作规范**：
| 操作类型 | 单条执行 | 批量执行 |
|----------|----------|----------|
| 插入 | INSERT INTO ... VALUES (...); x N | INSERT INTO ... VALUES (...), (...), (...) |
| 更新 | UPDATE ... WHERE id = N | UPDATE ... WHERE id IN (N1, N2, N3) |
| 删除 | DELETE FROM ... WHERE id = N | DELETE FROM ... WHERE id IN (N1, N2, N3) |

**影响等级**：严重（数据库压力倍增，网络往返开销巨大）

---

### 4. 隐式类型转换

**问题描述**：查询条件中字段类型与参数类型不匹配，导致索引失效。

**错误示例**：
```sql
-- 错误：order_no 是 VARCHAR，但传入了数字
SELECT * FROM `biz_order` WHERE `order_no` = 12345;
-- MySQL 会将 order_no 转为数字进行匹配，索引失效

-- 错误：user_id 是 BIGINT，但用字符串比较
SELECT * FROM `biz_order` WHERE `user_id` = '1001';
-- 同样触发隐式类型转换

-- 错误：日期字段比较
SELECT * FROM `biz_order` WHERE `created_at` > 20260101;
```

**正确做法**：
```sql
-- 正确：使用正确的类型
SELECT * FROM `biz_order` WHERE `order_no` = 'SO20260101001';
SELECT * FROM `biz_order` WHERE `user_id` = 1001;
SELECT * FROM `biz_order` WHERE `created_at` > '2026-01-01 00:00:00';
```

**常见隐式类型转换场景**：
| 字段类型 | 错误写法 | 正确写法 |
|----------|----------|----------|
| VARCHAR | `WHERE code = 123` | `WHERE code = '123'` |
| BIGINT | `WHERE id = '1001'` | `WHERE id = 1001` |
| DATETIME | `WHERE created_at > 20260101` | `WHERE created_at > '2026-01-01'` |
| INT | `WHERE status = '1'` | `WHERE status = 1` |

**影响等级**：严重（索引失效，查询性能大幅下降）

---

### 5. OR 条件

**问题描述**：使用 `OR` 连接多个条件，可能导致索引失效或全表扫描。

**错误示例**：
```sql
-- 错误：OR 条件可能导致全表扫描
SELECT * FROM `biz_order` WHERE `user_id` = 1 OR `order_status` = 0;

-- 错误：OR 在索引列和非索引列之间
SELECT * FROM `biz_order` WHERE `user_id` = 1 OR `remark` = 'urgent';
```

**正确做法**：
```sql
-- 方案A：UNION ALL（每个条件使用独立索引）
SELECT * FROM `biz_order` WHERE `user_id` = 1
UNION ALL
SELECT * FROM `biz_order` WHERE `order_status` = 0 AND `user_id` <> 1;

-- 方案B：IN（等值查询优化）
SELECT * FROM `biz_order` WHERE `user_id` IN (1, 2, 3);

-- 方案C：拆分为多个查询（简单直接）
List<Order> result = new ArrayList<>();
result.addAll(orderMapper.selectByUserId(1));
result.addAll(orderMapper.selectByStatus(0));
```

**OR 优化策略**：
| 场景 | 优化方案 |
|------|----------|
| 同一字段多值 | `IN` 替代 `OR` |
| 不同字段等值 | `UNION ALL` |
| 范围条件 | 拆分为多个范围区间 |
| 需要去重 | `UNION`（自动去重） |

**影响等级**：警告（OR 可能导致索引失效，但不是绝对的）

---

## 四、数据模型反模式

### 1. 多态关联

**问题描述**：一个外键字段可以引用多个不同表，类型不明确，破坏了外键的语义完整性。

**错误示例**：
```sql
-- 错误：source_type 和 source_id 组合可以指向任意表
`source_type` VARCHAR(50) NOT NULL COMMENT '来源类型：order/product/refund',
`source_id`   BIGINT NOT NULL COMMENT '来源ID',
-- 查询时必须判断类型，无法建立真正的外键约束
SELECT * FROM `log_action` WHERE `source_type` = 'order' AND `source_id` = 1;
```

**正确做法**：
```sql
-- 方案A：创建独立的关系表（推荐）
CREATE TABLE `rel_order_action` (
    `id`          BIGINT NOT NULL COMMENT '主键',
    `order_id`   BIGINT NOT NULL COMMENT '订单ID',
    `action_id`  BIGINT NOT NULL COMMENT '操作记录ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_action` (`order_id`, `action_id`)
);

-- 方案B：如果确实需要多态，明确字段含义
`order_id`   BIGINT NULL COMMENT '关联订单ID（仅 order 类型时有效）',
`product_id` BIGINT NULL COMMENT '关联商品ID（仅 product 类型时有效）'
```

**多态关联的合理场景**：
- 消息队列消息体（解耦场景，不需要外键约束）
- 日志表的业务关联（只读，不需要强一致性）
- 第三方系统的关联引用（外部系统 ID）

**影响等级**：严重（数据完整性无法保证，查询复杂）

---

### 2. 树形结构无限递归

**问题描述**：使用简单的 parent_id 构建树形结构时，递归深度不受控制，导致查询性能问题。

**错误示例**：
```sql
-- 简单 parent_id：查询所有子节点需要递归
CREATE TABLE `sys_department` (
    `id`         BIGINT NOT NULL COMMENT '主键',
    `parent_id`  BIGINT NOT NULL DEFAULT 0 COMMENT '父部门ID',
    `name`       VARCHAR(100) NOT NULL DEFAULT '' COMMENT '部门名称'
);
-- 查询所有子部门（假设深度为4层）：
SELECT * FROM sys_department
WHERE parent_id = 1
   OR parent_id IN (SELECT id FROM sys_department WHERE parent_id = 1)
   OR parent_id IN (SELECT id FROM sys_department WHERE parent_id IN (...));
```

**正确做法**：使用 `path` 字段存储层级路径，支持非递归查询。
```sql
CREATE TABLE `sys_department` (
    `id`         BIGINT NOT NULL COMMENT '主键',
    `parent_id`  BIGINT NOT NULL DEFAULT 0 COMMENT '父部门ID（0表示顶级）',
    `name`       VARCHAR(100) NOT NULL DEFAULT '' COMMENT '部门名称',
    `level`      TINYINT NOT NULL DEFAULT 1 COMMENT '层级深度（1开始）',
    `path`       VARCHAR(255) NOT NULL DEFAULT '' COMMENT '层级路径（格式：1,5,12,）'
);
-- path 示例：根节点 "1,"，子节点 "1,5,"，孙节点 "1,5,12,"
-- 查询所有子节点：path LIKE '1,5,%'
SELECT * FROM sys_department WHERE path LIKE '1,5,%';
-- 查询所有祖先：id IN (1, 5, 12)  或 path 拆分
```

**树形结构方案对比**：
| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| Adjacency List (parent_id) | 简单树、写入多 | 结构简单 | 查询子节点需递归 |
| Path (路径字符串) | 层级查询 | 非递归查询子/祖先 | 路径维护成本 |
| Nested Set | 一次性读取 | 全子集查询快 | 写入代价高 |
| Closure Table | 频繁祖先/后代查询 | 查询最灵活 | 存储成本高 |

**影响等级**：严重（递归查询在大数据量下性能极差）

---

### 3. 过度规范化

**问题描述**：为了追求"完美范式"拆分了过多表，导致大量 JOIN 查询。

**错误示例**：
```sql
-- 过度拆分：国家、省份、城市拆成3张表
CREATE TABLE `sys_country` (`id`, `name`);
CREATE TABLE `sys_province` (`id`, `country_id`, `name`);
CREATE TABLE `sys_city` (`id`, `province_id`, `name`);
CREATE TABLE `biz_user` (`id`, `city_id`, `name`);

-- 查询用户信息需要3次 JOIN
SELECT u.name, c.name as city, p.name as province, co.name as country
FROM biz_user u
JOIN sys_city c ON u.city_id = c.id
JOIN sys_province p ON c.province_id = p.id
JOIN sys_country co ON p.country_id = co.id;
```

**正确做法**：根据查询频率和一致性要求决定拆分程度。
```sql
-- 方案A：保留城市名（查询简单，允许少量冗余）
CREATE TABLE `biz_user` (
    `id` BIGINT NOT NULL,
    `city_id` BIGINT NOT NULL COMMENT '城市ID',
    `city_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '城市名称（冗余存储）',
    `province_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '省份名称',
    `country_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '国家名称'
);

-- 方案B：字典缓存（国家/省份等静态数据放入 Redis）
-- 减少 JOIN，同时保证一致性
```

**规范化和性能平衡**：
| 因素 | 建议 |
|------|------|
| 查询频率 | 高频查询字段合并，减少 JOIN |
| 更新频率 | 变更频繁的字段独立表，减少更新成本 |
| 一致性要求 | 高一致性要求优先规范化，接受 JOIN |
| 数据量 | 大数据量表避免过度拆分 |

**影响等级**：警告（JOIN 过多增加查询复杂度）

---

## 五、反模式扫描清单（D3 专用）

以下清单供 AI 在 D3.2 阶段逐项扫描，确保 DDL 中无反模式。

### 5.1 表设计扫描

```
【致命/严重】
  [ ] 无 AUTO_INCREMENT 主键（必须使用雪花ID）
  [ ] 无 FLOAT/DOUBLE 存储金额（必须使用 DECIMAL）
  [ ] 无物理外键约束（通过应用层保证）
  [ ] 字符集为 utf8mb4（非 utf8）
  [ ] 每个字段有 COMMENT（禁止无注释字段）
  [ ] 表有 COMMENT
  [ ] 金额字段使用 DECIMAL（非 FLOAT/DOUBLE）
  [ ] 无大字段存储（BLOB/TEXT 存文件）

【警告】
  [ ] 无 ENUM 类型（使用 TINYINT + COMMENT）
  [ ] 字段默认 NOT NULL，可空字段有明确理由
  [ ] VARCHAR 长度合理（有扩展预留）
  [ ] 无预留扩展字段 ext_data
  [ ] 公共字段完整（审计字段、软删除）
```

### 5.2 索引设计扫描

```
【严重】
  [ ] 外键字段有索引
  [ ] 联合索引遵循最左前缀原则
  [ ] 无冗余索引（A 被 B 完全覆盖）

【警告】
  [ ] 无小表滥用索引
  [ ] 低区分度字段无单字段索引（可联合索引替代）
  [ ] 业务唯一字段有唯一索引
  [ ] 索引命名规范（uk_/idx_ 前缀）
```

### 5.3 SQL 编写扫描（审查 DDL 模板和生成的 SQL）

```
【警告】
  [ ] 无 SELECT *（明确指定字段）
  [ ] 字段类型与参数类型一致（无隐式类型转换）
  [ ] 避免 OR 条件（考虑 UNION ALL）
  [ ] COUNT(*) 判存在场景使用 EXISTS
  [ ] 批量操作（避免循环单条执行）
```

### 5.4 数据模型扫描

```
【严重】
  [ ] 无多态关联（外键类型明确）
  [ ] 树形结构有 path 字段支持非递归查询

【警告】
  [ ] 无过度规范化（考虑查询频率）
  [ ] 关联表命名规范（rel_ 前缀或描述性名称）
```

---

## 反模式汇总表

| 编号 | 反模式 | 类别 | 影响等级 |
|------|--------|------|----------|
| T-01 | 物理外键约束 | 表设计 | 严重 |
| T-02 | ENUM 类型 | 表设计 | 警告 |
| T-03 | AUTO_INCREMENT 主键 | 表设计 | 致命 |
| T-04 | FLOAT/DOUBLE 存储金额 | 表设计 | 致命 |
| T-05 | 万能大表 | 表设计 | 严重 |
| T-06 | 无 COMMENT | 表设计 | 严重 |
| T-07 | 缺少公共字段 | 表设计 | 严重 |
| T-08 | 忽略字符集 | 表设计 | 严重 |
| T-09 | 过度使用 NULL | 表设计 | 警告 |
| T-10 | 触发器和存储过程 | 表设计 | 严重 |
| T-11 | 大字段存储 | 表设计 | 严重 |
| T-12 | 未预留扩展字段 | 表设计 | 警告 |
| I-01 | 冗余索引 | 索引设计 | 警告 |
| I-02 | 索引滥用 | 索引设计 | 警告 |
| I-03 | 外键无索引 | 索引设计 | 严重 |
| I-04 | 联合索引顺序错误 | 索引设计 | 严重 |
| I-05 | 索引缺失 | 索引设计 | 严重 |
| S-01 | SELECT * | SQL编写 | 警告 |
| S-02 | COUNT(*) 判存在 | SQL编写 | 警告 |
| S-03 | 循环中执行 SQL | SQL编写 | 严重 |
| S-04 | 隐式类型转换 | SQL编写 | 严重 |
| S-05 | OR 条件 | SQL编写 | 警告 |
| M-01 | 多态关联 | 数据模型 | 严重 |
| M-02 | 树形结构无限递归 | 数据模型 | 严重 |
| M-03 | 过度规范化 | 数据模型 | 警告 |

---

> **使用说明**：本文件是 tk-database-design-standards skill 的 D3 阶段参考文档。AI 在 D3.2 反模式扫描时，应逐项对照检查所有设计决策，发现反模式后需修复至通过才能进入 D4 交付阶段。

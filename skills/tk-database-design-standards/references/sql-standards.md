# SQL 编写规范

## 目录

- [一、DDL 标准](#一ddl-标准)
- [二、DML 标准](#二dml-标准)
- [三、SQL 安全规范](#三sql-安全规范)
- [四、SQL 命名规范](#四sql-命名规范)
- [五、SQL 编写禁止项清单](#五sql-编写禁止项清单)
- [六、SQL 自检清单](#六sql-自检清单)

---

## 一、DDL 标准

### 1.1 CREATE TABLE 规范

#### 必须指定 ENGINE 和 CHARSET

每张表的 DDL 必须显式指定存储引擎和字符集，不得依赖数据库默认配置：

```sql
-- 正确：显式指定引擎和字符集
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='订单主表';

-- 禁止：缺少 ENGINE 或 CHARSET
) COMMENT='订单主表';
```

#### 字段分组排列顺序

DDL 中的字段必须按以下分组排列，各组之间用空行和注释分隔：

```
排列顺序：
├── 1. 主键字段（id）
├── 2. 业务字段（按逻辑分组，相关字段放一起）
├── 3. 公共字段（审计字段、逻辑删除等）
└── 4. 索引定义（PRIMARY KEY → UNIQUE KEY → KEY）
```

```sql
-- 正确：分组清晰，排列有序
CREATE TABLE biz_order (
    -- ========== 主键 ==========
    `id`              BIGINT         NOT NULL COMMENT '主键（雪花ID）',

    -- ========== 订单基本信息 ==========
    `order_no`        VARCHAR(32)    NOT NULL DEFAULT '' COMMENT '订单编号',
    `user_id`         BIGINT         NOT NULL DEFAULT 0  COMMENT '下单用户ID',
    `order_status`    TINYINT        NOT NULL DEFAULT 0  COMMENT '订单状态：0-待支付，1-已支付',

    -- ========== 金额信息 ==========
    `total_amount`    DECIMAL(12,2)  NOT NULL DEFAULT 0  COMMENT '订单总金额（元）',
    `pay_amount`      DECIMAL(12,2)  NOT NULL DEFAULT 0  COMMENT '实付金额（元）',

    -- ========== 收货信息 ==========
    `receiver_name`   VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '收货人姓名',
    `receiver_phone`  VARCHAR(20)    NOT NULL DEFAULT '' COMMENT '收货人手机号',

    -- ========== 公共字段 ==========
    `created_by`      BIGINT         NOT NULL DEFAULT 0  COMMENT '创建人ID',
    `updated_by`      BIGINT         NOT NULL DEFAULT 0  COMMENT '更新人ID',
    `created_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`         TINYINT        NOT NULL DEFAULT 0  COMMENT '逻辑删除：0-正常，1-已删除',

    -- ========== 主键 & 索引 ==========
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_order_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='订单主表';

-- 禁止：字段无分组、排列混乱
CREATE TABLE biz_order (
    `deleted`       TINYINT    NOT NULL DEFAULT 0  COMMENT '逻辑删除',
    `order_no`      VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单编号',
    `id`            BIGINT     NOT NULL COMMENT '主键',
    `total_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '总金额',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单主表';
```

#### 文件头注释

每个 DDL 文件必须包含文件头注释，说明表名、描述、作者和日期：

```sql
-- ============================================================
-- 表名：biz_order
-- 描述：订单主表，存储订单基本信息、金额和收货地址
-- 作者：张三
-- 日期：2026-04-18
-- 关联表：biz_order_item, biz_payment
-- ============================================================
```

---

### 1.2 ALTER TABLE 规范

#### 新增列必须有 DEFAULT 值

为已有表新增列时，必须指定 DEFAULT 值，避免全表数据为 NULL：

```sql
-- 正确：有 DEFAULT 值，且有 COMMENT
ALTER TABLE biz_order
    ADD COLUMN `pay_channel` TINYINT NOT NULL DEFAULT 0
    COMMENT '支付渠道：0-未支付，1-微信，2-支付宝'
    AFTER `pay_amount`;

-- 禁止：缺少 DEFAULT 值
ALTER TABLE biz_order
    ADD COLUMN `pay_channel` TINYINT COMMENT '支付渠道';
```

#### 禁止在生产环境直接 DROP COLUMN

列废弃必须遵循以下三阶段流程：

```
阶段一：标记废弃
├── 在 COMMENT 中标注「已废弃，计划于 YYYY-MM 移除」
├── 应用层停止读写该字段
└── 保留至少一个完整版本周期

阶段二：数据迁移
├── 确认无业务代码引用
├── 数据如有价值，迁移到归档表
└── 数据如无价值，直接跳过

阶段三：清理
├── 在测试环境验证删除后无影响
├── 编写回滚方案（万一需要恢复）
├── 选择低峰期执行
└── 执行 DROP COLUMN
```

```sql
-- 阶段一：标记废弃
ALTER TABLE biz_order
    MODIFY COLUMN `old_field` VARCHAR(100) NOT NULL DEFAULT ''
    COMMENT '已废弃-计划于2026-06移除，请使用 new_field';

-- 阶段三：清理（仅限测试环境通过后）
ALTER TABLE biz_order
    DROP COLUMN `old_field`;
```

#### 变更脚本命名规范

数据库变更脚本必须使用版本化命名，与 Flyway/Liquibase 约定一致：

```
命名格式：
├── Flyway:    V{版本号}__{描述}.sql
│   └── 示例：V20260418__add_order_pay_channel.sql
│
├── Liquibase: {版本号}-{描述}.sql
│   └── 示例：20260418-add-order-pay-channel.sql
│
└── 通用格式（无迁移工具时）：
    └── YYYYMMDD_NN_{描述}.sql
        └── 示例：20260418_01_add_order_pay_channel.sql
```

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| 版本号前缀 | 飞行版本号或日期 | `V20260418__` | `v1`, `1.0` |
| 双下划线分隔 | Flyway 用 `__`，Liquibase 用 `-` | `V1__add_column.sql` | `V1_add_column.sql` |
| 描述小写 | 用下划线分隔单词 | `add_pay_channel` | `AddPayChannel` |
| 每个文件一个变更 | 不合并多个变更 | 一个文件只做一件事 | 多个 ALTER 混在一起 |

---

### 1.3 DROP TABLE 规范

| 规则 | 说明 |
|------|------|
| 先备份 | 执行 DROP 前必须导出全表数据（`mysqldump` 或 `CREATE TABLE ... LIKE` + `INSERT ... SELECT`） |
| 确认无外键引用 | 检查所有表中是否引用了待删除表的 ID 字段（应用层外键） |
| 确认无代码引用 | 全局搜索代码中对表名的引用，确保无残留 |
| 分阶段执行 | 先 `RENAME TABLE` 为 `_deprecated`，观察一个版本周期后再 DROP |

```sql
-- 第一步：重命名为废弃表（安全过渡）
RENAME TABLE biz_old_report TO biz_old_report_deprecated_20260418;

-- 第二步：观察一个版本周期，确认无问题后执行
DROP TABLE IF EXISTS biz_old_report_deprecated_20260418;
```

```sql
-- 禁止：直接 DROP，无备份无确认
DROP TABLE biz_order;
```

---

### 1.4 索引创建标准

#### 建表后单独创建

索引必须在建表完成后单独创建，便于排查和回滚：

```sql
-- 正确：建表后单独创建索引
CREATE TABLE biz_order (
    `id`      BIGINT NOT NULL COMMENT '主键（雪花ID）',
    `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单编号',
    `user_id` BIGINT NOT NULL DEFAULT 0 COMMENT '用户ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    -- ... 其他字段 ...
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='订单主表';

-- 单独创建索引
ALTER TABLE biz_order ADD UNIQUE KEY `uk_order_no` (`order_no`);
ALTER TABLE biz_order ADD KEY `idx_order_user_id` (`user_id`);
ALTER TABLE biz_order ADD KEY `idx_order_status_created` (`order_status`, `created_at`);
```

#### 大表加索引使用在线工具

大表（>100 万行）添加索引**必须使用在线 DDL 工具**，避免锁表：

```bash
# 推荐：使用 pt-online-schema-change
pt-online-schema-change \
  --alter "ADD KEY idx_order_user_id (user_id)" \
  D=mydb,t=biz_order \
  --execute

# 备选：使用 ALGORITHM=INPLACE（MySQL 5.6+）
ALTER TABLE biz_order
    ADD KEY `idx_order_user_id` (`user_id`),
    ALGORITHM=INPLACE, LOCK=NONE;
```

```sql
-- 禁止：大表直接加索引（可能长时间锁表）
ALTER TABLE biz_order ADD KEY `idx_order_user_id` (`user_id`);
```

| 表规模 | 推荐方式 | 预计影响 |
|--------|----------|----------|
| < 10 万行 | 直接 `ALTER TABLE ... ADD KEY` | 几乎无影响 |
| 10 万 - 100 万行 | `ALGORITHM=INPLACE, LOCK=NONE` | 短暂锁表 |
| > 100 万行 | `pt-online-schema-change` | 无锁，后台执行 |

---

## 二、DML 标准

### 2.1 INSERT 规范

#### 必须显式列出列名

INSERT 语句必须显式指定列名，禁止省略列名列表：

```sql
-- 正确：显式列出列名
INSERT INTO biz_order (
    id, order_no, user_id, order_status,
    total_amount, pay_amount, created_by
) VALUES (
    1234567890123456789, 'ORD20260418001', 1001, 0,
    99.00, 99.00, 1001
);

-- 禁止：省略列名，依赖表结构顺序
INSERT INTO biz_order VALUES (
    1234567890123456789, 'ORD20260418001', 1001, 0, 99.00, 99.00
);
```

#### 批量插入

批量插入使用多行 VALUES 语法，每批不超过 500 条：

```sql
-- 正确：批量插入，每批 500 条以内
INSERT INTO biz_order_item (
    id, order_id, product_id, quantity, unit_price
) VALUES
    (1001, 100, 2001, 2, 29.90),
    (1002, 100, 2002, 1, 59.00),
    (1003, 100, 2003, 3, 15.50);

-- 禁止：单条逐行插入（性能差）
INSERT INTO biz_order_item (id, order_id, product_id, quantity, unit_price)
VALUES (1001, 100, 2001, 2, 29.90);
INSERT INTO biz_order_item (id, order_id, product_id, quantity, unit_price)
VALUES (1002, 100, 2002, 1, 59.00);
```

---

### 2.2 UPDATE 规范

#### 必须带 WHERE 条件

所有 UPDATE 语句必须带 WHERE 条件，防止全表更新：

```sql
-- 正确：带 WHERE 条件
UPDATE biz_order
SET order_status = 1, paid_at = NOW()
WHERE id = 1234567890123456789
  AND order_status = 0
  AND deleted = 0;

-- 禁止：无 WHERE 条件（全表更新）
UPDATE biz_order SET order_status = 1;

-- 禁止：WHERE 条件过于宽泛
UPDATE biz_order SET order_status = 1 WHERE created_at > '2026-01-01';
```

#### 更新前确认影响行数

执行 UPDATE 前应先确认影响行数，尤其是生产环境：

```sql
-- 第一步：先用 SELECT 确认影响行数
SELECT COUNT(*) FROM biz_order
WHERE order_status = 0 AND created_at < '2026-03-01';
-- 确认结果为预期行数后，再执行 UPDATE

-- 第二步：执行 UPDATE，检查 affected_rows
UPDATE biz_order
SET order_status = 5, cancel_reason = '超时未支付自动取消'
WHERE order_status = 0 AND created_at < '2026-03-01'
  AND deleted = 0;
-- 期望影响行数：1523，实际影响行数：1523 ✓
```

---

### 2.3 DELETE 规范

#### 推荐逻辑删除而非物理删除

优先使用逻辑删除字段（`deleted`），避免物理删除导致数据丢失：

```sql
-- 正确：逻辑删除
UPDATE biz_order
SET deleted = 1, updated_at = NOW()
WHERE id = 1234567890123456789
  AND deleted = 0;

-- 禁止：物理删除（除非明确需要清理数据）
DELETE FROM biz_order WHERE id = 1234567890123456789;
```

#### 大表分批删除

必须物理删除时，大表（>10 万行）必须分批执行，避免长事务锁表：

```sql
-- 正确：分批删除，每批 1000 条，循环执行直到影响行数为 0
DELETE FROM log_operation
WHERE created_at < '2025-01-01'
LIMIT 1000;

-- 禁止：一次性删除大量数据
DELETE FROM log_operation WHERE created_at < '2025-01-01';
```

---

### 2.4 SELECT 规范

#### 禁止 SELECT *

所有查询必须明确指定需要的列名：

```sql
-- 正确：明确指定列名
SELECT id, order_no, user_id, order_status, total_amount, pay_amount, created_at
FROM biz_order
WHERE id = 1234567890123456789
  AND deleted = 0;

-- 禁止：SELECT * （浪费 IO、破坏索引覆盖、影响查询计划）
SELECT * FROM biz_order WHERE id = 1234567890123456789;
```

#### WHERE 条件规范

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| 左侧不要函数 | 函数会导致索引失效 | `WHERE created_at >= '2026-04-01'` | `WHERE DATE(created_at) = '2026-04-01'` |
| 左侧不要运算 | 运算会导致索引失效 | `WHERE amount > 100` | `WHERE amount + 0 > 100` |
| 隐式类型转换 | 会导致索引失效 | `WHERE id = 1234567890` | `WHERE id = '123456789'` |
| 前导模糊查询 | LIKE 前导 % 会导致全表扫描 | `WHERE name LIKE '张%'` | `WHERE name LIKE '%张%'` |
| 逻辑删除过滤 | 查询业务表必须带 deleted 条件 | `WHERE deleted = 0` | 缺少 `deleted = 0` |
| OR 改为 UNION ALL | OR 可能导致索引失效 | `UNION ALL` 两条语句 | `WHERE a = 1 OR b = 2` |

```sql
-- 正确：条件中不使用函数，走索引
SELECT id, order_no, total_amount
FROM biz_order
WHERE created_at >= '2026-04-01 00:00:00'
  AND created_at < '2026-05-01 00:00:00'
  AND deleted = 0;

-- 禁止：对索引列使用函数，导致索引失效
SELECT id, order_no, total_amount
FROM biz_order
WHERE DATE(created_at) = '2026-04-01'
  AND deleted = 0;
```

#### JOIN 规范

```
JOIN 使用规则：
├── 驱动表选择
│   ├── 小表驱动大表（WHERE 条件过滤后行数少的表做驱动表）
│   ├── EXPLAIN 验证执行计划，确保驱动表选择正确
│   └── 关联字段必须有索引
│
├── JOIN 类型选择
│   ├── 优先使用 INNER JOIN（性能最好）
│   ├── 必须使用 LEFT JOIN 时，右表字段需检查 NULL
│   └── 避免使用 RIGHT JOIN（改写为 LEFT JOIN）
│
├── 关联字段规范
│   ├── 关联字段类型必须一致（否则隐式转换导致索引失效）
│   ├── 关联字段必须有索引
│   └── 关联条件中包含 deleted = 0
│
└── 避免子查询
    ├── 将相关子查询改写为 JOIN
    ├── 将 IN 子查询改写为 EXISTS 或 JOIN
    └── 子查询结果集大的用 EXISTS，小的用 IN
```

```sql
-- 正确：使用 JOIN，驱动表合理，关联字段有索引
SELECT o.id, o.order_no, o.total_amount, u.username
FROM biz_order o
INNER JOIN sys_user u ON o.user_id = u.id AND u.deleted = 0
WHERE o.order_status = 1
  AND o.deleted = 0
  AND o.created_at >= '2026-04-01';

-- 禁止：关联字段类型不一致（假设 user_id 是 VARCHAR）
SELECT o.id, o.order_no, u.username
FROM biz_order o
INNER JOIN sys_user u ON o.user_id = u.id;  -- 如果类型不一致，索引失效

-- 正确：子查询改写为 JOIN
SELECT o.id, o.order_no
FROM biz_order o
INNER JOIN (
    SELECT DISTINCT user_id FROM sys_user WHERE user_status = 1 AND deleted = 0
) u ON o.user_id = u.user_id
WHERE o.deleted = 0;

-- 禁止：嵌套子查询（性能差）
SELECT id, order_no
FROM biz_order
WHERE user_id IN (SELECT id FROM sys_user WHERE user_status = 1)
  AND deleted = 0;
```

---

## 三、SQL 安全规范

### 3.1 禁止拼接 SQL

所有 SQL 必须使用参数化查询，禁止字符串拼接：

```java
// 正确：使用参数化查询（MyBatis #{}）
@Select("SELECT id, username, user_status FROM sys_user WHERE id = #{userId} AND deleted = 0")
SysUser selectById(@Param("userId") Long userId);

// 禁止：字符串拼接（SQL 注入风险）
@Select("SELECT id, username, user_status FROM sys_user WHERE id = " + userId + " AND deleted = 0")
SysUser selectById(Long userId);
```

```java
// 禁止：MyBatis ${} 用于值参数（存在 SQL 注入风险）
@Select("SELECT id, username FROM sys_user WHERE username = '${username}' AND deleted = 0")

// ${} 仅允许用于动态表名、列名等结构化参数，且必须白名单校验
```

### 3.2 禁止在 SQL 中存储敏感信息明文

| 敏感数据类型 | 存储方式 | 示例 |
|-------------|----------|------|
| 密码 | bcrypt / argon2 哈希 | `$2a$10$N9qo8uLOickgx2ZMRZoMy...` |
| 手机号 | 脱敏存储或加密存储 | `138****5678` |
| 身份证号 | AES 加密存储 | 应用层加密/解密 |
| 银行卡号 | 仅存后四位 + 加密完整号 | `****1234` |
| API 密钥 | AES 加密存储 | 应用层加密/解密 |

```sql
-- 正确：密码使用加密存储
INSERT INTO sys_user (id, username, password, phone)
VALUES (1, 'admin', '$2a$10$encrypted_hash_value', 'AES_encrypted_phone');

-- 禁止：明文存储密码
INSERT INTO sys_user (id, username, password, phone)
VALUES (1, 'admin', '123456', '13800138000');
```

### 3.3 权限最小化原则

| 角色 | 权限范围 | 说明 |
|------|----------|------|
| 应用账号 | 仅 DML（SELECT/INSERT/UPDATE/DELETE） | 禁止 DDL 和 DROP |
| 运维账号 | DDL + DML | 禁止 DROP TABLE |
| DBA 账号 | 全部权限 | 仅限数据库管理员使用 |
| 只读账号 | 仅 SELECT | 用于报表、数据分析 |

```sql
-- 正确：按角色分配最小权限
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'%';

-- 禁止：授予 ALL PRIVILEGES 给应用账号
GRANT ALL PRIVILEGES ON mydb.* TO 'app_user'@'%';
```

### 3.4 SQL 注入防护检查清单

```
SQL 注入防护检查：
├── 参数化查询
│   ├── [ ] 所有查询使用参数化（MyBatis #{} / PreparedStatement）
│   ├── [ ] 禁止字符串拼接 SQL
│   └── [ ] ${} 仅用于结构化参数（表名、列名），且有白名单校验
│
├── 输入校验
│   ├── [ ] 用户输入在应用层做格式校验
│   ├── [ ] 数值类型参数做类型转换（不接受字符串传数值）
│   └── [ ] 长度限制（防止超长输入）
│
├── 输出编码
│   ├── [ ] 查询结果展示时做 HTML 转义
│   └── [ ] 错误信息不暴露 SQL 语句和表结构
│
└── 其他
    ├── [ ] ORM 框架已关闭 SQL 日志打印（生产环境）
    ├── [ ] API 层有统一的异常处理，不返回数据库错误详情
    └── [ ] 定期进行 SQL 注入扫描
```

---

## 四、SQL 命名规范

### 4.1 表别名规范

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| 有意义的缩写 | 使用表名关键字的缩写 | `o` (order), `u` (user) | `a`, `b`, `t1` |
| 一致性 | 同一张表在同一个 SQL 中别名一致 | `o` 始终代表 order | 前面用 `o` 后面用 `ord` |
| 简短 | 1-3 个字符 | `oi` (order_item) | `orderitem` |
| AS 可省略 | 直接空格写别名 | `FROM biz_order o` | `FROM biz_order AS o` |

```sql
-- 正确：别名有意义且一致
SELECT o.id, o.order_no, oi.product_id, oi.quantity
FROM biz_order o
INNER JOIN biz_order_item oi ON o.id = oi.order_id
WHERE o.deleted = 0 AND oi.deleted = 0;

-- 禁止：无意义别名
SELECT a.id, b.product_id, c.quantity
FROM biz_order a
INNER JOIN biz_order_item b ON a.id = b.order_id
INNER JOIN sys_user c ON a.user_id = c.id;
```

### 4.2 列别名规范

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| 统计列 | 使用中文或下划线命名 | `total_cnt`, `订单总数` | `count1`, `c` |
| 计算列 | 描述计算含义 | `pay_rate` | `col1` |
| 去重列 | 标注来源 | `dept_name` | `name`（多表时有歧义） |

```sql
-- 正确：列别名有明确含义
SELECT
    COUNT(*) AS total_cnt,
    SUM(total_amount) AS total_amount_sum,
    AVG(total_amount) AS avg_amount
FROM biz_order
WHERE deleted = 0;

-- 禁止：无意义列别名
SELECT COUNT(*) AS c1, SUM(total_amount) AS c2 FROM biz_order WHERE deleted = 0;
```

### 4.3 存储过程/函数命名

> 注意：本规范不建议使用存储过程和函数（业务逻辑放应用层）。
> 如果项目确实需要，遵循以下命名规范：

```
命名格式：{前缀}_{模块}_{动作}

存储过程前缀：
├── sp_  — 存储过程（Stored Procedure）
└── fn_  — 函数（Function）

示例：
├── sp_order_create          — 创建订单
├── sp_order_cancel          — 取消订单
├── sp_report_daily_sales    — 每日销售报表
├── fn_calc_discount         — 计算折扣
└── fn_get_user_level        — 获取用户等级
```

---

## 五、SQL 编写禁止项清单

| 序号 | 禁止项 | 原因 | 正确做法 |
|------|--------|------|----------|
| 1 | `SELECT *` | 浪费 IO，无法使用覆盖索引，表结构变更时出错 | 明确列出需要的列名 |
| 2 | 无 WHERE 的 UPDATE/DELETE | 全表操作，数据丢失风险 | 必须带 WHERE 条件 |
| 3 | 不带 `deleted = 0` 的业务查询 | 查出已删除数据 | 所有业务表查询加 `deleted = 0` |
| 4 | 在索引列上使用函数 | 索引失效，全表扫描 | 改写条件，避免函数 |
| 5 | 隐式类型转换 | 索引失效 | 确保比较两侧类型一致 |
| 6 | `LIKE '%xxx'` 前导模糊 | 索引失效 | 使用全文索引或 ES 搜索 |
| 7 | 字符串拼接 SQL | SQL 注入风险 | 使用参数化查询 |
| 8 | INSERT 不指定列名 | 表结构变更时出错 | 显式列出列名 |
| 9 | 大表直接加索引 | 长时间锁表 | 使用 pt-online-schema-change |
| 10 | 大表一次性 DELETE | 长事务锁表 | 分批删除，每次 LIMIT |
| 11 | 生产环境直接 DROP COLUMN | 数据丢失，应用报错 | 废弃标记 → 迁移 → 清理 |
| 12 | 生产环境直接 DROP TABLE | 数据无法恢复 | 先备份，先 RENAME 观察 |
| 13 | 使用 `FLOAT`/`DOUBLE` 存金额 | 精度丢失 | 使用 `DECIMAL` |
| 14 | 使用 `ENUM` 类型 | 修改枚举值需要 ALTER TABLE | 使用 `TINYINT` + COMMENT |
| 15 | 使用物理外键约束 | 影响性能，运维困难 | 应用层保证一致性 |
| 16 | 存储过程写业务逻辑 | 难以调试、测试、版本管理 | 业务逻辑放应用层 |
| 17 | 在 WHERE 中使用 `OR` | 可能导致索引失效 | 改写为 `UNION ALL` |
| 18 | `COUNT(column)` 代替 `COUNT(*)` | `COUNT(column)` 不统计 NULL | 需要统计行数用 `COUNT(*)` |
| 19 | JOIN 超过 5 张表 | 性能急剧下降 | 拆分查询，使用中间结果 |
| 20 | 使用 `ORDER BY` 无 LIMIT | 大表排序消耗大量内存 | 必须配合 LIMIT 分页 |

---

## 六、SQL 自检清单

### DDL 自检

```
建表语句检查：
  [ ] 文件头注释完整（表名、描述、作者、日期）
  [ ] ENGINE=InnoDB
  [ ] DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  [ ] 字段分组排列：主键 → 业务字段 → 公共字段 → 索引
  [ ] 所有字段有 COMMENT
  [ ] 表有 COMMENT
  [ ] 主键为 BIGINT + 雪花ID
  [ ] 金额字段使用 DECIMAL
  [ ] 状态/枚举字段使用 TINYINT + COMMENT
  [ ] 默认 NOT NULL，可空字段有理由
  [ ] 所有字段有合理的 DEFAULT 值
  [ ] 无物理外键约束
  [ ] 索引在建表后单独创建
  [ ] DDL 语法正确，可直接执行

变更语句检查：
  [ ] 变更脚本命名符合规范
  [ ] 新增列有 DEFAULT 值
  [ ] 删除列遵循三阶段流程（废弃 → 迁移 → 清理）
  [ ] 大表加索引使用在线工具
  [ ] DROP TABLE 先备份、先 RENAME 观察
  [ ] 有回滚方案
```

### DML 自检

```
INSERT 检查：
  [ ] 显式列出列名
  [ ] 批量插入每批不超过 500 条
  [ ] 使用参数化查询，禁止拼接 SQL

UPDATE 检查：
  [ ] 带 WHERE 条件
  [ ] WHERE 条件足够精确（包含主键或唯一键）
  [ ] 已确认影响行数
  [ ] 乐观锁字段（如有）已纳入条件

DELETE 检查：
  [ ] 优先使用逻辑删除（UPDATE deleted = 1）
  [ ] 物理删除已确认必要性
  [ ] 大表分批删除（LIMIT 1000）

SELECT 检查：
  [ ] 禁止 SELECT *，明确指定列名
  [ ] WHERE 条件无函数运算
  [ ] 无隐式类型转换
  [ ] 无前导 LIKE '%xxx'
  [ ] 业务表查询包含 deleted = 0
  [ ] JOIN 表数量不超过 5 张
  [ ] 关联字段类型一致
  [ ] 关联字段有索引
  [ ] ORDER BY 配合 LIMIT
  [ ] 使用 EXPLAIN 验证执行计划
```

### 安全自检

```
安全检查：
  [ ] 使用参数化查询（MyBatis #{} / PreparedStatement）
  [ ] 无字符串拼接 SQL
  [ ] ${} 仅用于结构化参数且有白名单校验
  [ ] 敏感数据（密码、手机号、身份证号）加密存储
  [ ] 应用账号权限最小化
  [ ] 生产环境关闭 SQL 日志打印
  [ ] API 层统一异常处理，不暴露数据库错误详情
```

# 数据类型设计规范

## 目录

- [一、字段类型选择指南](#一字段类型选择指南)
- [二、类型映射表](#二类型映射表)
- [三、金额和数值规范](#三金额和数值规范)
- [四、特殊场景处理](#四特殊场景处理)
- [五、字段类型自检清单](#五字段类型自检清单)

---

## 一、字段类型选择指南

### 1.1 整数类型（TINYINT / SMALLINT / INT / BIGINT）

整数类型的选择应基于**实际取值范围**，而非"越大越安全"的思维。

#### 选型决策树

```
预估最大值 ≤ 255？
  ├── 是 → TINYINT UNSIGNED 或 SIGNED
  │         TINYINT SIGNED: -128 ~ 127
  │         TINYINT UNSIGNED: 0 ~ 255
  ├── 否 → 预估最大值 ≤ 65535？
  │         ├── 是 → SMALLINT UNSIGNED 或 SIGNED
  │         ├── 否 → 预估最大值 ≤ 21亿？
  │                   ├── 是 → INT
  │                   ├── 否 → BIGINT
```

#### 选择标准

| 类型 | 存储大小 | 有符号范围 | 无符号范围 | 适用场景 |
|------|----------|------------|------------|----------|
| TINYINT | 1 字节 | -128 ~ 127 | 0 ~ 255 | 状态码、开关、性别、年龄（0-120） |
| SMALLINT | 2 字节 | -32768 ~ 32767 | 0 ~ 65535 | 年份（1000-9999）、数量（万级） |
| INT | 4 字节 | -21亿 ~ 21亿 | 0 ~ 42亿 | 常规 ID（非主键）、计数器 |
| BIGINT | 8 字节 | -922亿亿 ~ 922亿亿 | 0 ~ 1844亿亿 | 主键（雪花ID）、金额 |

#### 常见错误

```
错误示例：用户年龄用 INT
`age` INT NOT NULL DEFAULT 0 COMMENT '年龄'

正确做法：TINYINT 足够
`age` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '年龄（岁）'

错误示例：订单数量用 BIGINT
`order_count` BIGINT NOT NULL DEFAULT 0 COMMENT '订单数量'

正确做法：根据业务上限选择
`order_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '订单数量'
```

### 1.2 浮点类型：禁止使用 FLOAT / DOUBLE 存储金额

**铁律：任何涉及金额、汇率、精确计算的场景，必须使用 DECIMAL。**

#### 精度问题说明

```
FLOAT 和 DOUBLE 是近似值存储，存在精度丢失：

MySQL> SELECT SUM(0.1 + 0.2) = 0.3;
结果：0（但内部值是 0.30000000000000004，不是精确的 0.3）

MySQL> SELECT 123456789.012345 - 123456789.012344;
结果：0.000001（实际上可能差更多）
```

#### 正确与错误对比

```sql
-- 错误：使用 DOUBLE
`amount` DOUBLE(10,2) NOT NULL DEFAULT 0 COMMENT '金额（元）'

-- 正确：使用 DECIMAL
`amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '金额（元）'
```

**禁止场景：**
- 金额、余额、折扣、税率
- 汇率、利率、百分比计算
- 任何需要精确比较（等于/不等于）的数值

**适用场景（FLOAT/DOUBLE）：**
- 地理坐标（经纬度）：经度 -180~180，纬度 -90~90，精度损失可接受
- 科学计算、统计指标（允许误差）
- 监控数据、仪表读数

### 1.3 字符串类型（VARCHAR / CHAR / TEXT）

#### 选择决策树

```
字符串长度是否固定？
├── 是（如国家代码、性别代码、银行卡号前缀）→ CHAR
└── 否 → 预估最大长度？
          ├── ≤ 5000 字节？→ VARCHAR(预留20%-30%空间)
          ├── 5000 ~ 65535 字节？→ TEXT
          ├── 65536 ~ 16777215 字节？→ MEDIUMTEXT
          └── 16777216 ~ 4294967295 字节？→ LONGTEXT
```

#### VARCHAR 长度预留原则

**VARCHAR 长度必须预留 20%-30% 的扩展空间，但不能无限制放大。**

```
适用场景示例：

用户昵称：
├── 预估最大：20字符，中文占3字节
├── VARCHAR(20) → 实际 60字节，不够
├── VARCHAR(30) → 预留50%，合理
└── 最终：`nickname` VARCHAR(30) NOT NULL DEFAULT '' COMMENT '用户昵称'

手机号（中国大陆）：
├── 固定11位数字
├── VARCHAR(11) 足够，+30% = VARCHAR(15)
└── 最终：`phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号'

收货地址：
├── 预估最大：100字符，中文3字节
├── 100字符 → 300字节，+30% = 390
└── 最终：`address` VARCHAR(400) NOT NULL DEFAULT '' COMMENT '收货地址'
```

| 字段类型 | 预估长度 | 建议 VARCHAR 长度 | 备注 |
|----------|----------|-------------------|------|
| 手机号 | 11 | VARCHAR(20) | 含国际区号扩展 |
| 邮箱 | 50 | VARCHAR(100) | 含域名扩展 |
| 用户昵称 | 20 | VARCHAR(30) | 含特殊字符 |
| 姓名 | 10 | VARCHAR(30) | 含少数民族姓名 |
| 详细地址 | 100 | VARCHAR(400) | 含省市区详细 |
| 订单号 | 32 | VARCHAR(32) | 业务编号已固定长度 |
| UUID | 36 | VARCHAR(50) | 含连字符 |

#### TEXT 类型使用限制

**禁止场景：无限制使用 TEXT**

```
错误做法：
`content` TEXT NULL COMMENT '内容'
（没有长度限制，不知道边界）

正确做法1：预估最大长度
`description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '描述'

正确做法2：确实需要大文本时
`content` TEXT NULL COMMENT '文章内容（HTML格式，最大64KB）'
`agreement_text` MEDIUMTEXT NULL COMMENT '用户协议全文'
```

**适用 TEXT 的场景：**
- 富文本编辑器内容（HTML/Markdown）
- 用户协议、隐私政策全文
- 商品详情（富文本）
- 日志详情（操作日志的 request_params）

**TEXT 类型变体：**

| 类型 | 最大长度 | 字节 | 适用场景 |
|------|----------|------|----------|
| TINYTEXT | 255 字节 | 255 | 短信模板 |
| TEXT | 64KB | 65,535 | 文章摘要、评论 |
| MEDIUMTEXT | 16MB | 16,777,215 | 用户协议、隐私政策 |
| LONGTEXT | 4GB | 4,294,967,295 | 日志全文（几乎不用） |

### 1.4 日期时间类型（DATETIME vs TIMESTAMP）

#### 对比表

| 维度 | DATETIME | TIMESTAMP |
|------|----------|-----------|
| 存储大小 | 8 字节 | 4 字节 |
| 时区依赖 | 否（以字符串形式存储） | 是（自动转换UTC与本地时区） |
| 范围 | 1000-01-01 00:00:00 ~ 9999-12-31 23:59:59 | 1970-01-01 00:00:01 ~ 2038-01-19 03:14:07 |
| 自动更新 | 不支持 | `ON UPDATE CURRENT_TIMESTAMP` |
| 时区转换 | 不自动转换 | 自动转换（MySQL server 时区） |

#### 选择标准

**推荐：统一使用 DATETIME**

```
原因：
1. DATETIME 范围更大（支持历史数据，不受2038问题影响）
2. 业务时间通常是业务时间，不应随服务器时区变化
3. TIMESTAMP 在跨时区场景下容易产生歧义
```

**使用 TIMESTAMP 的场景：**
- 需要记录服务器绝对时间（不关心业务时区）
- 跨国业务，多个时区共用同一数据库
- 需要数据库自动维护 `ON UPDATE CURRENT_TIMESTAMP`

#### 常见字段命名与默认值

```sql
-- 创建时间：使用 DATETIME
`create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

-- 更新时间：使用 DATETIME + 自动更新
`update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

-- 精确到日期（不需要时间）
`birth_date` DATE NULL COMMENT '出生日期',

-- 精确到年月
`start_year_month` VARCHAR(7) NOT NULL DEFAULT '' COMMENT '开始年月（格式：YYYY-MM）',

-- 仅时间（较少用）
`alarm_time` TIME NULL COMMENT '闹钟时间',
```

### 1.5 JSON 类型使用场景和限制

#### 适用场景

JSON 类型用于**结构不固定、字段不确定**的扩展数据：

```sql
-- 商品的动态属性
`specs` JSON NULL COMMENT '商品规格（动态属性JSON）'
-- 值示例：{"color": "红色", "size": "XL", "weight": "500g"}

-- 流程表单的扩展字段
`form_data` JSON NULL COMMENT '表单数据（动态表单字段）'

-- 草稿数据（内容不确定）
`draft_content` JSON NULL COMMENT '草稿内容（富文本JSON）'
```

#### 限制

| 限制项 | 说明 |
|--------|------|
| 不能建索引 | JSON 字段内部无法直接建 B-Tree 索引 |
| 查询效率低 | JSON 内容查询 `column->>'$.key'` 效率低于预定义字段 |
| 磁盘占用高 | JSON 文本压缩效率低 |
| 类型不安全 | 无法在数据库层保证字段类型 |

#### 注意事项

```
错误做法：将结构化数据用 JSON 存储
`user_info` JSON NULL COMMENT '用户信息'
-- 值示例：{"name": "张三", "age": 30, "email": "zhangsan@example.com"}

正确做法：结构化字段
`name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '姓名',
`age` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '年龄',
`email` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '邮箱',
```

### 1.6 布尔类型处理（TINYINT(1) + COMMENT）

**MySQL 没有原生的 BOOLEAN 类型，实际上 TINYINT(1) 就是布尔类型。**

```sql
-- 标准布尔字段写法
`is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0-否，1-是',
`is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除：0-否，1-是',
`is_verified` TINYINT NOT NULL DEFAULT 0 COMMENT '是否认证：0-否，1-是',
`is_locked` TINYINT NOT NULL DEFAULT 0 COMMENT '是否锁定：0-否，1-是',

-- 不推荐：TINYINT(1)
-- TINYINT(1) 只是显示宽度为1，与 TINYINT 存储完全相同
-- 但 TINYINT(1) 在某些 ORM 工具中会被映射为 Boolean，容易产生歧义
```

**禁止场景：**
- 不要用 ENUM 类型表示布尔值
- 不要用 CHAR(1) 或 VARCHAR(1) 表示布尔值

---

## 二、类型映射表

### 2.1 MySQL 完整类型参考表

#### 数值类型

| 类型名 | 存储大小 | 有符号范围 | 无符号范围 | 适用场景 |
|--------|----------|------------|------------|----------|
| TINYINT | 1 字节 | -128 ~ 127 | 0 ~ 255 | 状态、开关、性别 |
| SMALLINT | 2 字节 | -32768 ~ 32767 | 0 ~ 65535 | 年份、数量（万级） |
| MEDIUMINT | 3 字节 | -8388608 ~ 8388607 | 0 ~ 16777215 | 中等数量 |
| INT | 4 字节 | -2147483648 ~ 2147483647 | 0 ~ 4294967295 | 常规整数、计数器 |
| BIGINT | 8 字节 | -9223372036854775808 ~ 9223372036854775807 | 0 ~ 18446744073709551615 | 主键、金额 |
| DECIMAL(p,s) | 变长 | — | — | 金额、精确数值 |
| FLOAT | 4 字节 | ±3.4E+38 | — | 科学计算（不推荐金额） |
| DOUBLE | 8 字节 | ±1.7E+308 | — | 科学计算（不推荐金额） |

#### 字符串类型

| 类型名 | 最大长度 | 适用场景 |
|--------|----------|----------|
| CHAR(n) | n 字符（0-255） | 固定长度（代码、性别码） |
| VARCHAR(n) | n 字符（0-16383） | 常规文本 |
| TINYTEXT | 255 字节 | 短文本 |
| TEXT | 64KB | 中等文本（文章、评论） |
| MEDIUMTEXT | 16MB | 长文本（用户协议） |
| LONGTEXT | 4GB | 超长文本 |

#### 日期时间类型

| 类型名 | 存储大小 | 范围 | 备注 |
|--------|----------|------|------|
| DATE | 3 字节 | 1000-01-01 ~ 9999-12-31 | 仅日期 |
| TIME | 3 字节 | -838:59:59 ~ 838:59:59 | 仅时间 |
| DATETIME | 8 字节 | 1000-01-01 00:00:00 ~ 9999-12-31 23:59:59 | 推荐使用 |
| TIMESTAMP | 4 字节 | 1970-01-01 ~ 2038-01-19 | 受2038问题限制 |
| YEAR | 1 字节 | 1901 ~ 2155 | 年份 |

### 2.2 PostgreSQL 类型对应关系

| MySQL 类型 | PostgreSQL 对应类型 | 备注 |
|------------|---------------------|------|
| BIGINT | BIGSERIAL（自增）或 BIGINT | 主键推荐 BIGSERIAL |
| INT | SERIAL 或 INTEGER | 主键推荐 SERIAL |
| TINYINT | SMALLINT 或 BOOLEAN | 布尔场景用 BOOLEAN |
| DECIMAL(12,2) | DECIMAL(12,2) 或 NUMERIC(12,2) | 完全一致 |
| VARCHAR(255) | VARCHAR(255) | 完全一致 |
| CHAR(10) | CHAR(10) | 完全一致 |
| TEXT | TEXT | 完全一致 |
| DATETIME | TIMESTAMP | PostgreSQL 推荐 TIMESTAMP |
| TIMESTAMP | TIMESTAMP | MySQL TIMESTAMP 转为 TIMESTAMP |
| JSON | JSONB（推荐）或 JSON | JSONB 有索引支持 |
| UUID | UUID | 原生支持 |
| BOOLEAN | BOOLEAN | PostgreSQL 有原生布尔类型 |

**PostgreSQL 特殊注意事项：**

```sql
-- PostgreSQL 主键推荐使用 BIGSERIAL（自增序列）
CREATE TABLE example (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- PostgreSQL JSON 推荐用 JSONB（支持索引）
`extra_data` JSONB NULL COMMENT '扩展数据（JSONB格式，支持索引）'

-- PostgreSQL UUID 原生支持
`uuid` UUID NOT NULL DEFAULT gen_random_uuid() COMMENT 'UUID',
```

### 2.3 Oracle 迁移类型对应关系

| MySQL 类型 | Oracle 对应类型 | 备注 |
|------------|-----------------|------|
| BIGINT | NUMBER(19,0) | 雪花ID范围 |
| INT | NUMBER(10,0) | 常规整数 |
| SMALLINT | NUMBER(5,0) | 小整数 |
| TINYINT | NUMBER(3,0) | 字节级整数 |
| DECIMAL(12,2) | NUMBER(12,2) | 金额 |
| VARCHAR(255) | VARCHAR2(255) | 字符串 |
| CHAR(10) | CHAR(10) | 定长字符串 |
| TEXT | CLOB | 大文本 |
| DATETIME | TIMESTAMP(0) | 时间戳 |
| DATE | DATE | 日期 |
| JSON | CLOB 或 JSON | Oracle 12c+ 支持 JSON |

**Oracle 迁移注意事项：**

```sql
-- Oracle 的 NULL 和空字符串是同一个概念，需要注意
-- MySQL: '' 和 NULL 是两个不同的值
-- Oracle: '' 被自动转为 NULL

-- Oracle 金额字段
`amount` NUMBER(12,2) NOT NULL DEFAULT 0 COMMENT '金额（元）'

-- Oracle 大字段
`content` CLOB COMMENT '内容',

-- Oracle 时间戳
`create_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
```

---

## 三、金额和数值规范

### 3.1 DECIMAL 精度选择规则

#### 规则一：总位数 = 整数位数 + 小数位数

```
示例：
DECIMAL(12,2) — 总12位，其中2位小数，10位整数
DECIMAL(10,4) — 总10位，其中4位小数，6位整数
DECIMAL(5,2)  — 总5位，其中2位小数，3位整数（最大值：999.99）
```

#### 规则二：整数位数决定能表示的最大值

```
DECIMAL(p,s) 的整数位数 = p - s
整数部分能表示的最大值 = 10^(p-s) - 1

示例：
DECIMAL(12,2) → 整数10位 → 最大 9999999999.99（约99亿）
DECIMAL(10,4) → 整数6位  → 最大 999999.9999（约100万）
DECIMAL(5,2)  → 整数3位  → 最大 999.99
```

#### 规则三：根据业务场景确定精度

| 业务场景 | 推荐精度 | 说明 |
|----------|----------|------|
| 订单金额（元） | DECIMAL(12,2) | 最大约99亿，覆盖绝大多数场景 |
| 订单金额（分） | DECIMAL(14,2) | 以分为单位，最大约9999亿 |
| 单价（元） | DECIMAL(10,4) | 支持4位小数，用于高精密商品 |
| 折扣率 | DECIMAL(5,4) | 0.0000 ~ 1.0000 |
| 税率 | DECIMAL(5,4) | 0.0000 ~ 1.0000（最高99.99%） |
| 百分比 | DECIMAL(5,2) | 0.00% ~ 999.99% |
| 数量 | DECIMAL(10,4) | 支持小数数量（如称重商品） |
| 经度/纬度 | DECIMAL(10,7) | 精度约0.0000001度 |
| 体重（kg） | DECIMAL(6,2) | 0.00 ~ 9999.99 |
| 身高（cm） | DECIMAL(5,1) | 0.0 ~ 999.9 |

### 3.2 金额字段标准模板

#### 订单金额体系

```sql
-- 标准订单金额字段（以元为单位，精确到分）
`total_amount`    DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '商品总金额（元）',
`discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '优惠金额（元）',
`freight_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '运费（元）',
`tax_amount`      DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '税额（元）',
`pay_amount`      DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '实付金额（元）',
`refund_amount`   DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '退款金额（元）',
`balance_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '余额变动（元）',
```

#### 账户余额体系

```sql
-- 用户/商户账户余额
`balance`         DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '账户余额（元）',
`frozen_amount`   DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '冻结金额（元）',
`total_income`    DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '累计收入（元）',
`total_expense`  DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '累计支出（元）',
```

#### 金融费率体系

```sql
-- 费率相关
`interest_rate`   DECIMAL(8,6) NOT NULL DEFAULT 0 COMMENT '利率（如0.052500表示5.25%）',
`penalty_rate`    DECIMAL(8,6) NOT NULL DEFAULT 0 COMMENT '罚息利率',
`service_fee_rate` DECIMAL(5,4) NOT NULL DEFAULT 1 COMMENT '服务费率（0.0000-1.0000）',
```

---

## 四、特殊场景处理

### 4.1 大文本字段策略

#### 选择依据

| 类型 | 最大字节 | 适用场景 |
|------|----------|----------|
| VARCHAR(500) | 500 | 常规描述、备注 |
| TEXT | 64KB | 文章、评论、动态内容 |
| MEDIUMTEXT | 16MB | 用户协议、隐私政策、帮助文档 |
| LONGTEXT | 4GB | 几乎不用，除非存储大型文档 |

#### 分离存储考虑

**对于大型文本（>100KB），考虑分离存储：**

```
方案A：直接存储（推荐小中型文本）
- 优点：简单，事务一致性
- 缺点：影响表查询性能，大字段读取慢

方案B：分离存储（推荐大型文本、文件）
- 字段：content_id（关联到大文本表）
- 大文本表：id, content(TEXT/MEDIUMTEXT), size, md5, create_time
- 优点：主表查询快，灵活存储
- 缺点：多一次关联查询
```

```sql
-- 方案B示例：文章内容分离存储
-- 主表
CREATE TABLE biz_article (
    `id`          BIGINT NOT NULL COMMENT '主键',
    `title`       VARCHAR(200) NOT NULL DEFAULT '' COMMENT '标题',
    `content_id`  BIGINT NULL COMMENT '正文ID（关联text_storage表）',
    -- 其他字段...
    PRIMARY KEY (`id`),
    KEY `idx_article_content_id` (`content_id`)
) COMMENT='文章';

-- 大文本存储表
CREATE TABLE sys_text_storage (
    `id`          BIGINT NOT NULL COMMENT '主键',
    `content`     MEDIUMTEXT NOT NULL COMMENT '文本内容',
    `size`        INT NOT NULL DEFAULT 0 COMMENT '字节数',
    `md5`         VARCHAR(32) NOT NULL DEFAULT '' COMMENT 'MD5校验',
    `create_time`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`)
) COMMENT='大文本存储表';
```

### 4.2 IP 地址存储

#### 方案对比

| 方案 | 字段类型 | 优点 | 缺点 |
|------|----------|------|------|
| VARCHAR(15) | IPv4 字符串 | 直观，可读性好 | 占用大，无法计算 |
| VARCHAR(45) | IPv4/IPv6 字符串 | 兼容IPv6 | 占用大，无法计算 |
| INT UNSIGNED | IPv4 数值 | 节省空间，可计算范围 | 不直观，需转换 |
| VARBINARY(16) | IPv4/IPv6 数值 | 节省空间，兼容双协议 | 需要转换函数 |

#### 推荐方案

```sql
-- 方案A：VARCHAR（直观优先，推荐）
`ip` VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'IP地址',
-- 支持 IPv4: "192.168.1.1"
-- 支持 IPv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334"

-- 方案B：数值存储（计算优先，用于日志分析）
`ip` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'IP地址（数值形式）',
-- 存储时：INET_ATON('192.168.1.1') = 3232235777
-- 读取时：INET_NTOA(3232235777) = '192.168.1.1'
-- 优点：可计算 IP 段范围，索引效率高

-- 方案C：双字段（同时需要可读性和计算）
`ip` VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'IP地址',
`ip_numeric` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'IP地址（数值，用于范围查询）',
```

### 4.3 枚举值处理（禁止 ENUM）

**MySQL ENUM 类型存在严重缺陷，禁止使用。**

```
ENUM 的问题：
1. 修改枚举值需要 ALTER TABLE（高并发下锁表）
2. 数字意义不直观：ENUM('a','b','c') 实际存 1,2,3
3. 与 ORM 映射复杂
4. 空字符串 '' 被映射为 0，与 NULL 行为混淆
5. 不符合 SQL 标准
```

**正确做法：TINYINT/SMALLINT + COMMENT**

```sql
-- 订单状态
`order_status` TINYINT NOT NULL DEFAULT 0
COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消，5-退款中，6-已退款',

-- 支付方式
`pay_method` TINYINT NOT NULL DEFAULT 0
COMMENT '支付方式：0-未支付，1-微信支付，2-支付宝，3-银行卡，4-余额，5-积分',

-- 性别
`gender` TINYINT NOT NULL DEFAULT 0
COMMENT '性别：0-未知，1-男，2-女',

-- 用户类型
`user_type` TINYINT NOT NULL DEFAULT 1
COMMENT '用户类型：1-普通用户，2-VIP用户，3-企业用户',
```

### 4.4 UUID / 雪花 ID 存储策略

#### 方案对比

| 维度 | 雪花ID (BIGINT) | UUID (VARCHAR) | UUID (BINARY) |
|------|-----------------|----------------|---------------|
| 存储大小 | 8 字节 | 36 字节 | 16 字节 |
| 可读性 | 数字，可猜含义 | 字符串，完全无意义 | 二进制，无意义 |
| 有序性 | 有序（时间顺序） | 无序（随机插入） | 无序 |
| 性能 | 索引效率高 | 索引效率低 | 索引效率中等 |
| 分布式 | 原生支持 | 需自定义 | 需自定义 |

#### 推荐策略

```sql
-- 推荐：雪花ID（主键默认）
`id` BIGINT NOT NULL COMMENT '主键（雪花ID）',

-- 需要 UUID 的场景（如外部系统对接）
`uuid` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '第三方系统UUID',
-- 注意：不要用无索引的 VARCHAR 作为主键或唯一约束（性能差）

-- 如果必须用 UUID，推荐 BINARY(16)
`uuid` BINARY(16) NOT NULL COMMENT 'UUID（二进制存储）',
-- 生成：UUID_TO_BIN(UUID())
-- 读取：BIN_TO_UUID(uuid)
```

### 4.5 软删除字段设计

```sql
-- 标准软删除字段（必用 TINYINT）
`deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-已删除',

-- 软删除 + 删除时间（需要知道何时删除）
`deleted`       TINYINT   NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-已删除',
`deleted_at`    DATETIME  NULL COMMENT '删除时间',
`deleted_by`    BIGINT    NOT NULL DEFAULT 0 COMMENT '删除人ID',

-- 软删除 + 回收站（多状态）
`deleted` TINYINT NOT NULL DEFAULT 0
COMMENT '删除状态：0-正常，1-放入回收站，2-永久删除',
```

### 4.6 多租户字段设计

```sql
-- 简单多租户：只加 tenant_id
`tenant_id` BIGINT NOT NULL DEFAULT 0 COMMENT '租户ID',

-- 复杂多租户：租户 + 数据隔离级别
`tenant_id`      BIGINT   NOT NULL DEFAULT 0 COMMENT '租户ID',
`data_scope`     TINYINT  NOT NULL DEFAULT 1 COMMENT '数据范围：1-全部，2-本部门，3-仅本人',

-- 索引策略
KEY `idx_tenant_id` (`tenant_id`)
-- 注意：所有查询必须带上 tenant_id 条件
```

### 4.7 审计字段标准组合

```sql
-- 基础审计（所有表推荐）
`created_by` BIGINT   NOT NULL DEFAULT 0 COMMENT '创建人ID',
`updated_by` BIGINT   NOT NULL DEFAULT 0 COMMENT '更新人ID',
`create_time` DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
`update_time` DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

-- 完整审计（敏感数据表）
`created_by`    BIGINT   NOT NULL DEFAULT 0 COMMENT '创建人ID',
`created_by_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '创建人姓名',
`updated_by`   BIGINT   NOT NULL DEFAULT 0 COMMENT '更新人ID',
`updated_by_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '更新人姓名',
`create_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
`update_time`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
`created_ip`   VARCHAR(50) NOT NULL DEFAULT '' COMMENT '创建IP',
`updated_ip`   VARCHAR(50) NOT NULL DEFAULT '' COMMENT '更新IP',
```

### 4.8 地理坐标存储

```sql
-- 方案A：经纬度分离（推荐，适合大多数场景）
`latitude`  DECIMAL(10,7) NOT NULL DEFAULT 0 COMMENT '纬度（-90.0000000 ~ 90.0000000）',
`longitude`  DECIMAL(11,7) NOT NULL DEFAULT 0 COMMENT '经度（-180.0000000 ~ 180.0000000）',

-- 方案B：MySQL 空间类型（适合 GIS 查询）
`location` POINT NOT NULL COMMENT '地理坐标（纬度,经度）',
SPATIAL INDEX `idx_location` (`location`),

-- 方案C：GeoJSON 格式（适合复杂地理数据）
`geo_json` JSON NULL COMMENT '地理数据（GeoJSON格式）',
```

---

## 五、字段类型自检清单

### 新建表时逐项检查

```
整数类型检查：
  [ ] 状态字段使用 TINYINT（非 INT/BIGINT）
  [ ] 数量字段有明确上限，选择合适的大小
  [ ] 主键使用 BIGINT（雪花ID）

浮点类型检查：
  [ ] 金额字段使用 DECIMAL（非 FLOAT/DOUBLE）
  [ ] 精确计算字段使用 DECIMAL（非 FLOAT/DOUBLE）

字符串类型检查：
  [ ] VARCHAR 有明确长度（非无限制）
  [ ] VARCHAR 长度预留了 20%-30% 扩展空间
  [ ] 固定长度字段使用 CHAR（非 VARCHAR）
  [ ] 大文本字段有明确的类型选择（TEXT/MEDIUMTEXT）
  [ ] 没有无 COMMENT 的 TEXT 字段

日期时间类型检查：
  [ ] 业务时间使用 DATETIME（非 TIMESTAMP）
  [ ] 不需要时间的场景使用 DATE（非 DATETIME）
  [ ] 时间字段有 DEFAULT 或自动更新

JSON 类型检查：
  [ ] JSON 用于真正的动态字段（非结构化数据）
  [ ] 结构化数据有预定义字段（非 JSON）

布尔类型检查：
  [ ] 布尔字段使用 TINYINT + COMMENT（非 ENUM/CHAR(1)）
  [ ] COMMENT 明确列举了 0/1 的含义

枚举类型检查：
  [ ] 没有使用 MySQL ENUM 类型
  [ ] 枚举字段使用 TINYINT + COMMENT

金额字段检查：
  [ ] 所有金额字段使用 DECIMAL
  [ ] DECIMAL 精度选择合理（总位数和小数位数）
  [ ] 金额字段有 NOT NULL 和 DEFAULT 0
```

### 类型选择决策速查

| 场景 | 推荐类型 | 禁止类型 |
|------|----------|----------|
| 主键 | BIGINT | INT + AUTO_INCREMENT |
| 金额/余额 | DECIMAL(12,2) | FLOAT, DOUBLE |
| 百分比/折扣 | DECIMAL(5,4) | FLOAT, DOUBLE |
| 状态码 | TINYINT | ENUM, CHAR |
| 开关/布尔 | TINYINT | VARCHAR, ENUM |
| 手机号 | VARCHAR(20) | INT, BIGINT |
| 邮箱 | VARCHAR(100) | TEXT |
| 姓名 | VARCHAR(30) | TEXT |
| 固定编码 | CHAR | VARCHAR |
| 文章内容 | TEXT | VARCHAR(65535) |
| 创建时间 | DATETIME | TIMESTAMP |
| 日期 | DATE | DATETIME |
| IP地址 | VARCHAR(50) | TEXT |
| 经纬度 | DECIMAL(10,7) | FLOAT, DOUBLE |
| 动态属性 | JSON | 多个预定义字段 |
| UUID | VARCHAR(50) | TEXT（无长度） |

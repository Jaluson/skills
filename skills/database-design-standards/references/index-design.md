# 数据库索引设计规范

## 目录

- [一、索引基础](#一索引基础)
- [二、索引类型与选择](#二索引类型与选择)
- [三、联合索引设计（重点）](#三联合索引设计重点)
- [四、索引命名规范](#四索引命名规范)
- [五、必须加索引的场景](#五必须加索引的场景)
- [六、不建议加索引的场景](#六不建议加索引的场景)
- [七、冗余索引检测](#七冗余索引检测)
- [八、索引设计自检清单](#八索引设计自检清单)

---

## 一、索引基础

### B+Tree 索引原理

InnoDB 存储引擎使用 B+Tree 作为索引结构，其特点如下：

| 特性 | 说明 |
|------|------|
| 高度平衡 | 所有叶子节点在同一层级，查询路径长度一致 |
| 叶子节点链表 | 叶子节点之间通过双向链表连接，范围查询高效 |
| 磁盘友好 | 每个节点为一个数据页（默认 16KB），减少磁盘 IO |
| 非叶子节点仅存索引 | 非叶子节点只存储索引键和指针，不存储数据 |

```
B+Tree 结构示意：
                          [根节点]
                        /    |    \
              [内节点] [内节点] [内节点]
                 |       |       |
           [叶子节点] ... [叶子节点] ...
                 |               |
              数据页            数据页
```

**为什么 MySQL 选择 B+Tree：**
- 相比 B-Tree：B+Tree 非叶子节点不存储数据，每个节点能容纳更多索引，树的层高更矮
- 相比 Hash：B+Tree 支持范围查询和排序，而 Hash 只支持等值查询
- 相比二叉树：B+Tree 度更高，树层数更少，避免深度查询

### 索引的优点

| 优点 | 说明 |
|------|------|
| 加速查询 | 将全表扫描 O(n) 降低到 O(log n) |
| 加速排序 | 索引本身有序，ORDER BY 可直接使用，无需额外排序 |
| 加速分组 | GROUP BY 可利用索引的有序性 |
| 唯一性保证 | 唯一索引保证数据唯一性 |

### 索引的代价

| 代价 | 说明 |
|------|------|
| 写入性能下降 | 每次 INSERT/UPDATE/DELETE 需要维护索引结构 |
| 存储空间增加 | 索引占用额外磁盘空间，通常为数据大小的 20%-30% |
| 维护成本 | 数据变更时需同步更新索引 |

### MySQL InnoDB 索引特性

#### 聚簇索引（Clustered Index）

InnoDB 表中，数据行按主键顺序存储，聚簇索引即是主键索引。

```
特点：
├── 表数据文件本身就是 B+Tree 结构
├── 叶子节点存储完整的行数据（用户记录）
├── 每个 InnoDB 表必须有且只有一个聚簇索引
└── 建议使用与业务无关的自增 ID 或雪花 ID 作为主键
```

**为什么推荐使用雪花ID而非业务主键作为聚簇索引：**
- 业务主键（如身份证号、手机号）长度不固定，影响 B+Tree 节点可容纳的索引数量
- 业务主键可能不单调递增，导致页分裂和碎片化
- 雪花ID单调递增，插入时顺序写入，减少页分裂

```sql
-- 正确：使用雪花ID作为主键
CREATE TABLE biz_order (
    `id`          BIGINT        NOT NULL COMMENT '主键（雪花ID）',
    `order_no`    VARCHAR(32)   NOT NULL DEFAULT '' COMMENT '订单编号',
    -- 其他字段...
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`)
) COMMENT='订单主表';

-- 不推荐：使用业务字段作为主键
CREATE TABLE biz_user (
    `id_card_no` VARCHAR(18) NOT NULL COMMENT '身份证号',
    `name`       VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '姓名',
    PRIMARY KEY (`id_card_no`)  -- 业务主键作为聚簇索引
);
```

#### 二级索引（Secondary Index）

除主键索引外的所有索引都是二级索引（也称辅助索引）。

```
特点：
├── 叶子节点存储：索引列值 + 主键值
├── 查询流程：先在二级索引中查到主键，再回表查询聚簇索引获取完整数据
└── 回表次数 = 查询到的记录数
```

**示例：**
```sql
CREATE TABLE biz_order (
    `id`         BIGINT        NOT NULL COMMENT '主键（雪花ID）',
    `order_no`   VARCHAR(32)   NOT NULL DEFAULT '' COMMENT '订单编号',
    `user_id`    BIGINT        NOT NULL DEFAULT 0 COMMENT '用户ID',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),        -- 二级索引：order_no
    KEY `idx_user_id` (`user_id`)                  -- 二级索引：user_id
);

-- 查询：SELECT * FROM biz_order WHERE order_no = 'A001';
-- 流程：uk_order_no 二级索引 → 命中 → 直接获取数据（无需回表，因为覆盖了所有字段）

-- 查询：SELECT * FROM biz_order WHERE user_id = 100;
-- 流程：idx_user_id 二级索引 → 查到主键列表 → 回表查询聚簇索引 → 返回数据
```

#### 回表查询

回表是指从二级索引查到主键后，需要再通过主键回表查询完整数据的过程。

```
回表流程：
1. 在二级索引树中查找，得到主键值
2. 使用主键值在聚簇索引中查找，得到完整行数据
3. 返回结果

优化方式：使用覆盖索引，避免回表
```

---

## 二、索引类型与选择

### 主键索引设计原则

| 原则 | 说明 |
|------|------|
| 必须唯一 | 主键值必须唯一标识每行记录 |
| 必须非空 | 主键字段必须 NOT NULL |
| 推荐自增 | 推荐使用单调递增的 ID，减少页分裂 |
| 推荐 BIGINT | 使用 BIGINT 存储雪花ID，避免自增INT溢出 |
| 禁止业务含义 | 主键不应包含业务含义，避免业务变更导致主键修改 |

```sql
-- 标准主键设计
`id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
PRIMARY KEY (`id`)

-- 禁止：自增主键
`id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',  -- 禁止
PRIMARY KEY (`id`)

-- 禁止：复合主键
PRIMARY KEY (`user_id`, `order_no`)  -- 禁止，优先使用单列主键
```

### 唯一索引使用场景

唯一索引用于保证字段或字段组合的唯一性。

| 使用场景 | 说明 |
|----------|------|
| 业务编号 | 订单号、合同号、用户编号等必须唯一的字段 |
| 登录凭证 | 用户名、手机号、邮箱等登录标识 |
| 组合唯一 | 多字段组合的唯一约束，如 (user_id, role_id) |
| 外键关联 | 确保关联数据的唯一性 |

```sql
-- 单字段唯一索引
CREATE TABLE sys_user (
    `id`        BIGINT       NOT NULL COMMENT '主键',
    `username`  VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '用户名',
    `phone`     VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '手机号',
    `email`     VARCHAR(100) NOT NULL DEFAULT '' COMMENT '邮箱',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_username` (`username`),  -- 用户名唯一
    UNIQUE KEY `uk_user_phone` (`phone`),        -- 手机号唯一
    UNIQUE KEY `uk_user_email` (`email`)         -- 邮箱唯一
) COMMENT='用户表';

-- 联合唯一索引
CREATE TABLE rel_user_role (
    `id`      BIGINT NOT NULL COMMENT '主键',
    `user_id` BIGINT NOT NULL DEFAULT 0 COMMENT '用户ID',
    `role_id` BIGINT NOT NULL DEFAULT 0 COMMENT '角色ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)  -- 联合唯一，防止重复授权
) COMMENT='用户-角色关联';

-- 唯一索引 vs 主键索引
-- 相同点：都保证唯一性
-- 不同点：
--   - 主键：聚簇索引，一张表只能有一个
--   - 唯一：二级索引，一张表可以有多个
--   - 主键不允许为空，唯一索引允许单字段为空（但组合唯一时整体可为空）
```

### 普通索引使用场景

普通索引是最常见的索引类型，用于加速普通查询。

| 使用场景 | 说明 |
|----------|------|
| 外键字段 | 经常作为 JOIN 条件的字段 |
| WHERE 条件 | 经常出现在 WHERE 子句中的字段 |
| ORDER BY | 经常需要排序的字段 |
| GROUP BY | 经常需要分组的字段 |
| 高频查询 | 查询频率高但不需要唯一性的字段 |

```sql
CREATE TABLE biz_order (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `user_id`     BIGINT       NOT NULL DEFAULT 0 COMMENT '用户ID',
    `order_status` TINYINT     NOT NULL DEFAULT 0 COMMENT '订单状态',
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
    `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    -- 外键字段索引：加速用户维度的订单查询
    KEY `idx_order_user_id` (`user_id`),
    -- 状态+时间联合索引：加速状态筛选和时间范围查询
    KEY `idx_order_status_created` (`order_status`, `created_at`)
) COMMENT='订单主表';
```

### 全文索引使用场景

全文索引用于对文本内容进行全文搜索，适用于 CHAR、VARCHAR、TEXT 类型的字段。

| 使用场景 | 说明 |
|----------|------|
| 文章搜索 | 文章标题、内容的关键字搜索 |
| 商品搜索 | 商品名称、描述的关键字搜索 |
| 评论搜索 | 用户评论的内容搜索 |
| 注意事项 | 全文索引不支持中文，需配合中文分词器（如 MySQL 8.0 的 ngram） |

```sql
-- 创建全文索引
CREATE TABLE biz_article (
    `id`       BIGINT       NOT NULL COMMENT '主键',
    `title`    VARCHAR(200) NOT NULL DEFAULT '' COMMENT '文章标题',
    `content`  TEXT         NOT NULL COMMENT '文章内容',
    PRIMARY KEY (`id`),
    FULLTEXT KEY `ft_article_title_content` (`title`, `content`)
) COMMENT='文章表';

-- 使用全文索引查询
SELECT * FROM biz_article
WHERE MATCH(title, content) AGAINST('关键词' IN NATURAL LANGUAGE MODE);

-- 注意：MySQL 5.7 及以下版本不支持中文全文索引
-- 解决方案：使用外部中文分词服务，或升级到 MySQL 8.0 + ngram 插件
```

### 联合索引 vs 多个单列索引

| 对比项 | 联合索引 | 多个单列索引 |
|--------|----------|--------------|
| 查询覆盖 | 可覆盖多字段组合查询 | 只能覆盖单字段查询 |
| 索引数量 | 一个 | 多个 |
| 维护成本 | 较低（只需维护一个索引） | 较高（需维护多个索引） |
| 查询优化器 | 更易选择最优索引 | 可能选择错误的索引 |
| 适用场景 | 多字段组合查询、等值+范围组合 | 单字段高频独立查询 |

```sql
-- 场景：用户表，按 (name, age, city) 进行查询
-- 查询类型：WHERE name = ? AND age = ? AND city = ?

-- 方案A：三个单列索引
KEY `idx_name` (`name`),
KEY `idx_age` (`age`),
KEY `idx_city` (`city`)
-- 问题：查询优化器可能选择错误的索引，效率不稳定

-- 方案B：一个联合索引
KEY `idx_user_name_age_city` (`name`, `age`, `city`)
-- 优点：索引覆盖查询，效率稳定，无需回表

-- 结论：对于多字段组合的等值查询，优先使用联合索引
```

---

## 三、联合索引设计（重点）

### 最左前缀原则

最左前缀原则是指联合索引从最左边的字段开始匹配，依次向右延伸。

```
联合索引结构：(A, B, C)
├── 支持：A = ?               -- 使用索引前导列
├── 支持：A = ? AND B = ?      -- 使用索引前两列
├── 支持：A = ? AND B = ? AND C = ?  -- 使用全部索引列
├── 不支持：B = ?             -- 跳过前导列，无法使用索引
├── 不支持：C = ?             -- 跳过前导列，无法使用索引
└── 不支持：B = ? AND C = ?   -- 跳过前导列，无法使用索引
```

**示例：**
```sql
CREATE TABLE biz_order (
    `id`           BIGINT       NOT NULL COMMENT '主键',
    `order_status` TINYINT      NOT NULL DEFAULT 0 COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成',
    `user_id`      BIGINT       NOT NULL DEFAULT 0 COMMENT '用户ID',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_order_user_status_created` (`user_id`, `order_status`, `created_at`)
) COMMENT='订单主表';

-- 以下查询可以使用索引：
SELECT * FROM biz_order WHERE user_id = 100;
-- 等价于：使用了索引前缀 (user_id)

SELECT * FROM biz_order WHERE user_id = 100 AND order_status = 1;
-- 等价于：使用了索引前缀 (user_id, order_status)

SELECT * FROM biz_order WHERE user_id = 100 AND order_status = 1 AND created_at > '2026-01-01';
-- 等价于：使用了全部索引

-- 以下查询无法使用索引：
SELECT * FROM biz_order WHERE order_status = 1;
-- 无法使用索引（跳过前导列 user_id）

SELECT * FROM biz_order WHERE created_at > '2026-01-01';
-- 无法使用索引（跳过前导列 user_id, order_status）

SELECT * FROM biz_order WHERE user_id > 100;
-- 部分使用索引（范围查询后的列无法使用）
```

### 联合索引列顺序决策树

设计联合索引时，应根据以下决策树确定列顺序：

```
决策树：
1. 该字段是否有等值查询（= / IN）？
   └── 是 → 优先放置
   └── 否 → 放置在范围查询列之后

2. 该字段的区分度如何？
   └── 区分度高（唯一值多）→ 优先放置
   └── 区分度低（枚举值少）→ 靠后放置

3. 是否存在覆盖查询需求？
   └── 是 → 将高频查询字段纳入联合索引
   └── 否 → 优先考虑前两条
```

#### 决策原则详解

**原则一：等值查询列在前，范围查询列在后**

```sql
-- 查询场景：
-- WHERE user_id = ? AND order_status = ? AND created_at > ?

-- 正确顺序：user_id（等值）→ order_status（等值）→ created_at（范围）
KEY `idx_order_user_status_created` (`user_id`, `order_status`, `created_at`)

-- 错误顺序（范围在前）
KEY `idx_order_bad` (`created_at`, `user_id`, `order_status`)
-- 后果：created_at 的范围查询导致后续列无法使用索引
```

**原则二：区分度高的列在前**

```sql
-- 查询场景：WHERE phone = ? AND user_id = ?

-- 字段区分度：
-- phone：几乎唯一（每人一个手机号），区分度 ≈ 100%
-- user_id：雪花ID，无业务含义，区分度 ≈ 100%

-- 但如果 user_id 只用于关联，phone 是登录条件：
-- phone 区分度更高，应放在前面
KEY `idx_user_phone_id` (`phone`, `user_id`)

-- 不建议的顺序：
KEY `idx_user_bad` (`user_id`, `phone`)  -- user_id 在前，但 phone 才是查询条件
```

**原则三：覆盖查询优先**

```sql
-- 查询场景：经常需要查询 user_id, order_status, created_at
-- 如果这三个字段已经组成联合索引，查询可以直接从索引中获取数据，无需回表

-- 覆盖索引设计
KEY `idx_order_user_status_created` (`user_id`, `order_status`, `created_at`)

-- 覆盖查询示例
SELECT user_id, order_status, created_at
FROM biz_order
WHERE user_id = 100 AND order_status = 1;
-- 只需扫描索引，无需回表，性能最优
```

#### 联合索引设计案例

**案例一：用户订单查询**

```sql
-- 业务需求：
-- 1. 查询某用户的订单列表（WHERE user_id = ?）
-- 2. 按状态筛选订单（WHERE order_status IN ?）
-- 3. 按创建时间排序（ORDER BY created_at DESC）
-- 4. 分页查询

-- 索引设计：
-- 核心查询条件：user_id（等值）
-- 排序字段：created_at
-- 筛选字段：order_status（多值）

-- 推荐索引
KEY `idx_order_user_created` (`user_id`, `created_at`)

-- 为什么不包含 order_status？
-- 因为 order_status 使用 IN 查询（多值），区分度低，且用户主要按时间查看订单

-- 如果需要按状态筛选的优化
KEY `idx_order_user_status_created` (`user_id`, `order_status`, `created_at`)
-- 适用于状态筛选频率较高的场景
```

**案例二：商品多维检索**

```sql
CREATE TABLE biz_product (
    `id`           BIGINT       NOT NULL COMMENT '主键',
    `category_id`  BIGINT       NOT NULL DEFAULT 0 COMMENT '分类ID',
    `brand_id`     BIGINT       NOT NULL DEFAULT 0 COMMENT '品牌ID',
    `price`        DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '价格',
    `sales_count`  INT          NOT NULL DEFAULT 0 COMMENT '销量',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    -- 分类+品牌+价格（用于价格范围筛选）
    KEY `idx_product_cat_brand_price` (`category_id`, `brand_id`, `price`),
    -- 分类+销量（用于销量排序筛选）
    KEY `idx_product_cat_sales` (`category_id`, `sales_count`)
) COMMENT='商品表';

-- 查询示例
SELECT * FROM biz_product
WHERE category_id = 1 AND brand_id = 2 AND price BETWEEN 100 AND 500
ORDER BY price DESC;
-- 使用索引：idx_product_cat_brand_price

SELECT * FROM biz_product
WHERE category_id = 1 AND sales_count > 1000
ORDER BY sales_count DESC;
-- 使用索引：idx_product_cat_sales
```

### 覆盖索引（Covering Index）

覆盖索引是指查询的所有字段都包含在索引中，无需回表即可完成查询。

```
覆盖索引原理：
├── 普通索引查询：索引树 → 回表 → 获取完整数据
└── 覆盖索引查询：索引树 → 直接返回结果（无需回表）

覆盖索引条件：
查询字段必须在索引中（SELECT 字段 ⊆ 索引字段）
```

**覆盖索引示例：**
```sql
CREATE TABLE biz_order (
    `id`          BIGINT       NOT NULL COMMENT '主键（雪花ID）',
    `order_no`    VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '订单编号',
    `user_id`     BIGINT       NOT NULL DEFAULT 0 COMMENT '用户ID',
    `order_status` TINYINT     NOT NULL DEFAULT 0 COMMENT '订单状态',
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
    `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    -- 覆盖索引：覆盖了查询所需的所有字段
    KEY `idx_order_user_status_amount` (`user_id`, `order_status`, `total_amount`)
) COMMENT='订单主表';

-- 覆盖查询：无需回表
SELECT user_id, order_status, total_amount
FROM biz_order
WHERE user_id = 100 AND order_status = 1;
-- 执行计划显示：Using index（使用了覆盖索引，无需回表）

-- 非覆盖查询：需要回表
SELECT *
FROM biz_order
WHERE user_id = 100 AND order_status = 1;
-- 执行计划显示：Using index condition（使用了索引，但需要回表）
```

**覆盖索引设计技巧：**
- 将高频查询的字段纳入联合索引
- 区分度高的字段放在前面
- 字段顺序与查询条件一致

### 索引下推（ICP - Index Condition Pushdown）

索引下推是 MySQL 5.6+ 的优化特性，在联合索引执行过程中提前过滤数据，减少回表次数。

```
ICP 原理：
├── 未使用 ICP：索引过滤 → 回表 → WHERE 条件过滤
└── 使用 ICP：索引过滤（包括 WHERE 条件）→ 回表（已过滤后的数据）

适用条件：
1. 使用联合索引
2. WHERE 条件包含索引列（但不是前导列的等值查询）
```

**ICP 示例：**
```sql
-- 索引：KEY `idx_order_user_status` (`user_id`, `order_status`)

-- 查询：SELECT * FROM biz_order WHERE user_id = 100 AND order_status = 1;

-- MySQL 5.5（无 ICP）：
-- 1. 使用 user_id 在索引中定位到记录（user_id = 100）
-- 2. 回表获取完整数据
-- 3. 在服务层过滤 order_status = 1

-- MySQL 5.6+（有 ICP）：
-- 1. 在索引中同时使用 user_id 和 order_status 过滤
-- 2. 只回表符合 order_status = 1 的记录
-- 3. 减少回表次数

-- 验证：使用 EXPLAIN 查看是否使用 ICP
EXPLAIN SELECT * FROM biz_order WHERE user_id = 100 AND order_status = 1;
-- Extra 列显示：Using index condition（使用了 ICP）
-- 如果是 Using where，说明未使用 ICP
```

---

## 四、索引命名规范

### 命名规则

| 索引类型 | 命名格式 | 示例 |
|----------|----------|------|
| 主键索引 | `pk_{表名简写}` 或直接用 `PRIMARY` | `pk_order` |
| 唯一索引 | `uk_{表名简写}_{字段名}` | `uk_order_no` |
| 普通索引 | `idx_{表名简写}_{字段名}` | `idx_order_user_id` |
| 联合索引 | `idx_{表名简写}_{字段1}_{字段2}` | `idx_order_user_status` |

### 表名简写规则

| 原表名 | 简写 | 说明 |
|--------|------|------|
| `biz_order` | `order` | 去掉前缀 |
| `biz_order_item` | `order_item` | 去掉前缀 |
| `sys_user` | `user` | 去掉前缀 |
| `log_operation` | `oplog` | 简化命名 |

### 命名示例

```sql
-- 订单表索引
PRIMARY KEY (`id`)                                              -- 主键：pk_order
UNIQUE KEY `uk_order_no` (`order_no`)                          -- 唯一：uk_order_no
KEY `idx_order_user_id` (`user_id`)                            -- 普通：idx_order_user_id
KEY `idx_order_status_created` (`order_status`, `created_at`)  -- 联合：idx_order_order_status_created

-- 用户表索引
PRIMARY KEY (`id`)                                              -- 主键：pk_user
UNIQUE KEY `uk_user_username` (`username`)                    -- 唯一：uk_user_username
UNIQUE KEY `uk_user_phone` (`phone`)                           -- 唯一：uk_user_phone
KEY `idx_user_status` (`user_status`)                          -- 普通：idx_user_status

-- 关联表索引
PRIMARY KEY (`id`)                                              -- 主键
UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)              -- 联合唯一：uk_user_role
KEY `idx_user_role_role_id` (`role_id`)                        -- 普通：idx_user_role_role_id
```

### 命名注意事项

```
注意事项：
├── 索引名全局唯一，避免重复
├── 联合索引字段不超过 3-4 个（MySQL 限制 16 个字段，但通常不超过 4 个）
├── 避免使用默认索引名（如 INDEX, KEY）
├── 索引名使用小写+下划线
└── 索引名应简洁明了，一看就知道索引的用途
```

---

## 五、必须加索引的场景

### 外键字段

外键字段在多表关联查询中频繁使用，必须加索引。

```sql
-- 订单明细表的外键字段
CREATE TABLE biz_order_item (
    `id`          BIGINT        NOT NULL COMMENT '主键',
    `order_id`    BIGINT        NOT NULL DEFAULT 0 COMMENT '订单ID',
    `product_id`  BIGINT        NOT NULL DEFAULT 0 COMMENT '商品ID',
    PRIMARY KEY (`id`),
    KEY `idx_item_order_id` (`order_id`),    -- 必须：用于关联订单查询
    KEY `idx_item_product_id` (`product_id`) -- 必须：用于关联商品查询
) COMMENT='订单明细';
```

### 经常出现在 WHERE 条件中的字段

高频查询字段应加索引。

```sql
-- 用户表：根据用户名登录
KEY `idx_user_username` (`username`)

-- 商品表：根据分类查询
KEY `idx_product_category_id` (`category_id`)
```

### ORDER BY / GROUP BY 字段

排序和分组字段加索引可直接利用索引的有序性。

```sql
-- 订单表：按创建时间倒序查询
KEY `idx_order_user_created` (`user_id`, `created_at`)

-- 报表表：按部门分组统计
KEY `idx_report_dept_created` (`dept_id`, `created_at`)
```

### 唯一性约束字段

需要保证唯一性的字段必须加唯一索引。

```sql
-- 订单编号必须唯一
UNIQUE KEY `uk_order_no` (`order_no`)

-- 用户名+租户ID 联合唯一
UNIQUE KEY `uk_user_tenant` (`tenant_id`, `username`)
```

### JOIN 关联字段

JOIN 操作的字段必须加索引。

```sql
-- 订单表关联用户表
-- 方案A：外键字段加索引
KEY `idx_order_user_id` (`user_id`)

-- 方案B：使用主键关联（推荐）
-- 如果 JOIN 条件使用主键，天然有索引，无需额外加索引
-- SELECT * FROM biz_order o JOIN sys_user u ON o.user_id = u.id
```

---

## 六、不建议加索引的场景

### 区分度低的字段

区分度低的字段（如性别、状态）即使加了索引，优化器也可能选择全表扫描。

```sql
-- 不推荐：性别字段区分度低
-- 假设男女比例 1:1，索引命中一半数据，索引无效
KEY `idx_user_gender` (`gender`)

-- 不推荐：状态字段区分度低（大部分是"正常"状态）
KEY `idx_order_status` (`order_status`)

-- 特殊情况：如果查询总是带有其他高区分度条件（如 user_id），可以加索引
-- 比如：WHERE user_id = ? AND order_status = ?
-- 此时 order_status 可以加入联合索引，但不建议单独加索引
```

### 小表（几百行以内）

数据量小的表，全表扫描代价低，加索引反而增加维护成本。

```sql
-- 不推荐：配置表只有几十条记录
CREATE TABLE sys_config (
    `id`    BIGINT       NOT NULL COMMENT '主键',
    `key`   VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '配置键',
    `value` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '配置值',
    PRIMARY KEY (`id`),
    KEY `idx_config_key` (`key`)  -- 不推荐：数据量小，全表扫描更快
);
```

### 频繁更新的字段

频繁更新的字段加索引会增加写入开销。

```sql
-- 不推荐：访问量字段频繁更新
KEY `idx_article_view_count` (`view_count`)

-- 统计类字段不适合加索引
```

### TEXT/BLOB 大字段

TEXT/BLOB 类型字段不适合加索引。

```sql
-- 不推荐：大字段直接加索引
KEY `idx_article_content` (`content`)  -- TEXT 类型无法直接加索引

-- 推荐方案：
-- 1. 全文索引（FTS）用于内容搜索
FULLTEXT KEY `ft_article_content` (`content`)

-- 2. 截取前 N 个字符作为索引列
`content_first_200` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '内容摘要（前200字）',
KEY `idx_article_content_first` (`content_first_200`)
```

---

## 七、冗余索引检测

### 什么算冗余索引

冗余索引是指多个索引存在包含关系，其中一个索引可以被另一个索引完全覆盖。

```
冗余索引判定：
├── 索引A 包含 索引B 的所有列 → 索引A 冗余（索引B）
├── 主键列已包含在某索引中 → 该索引冗余
└── 等值查询列一致，排序方向一致 → 可合并
```

### 常见冗余模式

```sql
-- 冗余模式1：(a) 和 (a, b)
KEY `idx_order_user_id` (`user_id`)                 -- 冗余
KEY `idx_order_user_status` (`user_id`, `order_status`)  -- 已覆盖

-- 冗余模式2：(a, b) 和 (a)
KEY `idx_order_user_status` (`user_id`, `order_status`) -- 正常
KEY `idx_order_user_id` (`user_id`)                     -- 冗余（可被上面覆盖）

-- 冗余模式3：主键列重复
KEY `idx_order_user_id` (`user_id`)    -- 正常
KEY `idx_order_user_id_2` (`user_id`)  -- 冗余：完全相同的索引

-- 冗余模式4：排序方向不同的索引
KEY `idx_order_created_asc` (`created_at`)    -- ASC
KEY `idx_order_created_desc` (`created_at`)  -- DESC
-- 注意：MySQL 8.0+ 支持 ASC/DESC 索引，但大多数场景下冗余

-- 非冗余示例：
KEY `idx_order_user_id` (`user_id`)
KEY `idx_order_status` (`order_status`)
-- 不是冗余：两个索引的列不同，无法互相覆盖
```

### 如何识别冗余索引

**方法一：使用 MySQL 工具**

```sql
-- 使用 pt-duplicate-key-checker（Percona Toolkit）
pt-duplicate-key-checker h=localhost,u=root,p=password,d=mydb

-- 输出示例：
-- # ########################################################################
-- # 冗余索引报告
-- # ########################################################################
-- # 表：biz_order
-- # 索引：idx_order_user_id                     已冗余
-- # 被索引覆盖：idx_order_user_status
-- ########################################################################
```

**方法二：使用 MySQL 8.0+ 的 sys schema**

```sql
-- 查询冗余索引
SELECT * FROM sys.schema_redundant_indexes;

-- 查询无用索引
SELECT * FROM sys.schema_unused_indexes;
```

**方法三：手动分析**

```sql
-- 查看表的所有索引
SHOW INDEX FROM biz_order;

-- 分析索引使用情况
SELECT * FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'your_db' AND object_name = 'biz_order';
```

### 清理冗余索引

```sql
-- 删除冗余索引
ALTER TABLE biz_order DROP INDEX `idx_order_user_id`;

-- 注意事项：
-- 1. 确认删除前无业务依赖
-- 2. 在低峰期执行
-- 3. 监控删除后的查询性能
-- 4. 保留删除语句，以便回滚
```

---

## 八、索引设计自检清单

### 新建表索引检查

```
基础检查：
  [ ] 主键索引存在且使用 BIGINT + 雪花ID
  [ ] 唯一索引命名符合 uk_ 前缀规范
  [ ] 普通索引命名符合 idx_ 前缀规范
  [ ] 联合索引字段数不超过 4 个

联合索引检查：
  [ ] 遵循最左前缀原则
  [ ] 等值查询列在范围查询列之前
  [ ] 区分度高的列在前
  [ ] 考虑覆盖索引（高频查询字段纳入索引）

必须场景检查：
  [ ] 外键字段有索引
  [ ] WHERE 条件字段有索引
  [ ] ORDER BY 字段有索引
  [ ] GROUP BY 字段有索引
  [ ] 唯一性约束字段有唯一索引
  [ ] JOIN 关联字段有索引

不推荐场景检查：
  [ ] 区分度低的字段未单独加索引（可放联合索引末尾）
  [ ] 小表未加无用索引
  [ ] 频繁更新字段未加索引
  [ ] TEXT/BLOB 字段未直接加索引（使用全文索引或其他方案）

冗余检查：
  [ ] 无完全重复的索引
  [ ] 无可被其他索引覆盖的冗余索引

性能预判：
  [ ] 索引数量合理（通常不超过 6-8 个）
  [ ] 联合索引覆盖了主要查询场景
  [ ] 预估数据量下索引仍有效
```

### 已有表优化检查

```
现状分析：
  [ ] 已导出所有索引清单
  [ ] 已分析慢查询日志
  [ ] 已确认高频查询模式

优化评估：
  [ ] 无冗余索引
  [ ] 无长时间未使用的索引（可禁用观察）
  [ ] 索引命名规范统一
  [ ] 联合索引列顺序合理

变更风险：
  [ ] 删除索引已评估业务影响
  [ ] 新增索引已评估写入开销
  [ ] 变更计划在低峰期执行
```

### DDL 编写检查

```sql
-- 对照检查 DDL 中的索引定义：

-- 1. 索引命名规范
-- UNIQUE KEY `uk_{表名}_{字段}` (...)
-- KEY `idx_{表名}_{字段}` (...)

-- 2. 联合索引字段顺序合理
KEY `idx_{表名}_{等值列}_{范围列}` (...)

-- 3. 所有外键字段有索引
-- 检查所有 *_id 字段是否都有 KEY

-- 4. 注释完整
-- 如果数据库支持，添加 INDEX COMMENT

-- 5. 可选：添加索引顺序（MySQL 8.0+）
KEY `idx_order_created` (`created_at` DESC)  -- 降序排列
```

---

## 附录：常见索引设计问答

### Q1：什么时候使用联合索引，什么时候使用单列索引？

```
决策原则：
├── 多字段组合查询（WHERE a = ? AND b = ?）→ 联合索引
├── 单字段独立高频查询 → 单列索引
├── 查询优化器难以选择时 → 优先联合索引
└── 索引数量过多时 → 合并为联合索引
```

### Q2：索引是不是越多越好？

```
答案：不是。
├── 索引数量增加 → 写入性能下降（维护成本）
├── 索引占用空间 → 存储成本增加
├── 优化器负担 → 选择最优索引的复杂度增加
└── 建议：每个索引都应有明确的用途
```

### Q3：如何判断字段是否需要加索引？

```
判断标准：
├── 查询频率：每天查询超过 1000 次？
├── 区分度： cardinality / 总行数 > 5% ？
├── 场景：是否经常作为 WHERE/JOIN/ORDER BY 条件？
└── 权衡：查询收益 vs 写入成本
```

### Q4：MySQL 8.0 有什么新索引特性？

| 特性 | 说明 |
|------|------|
| DESC 索引 | 支持降序索引，优化 ORDER BY DESC |
| 函数索引 | 支持在表达式上建索引 |
| 隐藏索引 | 可将索引设为隐藏，不影响查询但暂不维护 |
| 资源组 | 可将索引创建在特定 CPU 核上 |

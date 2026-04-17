# 数据库表设计规范

## 目录

- [表命名规范](#表命名规范)
- [字段命名规范](#字段命名规范)
- [主键设计](#主键设计)
- [公共字段设计](#公共字段设计)
- [字段通用规则](#字段通用规则)
- [表间关系设计](#表间关系设计)
- [常见业务表设计模板](#常见业务表设计模板)
- [表设计自检清单](#表设计自检清单)

---

## 表命名规范

### 命名格式

```
{业务前缀}_{模块名}

业务前缀：
├── sys_     — 系统模块（用户、角色、权限、配置）
├── biz_     — 业务模块（订单、商品、合同）
├── log_     — 日志模块（操作日志、登录日志、接口日志）
├── cfg_     — 配置模块（系统配置、业务配置）
├── rel_     — 关联/中间表（多对多关系表）
└── tmp_     — 临时表（必须标注过期时间）
```

### 命名规则

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| snake_case | 全小写+下划线 | `biz_order_item` | `BizOrderItem`, `bizOrderItem` |
| 单数名词 | 表名用单数 | `sys_user` | `sys_users` |
| 模块前缀 | 按业务域分前缀 | `biz_order` | `order` |
| 简洁明了 | 见名知义 | `sys_user_role` | `sys_user_and_role_mapping` |
| 禁止缩写 | 除非是通用缩写 | `biz_order` | `biz_ord` |
| 允许的通用缩写 | | `info`, `detail`, `config`, `stats`, `log`, `img` | |

### 特殊表命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 关联表 | `rel_{表A}_{表B}` | `rel_user_role` |
| 字典表 | `sys_dict` + `sys_dict_item` | 系统字典 |
| 树形表 | 与普通表一致，通过 `parent_id` 体现 | `sys_department` |
| 日志表 | `log_{业务}` | `log_operation`, `log_login` |
| 快照表 | `{原表名}_snapshot` 或 `{原表名}_hist` | `biz_order_snapshot` |
| 归档表 | `{原表名}_archive_{YYYYMM}` | `biz_order_archive_202601` |

---

## 字段命名规范

### 命名规则

| 规则 | 说明 | 正确 | 错误 |
|------|------|------|------|
| snake_case | 全小写+下划线 | `user_name` | `userName`, `UserName` |
| 见名知义 | 不需要注释也能理解 | `created_time` | `crt_dt` |
| 布尔字段 | `is_` 前缀 | `is_active`, `is_deleted` | `active`, `deleted_flag` |
| 时间字段 | `_time` / `_date` 后缀 | `created_time`, `update_time`, `birth_date` | `created_at`, `updated_at`, `birthday` |
| 数量字段 | `_count` / `_num` 后缀 | `order_count`, `item_num` | `orders`, `num` |
| 金额字段 | `_amount` / `_price` / `_fee` 后缀 | `total_amount`, `unit_price` | `money`, `cash` |
| 比率字段 | `_rate` / `_ratio` 后缀 | `discount_rate`, `tax_rate` | `discount`, `tax` |
| 编号字段 | `_no` / `_code` 后缀 | `order_no`, `product_code` | `number`, `serial` |
| 外键字段 | `{关联表名}_id` | `user_id`, `dept_id` | `uid`, `fk_user` |
| 类型字段 | `_type` 后缀 | `order_type`, `user_type` | `type`, `otype` |
| 状态字段 | `_status` 后缀 | `order_status`, `pay_status` | `status`, `state` |

### 特殊约定

```
统一使用的字段名（跨表一致）：
├── 主键：id
├── 名称：name / title
├── 描述：description / remark
├── 编码：code
├── 排序：sort_order
├── 状态：{业务}_status
├── 类型：{业务}_type
├── 备注：remark
└── 扩展：extra / ext_data（JSON 扩展字段）
```

---

## 主键设计

### 强制规则：雪花ID（Snowflake ID）

**所有表的主键必须使用雪花ID，禁止使用自增ID。**

```sql
-- 正确
`id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
PRIMARY KEY (`id`)

-- 禁止
`id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
PRIMARY KEY (`id`)
```

### 为什么用雪花ID

| 维度 | 自增ID | 雪花ID |
|------|--------|--------|
| 安全性 | 可遍历，暴露数据量 | 不可猜测 |
| 分布式 | 分库分表冲突 | 天然支持分布式 |
| 迁移 | 数据迁移时冲突 | 无冲突 |
| 信息量 | 无 | 含时间戳，可推算创建时间 |
| 存储 | 4-8 字节 | 8 字节 |

### 雪花ID注意事项

1. **前端精度丢失**：雪花ID为18-19位数字，超过JS的 `Number.MAX_SAFE_INTEGER`
   - 解决方案：后端序列化为字符串 `@JsonFormat(shape = Shape.STRING)`
   - 或全局配置 Jackson 将 Long 转为 String

2. **主键长度**：BIGINT 足够存储雪花ID（最大 2^63-1）

3. **排序性**：雪花ID包含时间戳，天然按创建时间递增

---

## 公共字段设计

### 标准公共字段

每张业务表**必须包含**以下公共字段：

```sql
-- 创建人
`created_by`    BIGINT      NOT NULL    DEFAULT 0           COMMENT '创建人ID',

-- 更新人
`updated_by`    BIGINT      NOT NULL    DEFAULT 0           COMMENT '更新人ID',

-- 创建时间
`create_time`    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

-- 更新时间
`update_time`    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP     COMMENT '更新时间',

-- 逻辑删除
`deleted`       TINYINT     NOT NULL    DEFAULT 0           COMMENT '逻辑删除：0-正常，1-已删除',
```

### 公共字段变体

根据项目需求，可能还有以下字段：

```sql
-- 多租户场景
`tenant_id`     BIGINT      NOT NULL    DEFAULT 0           COMMENT '租户ID',

-- 数据版本（乐观锁）
`version`       INT         NOT NULL    DEFAULT 0           COMMENT '数据版本号（乐观锁）',

-- 数据来源
`data_source`   VARCHAR(20) NOT NULL    DEFAULT 'system'    COMMENT '数据来源：system/api/import',

-- 扩展信息
`ext_data`      JSON        NULL                            COMMENT '扩展数据（JSON格式）',
```

### 不同场景的公共字段选择

| 场景 | 必须包含 | 可选包含 |
|------|----------|----------|
| 核心业务表 | id + 审计4字段 + deleted | tenant_id, version, ext_data |
| 关联表 | id + 审计4字段 + deleted | — |
| 日志表 | id + create_time + create_by | — （日志表不需要 update_time 和 deleted） |
| 配置表 | id + 审计4字段 + deleted | sort_order |
| 字典表 | id + 审计4字段 + deleted | sort_order |

---

## 字段通用规则

### NOT NULL 原则

**默认所有字段为 NOT NULL**，可空字段需有明确理由：

```
必须 NOT NULL：
├── 主键
├── 外键字段
├── 状态字段
├── 金额字段
├── 创建/更新时间
└── 布尔字段

可以为 NULL 的场景：
├── 真正可选的数据（如备注、描述）
├── 未发生的动作的时间（如 paid_at，未支付时为 NULL）
├── 有明确业务含义的空值（如 parent_id IS NULL 表示顶级节点）
└── 统计类的可选字段
```

### DEFAULT 值规则

```sql
-- 字符串：空字符串或有意义默认值
`name`      VARCHAR(50) NOT NULL DEFAULT ''    COMMENT '名称',

-- 数值：0
`sort_order` INT        NOT NULL DEFAULT 0     COMMENT '排序',

-- 布尔/状态：明确的默认值
`is_active` TINYINT    NOT NULL DEFAULT 1     COMMENT '是否启用：0-否，1-是',

-- 时间：CURRENT_TIMESTAMP
`create_time` DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

-- 禁止 NULL 作为默认值
-- 错误：DEFAULT NULL
```

### COMMENT 规范

```
每个字段的 COMMENT 必须包含：
1. 中文含义描述
2. 枚举值列举（如果是状态/类型字段）
3. 单位（如果是金额、数量、百分比）

示例：
`order_status`  TINYINT     NOT NULL DEFAULT 0    COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消',
`total_amount`  DECIMAL(12,2) NOT NULL DEFAULT 0  COMMENT '订单总金额（元）',
`discount_rate` DECIMAL(5,4)  NOT NULL DEFAULT 1  COMMENT '折扣率（0.0000-1.0000）',
```

---

## 表间关系设计

### 一对一关系（1:1）

```sql
-- 方案A：主表包含所有字段（字段少时推荐）
CREATE TABLE biz_user_profile (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `user_id`     BIGINT       NOT NULL COMMENT '用户ID',
    `real_name`   VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '真实姓名',
    `id_card_no`  VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '身份证号',
    -- 公共字段...
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_profile_user_id` (`user_id`)
) COMMENT='用户档案';

-- 方案B：拆分为两张表（字段多或查询模式差异大时）
-- 主表 + 扩展表，通过 UNIQUE 外键保证一对一
```

### 一对多关系（1:N）

```sql
-- 在"多"的一方添加外键
CREATE TABLE biz_order_item (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `order_id`    BIGINT       NOT NULL COMMENT '订单ID',
    `product_id`  BIGINT       NOT NULL COMMENT '商品ID',
    `quantity`    INT          NOT NULL DEFAULT 0 COMMENT '数量',
    `unit_price`  DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '单价（元）',
    -- 公共字段...
    PRIMARY KEY (`id`),
    KEY `idx_item_order_id` (`order_id`),       -- 外键必须加索引
    KEY `idx_item_product_id` (`product_id`)
) COMMENT='订单明细';

-- 外键字段命名规则：{主表去掉前缀}_id
-- biz_order → order_id
-- sys_user → user_id
-- sys_department → dept_id（可适当简化）
```

### 多对多关系（M:N）

```sql
-- 创建关联表
CREATE TABLE rel_user_role (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `user_id`     BIGINT       NOT NULL COMMENT '用户ID',
    `role_id`     BIGINT       NOT NULL COMMENT '角色ID',
    -- 公共字段...
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),  -- 联合唯一
    KEY `idx_user_role_role_id` (`role_id`)             -- 反向查询索引
) COMMENT='用户-角色关联';

-- 如果关联表需要携带额外属性（如授权时间、授权人），直接加字段：
CREATE TABLE rel_user_role (
    `id`            BIGINT       NOT NULL COMMENT '主键',
    `user_id`       BIGINT       NOT NULL COMMENT '用户ID',
    `role_id`       BIGINT       NOT NULL COMMENT '角色ID',
    `assigned_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
    `assigned_by`   BIGINT       NOT NULL DEFAULT 0 COMMENT '授权人ID',
    -- 公共字段...
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    KEY `idx_user_role_role_id` (`role_id`)
) COMMENT='用户-角色关联';
```

### 树形结构（自引用）

```sql
CREATE TABLE sys_department (
    `id`          BIGINT       NOT NULL COMMENT '主键',
    `parent_id`   BIGINT       NOT NULL DEFAULT 0 COMMENT '父部门ID（0表示顶级）',
    `name`        VARCHAR(100) NOT NULL DEFAULT '' COMMENT '部门名称',
    `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序',
    `level`       TINYINT      NOT NULL DEFAULT 1 COMMENT '层级深度（1开始）',
    `path`        VARCHAR(255) NOT NULL DEFAULT '' COMMENT '层级路径（如 1,5,12,）',
    -- 公共字段...
    PRIMARY KEY (`id`),
    KEY `idx_dept_parent_id` (`parent_id`)
) COMMENT='部门';

-- path 字段说明：存储从根到当前节点的ID路径，如 "1,5,12,"
-- 好处：查询所有子部门时 LIKE '1,5,12,%' 即可，无需递归
```

---

## 常见业务表设计模板

### 用户表

```sql
CREATE TABLE sys_user (
    `id`              BIGINT        NOT NULL COMMENT '主键（雪花ID）',
    `username`        VARCHAR(50)   NOT NULL DEFAULT '' COMMENT '用户名',
    `password`        VARCHAR(255)  NOT NULL DEFAULT '' COMMENT '密码（加密存储）',
    `real_name`       VARCHAR(50)   NOT NULL DEFAULT '' COMMENT '真实姓名',
    `email`           VARCHAR(100)  NOT NULL DEFAULT '' COMMENT '邮箱',
    `phone`           VARCHAR(20)   NOT NULL DEFAULT '' COMMENT '手机号',
    `avatar`          VARCHAR(500)  NOT NULL DEFAULT '' COMMENT '头像URL',
    `gender`          TINYINT       NOT NULL DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
    `user_status`     TINYINT       NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    `last_login_at`   DATETIME      NULL     COMMENT '最后登录时间',
    `last_login_ip`   VARCHAR(50)   NOT NULL DEFAULT '' COMMENT '最后登录IP',
    `remark`          VARCHAR(500)  NOT NULL DEFAULT '' COMMENT '备注',
    `created_by`      BIGINT        NOT NULL DEFAULT 0 COMMENT '创建人ID',
    `updated_by`      BIGINT        NOT NULL DEFAULT 0 COMMENT '更新人ID',
    `create_time`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`         TINYINT       NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_username` (`username`),
    UNIQUE KEY `uk_user_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

### 订单主表

```sql
CREATE TABLE biz_order (
    `id`              BIGINT         NOT NULL COMMENT '主键（雪花ID）',
    `order_no`        VARCHAR(32)    NOT NULL DEFAULT '' COMMENT '订单编号（业务可读编号）',
    `user_id`         BIGINT         NOT NULL DEFAULT 0 COMMENT '下单用户ID',
    `order_status`    TINYINT        NOT NULL DEFAULT 0 COMMENT '订单状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消，5-已退款',
    `total_amount`    DECIMAL(12,2)  NOT NULL DEFAULT 0 COMMENT '订单总金额（元）',
    `discount_amount` DECIMAL(12,2)  NOT NULL DEFAULT 0 COMMENT '优惠金额（元）',
    `pay_amount`      DECIMAL(12,2)  NOT NULL DEFAULT 0 COMMENT '实付金额（元）',
    `pay_method`      TINYINT        NOT NULL DEFAULT 0 COMMENT '支付方式：0-未支付，1-微信，2-支付宝，3-银行卡',
    `paid_at`         DATETIME       NULL     COMMENT '支付时间',
    `shipped_at`      DATETIME       NULL     COMMENT '发货时间',
    `completed_at`    DATETIME       NULL     COMMENT '完成时间',
    `cancel_reason`   VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '取消原因',
    `remark`          VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '订单备注',
    `receiver_name`   VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '收货人姓名',
    `receiver_phone`  VARCHAR(20)    NOT NULL DEFAULT '' COMMENT '收货人手机号',
    `receiver_address` VARCHAR(500)  NOT NULL DEFAULT '' COMMENT '收货地址',
    `created_by`      BIGINT         NOT NULL DEFAULT 0 COMMENT '创建人ID',
    `updated_by`      BIGINT         NOT NULL DEFAULT 0 COMMENT '更新人ID',
    `create_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`         TINYINT        NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_order_no` (`order_no`),
    KEY `idx_order_user_id` (`user_id`),
    KEY `idx_order_status_created` (`order_status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';
```

### 操作日志表

```sql
-- 日志表：不需要 updated_* 和 deleted 字段
CREATE TABLE log_operation (
    `id`              BIGINT         NOT NULL COMMENT '主键（雪花ID）',
    `user_id`         BIGINT         NOT NULL DEFAULT 0 COMMENT '操作人ID',
    `username`        VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '操作人用户名',
    `module`          VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '操作模块',
    `operation`       VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '操作类型：create/update/delete/export/import',
    `description`     VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '操作描述',
    `method`          VARCHAR(200)   NOT NULL DEFAULT '' COMMENT '请求方法',
    `request_url`     VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '请求URL',
    `request_method`  VARCHAR(10)    NOT NULL DEFAULT '' COMMENT 'HTTP方法：GET/POST/PUT/DELETE',
    `request_params`  TEXT           NULL     COMMENT '请求参数',
    `response_result` TEXT           NULL     COMMENT '响应结果',
    `ip`              VARCHAR(50)    NOT NULL DEFAULT '' COMMENT '操作IP',
    `user_agent`      VARCHAR(500)   NOT NULL DEFAULT '' COMMENT '浏览器UA',
    `duration`        INT            NOT NULL DEFAULT 0 COMMENT '耗时（毫秒）',
    `status`          TINYINT        NOT NULL DEFAULT 1 COMMENT '操作状态：0-失败，1-成功',
    `error_msg`       VARCHAR(1000)  NULL     COMMENT '错误信息',
    `create_time`      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_oplog_user_id` (`user_id`),
    KEY `idx_oplog_module` (`module`),
    KEY `idx_oplog_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志';
```

---

## 表设计自检清单

### 新建表时逐项检查

```
命名检查：
  [ ] 表名符合 {prefix}_{module} 格式
  [ ] 字段名全部 snake_case
  [ ] 无保留字冲突
  [ ] 索引命名符合 uk_/idx_ 前缀规范

字段检查：
  [ ] 主键为 BIGINT + 雪花ID（非自增）
  [ ] 金额字段使用 DECIMAL
  [ ] 状态/类型字段使用 TINYINT + COMMENT 列举枚举值
  [ ] 时间字段使用 DATETIME
  [ ] 字符串字段有明确长度
  [ ] 所有字段有 COMMENT
  [ ] 默认 NOT NULL，可空字段有明确理由
  [ ] DEFAULT 值合理
  [ ] 公共字段完整

索引检查：
  [ ] 主键索引 ✓
  [ ] 业务唯一字段有唯一索引
  [ ] 外键字段有索引
  [ ] 高频查询字段有索引
  [ ] 联合索引遵循最左前缀
  [ ] 无冗余索引

关系检查：
  [ ] 外键字段命名一致
  [ ] 多对多有关联表
  [ ] 无物理外键约束

表级检查：
  [ ] ENGINE=InnoDB
  [ ] CHARSET=utf8mb4
  [ ] 表有 COMMENT
  [ ] DDL 可直接执行
```

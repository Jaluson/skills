# 质量门禁标准

## 一、代码质量门禁

### 1.1 编译检查

| 检查项 | 标准 | 工具 |
|--------|------|------|
| 编译通过 | 0 错误，0 警告 | Maven/Gradle |
| 单元测试 | 全部通过 | JUnit |
| 代码格式 | 符合规范 | Spotless/Google Java Format |

### 1.2 静态代码检查

| 检查项 | 阈值 | 工具 |
|--------|------|------|
| Checkstyle | 0 违规 | checkstyle |
| SpotBugs | 0 High/Medium | spotbugs |
| SonarQube | A 级 | sonar-maven-plugin |

---

## 二、测试质量门禁

### 2.1 覆盖率要求

```groovy
// build.gradle
jacoco {
    violationRules {
        rule {
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.70
            }
        }
    }
}
```

### 2.2 测试通过率

| 类型 | 要求 |
|------|------|
| 单元测试 | 100% 通过 |
| 集成测试 | 100% 通过 |
| E2E 测试 | 核心流程 100%，辅助流程 80% |

---

## 三、安全质量门禁

### 3.1 敏感信息检查

| 检查项 | 工具 |
|--------|------|
| 密钥硬编码 | GitLeaks |
| SQL 注入 | SonarQube |
| XSS 漏洞 | SonarQube |
| 依赖漏洞 | OWASP Dependency Check |

### 3.2 依赖安全

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven-plugin</artifactId>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
    </configuration>
</plugin>
```

---

## 四、CI/CD 流水线

### 4.1 流水线阶段

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Build  │ → │   Test  │ → │ Analyze │ → │ Deploy  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 4.2 门禁检查点

| 阶段 | 检查项 | 失败处理 |
|------|--------|----------|
| Build | 编译、单元测试 | 阻塞合并 |
| Test | 集成测试、覆盖率 | 阻塞合并 |
| Analyze | 代码规范、安全扫描 | 警告/阻塞 |
| Deploy | 冒烟测试 | 阻塞发布 |

---

## 五、Code Review 规范

### 5.1 Review 检查清单

- [ ] 代码符合命名规范
- [ ] 无硬编码敏感信息
- [ ] 异常处理正确
- [ ] 日志记录规范
- [ ] 单元测试覆盖核心逻辑
- [ ] 无安全漏洞
- [ ] 符合业务逻辑

### 5.2 Review 通过标准

| 规则类型 | 要求 |
|----------|------|
| 必须修复 | 全部修复后才能合并 |
| 建议修复 | 可选择性修复，需记录原因 |
| 可忽略 | 不影响功能的规范问题 |

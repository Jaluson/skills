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
        rule {
            limit {
                counter = 'BRANCH'
                value = 'COVEREDRATIO'
                minimum = 0.60
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

### 2.3 增量覆盖率分析

```groovy
// 增量覆盖率检查
jacoco {
    applyToIncrementalBuild = true
    incrementalDataFile = file("$buildDir/jacoco/incremental.exec")
    
    rules {
        rule {
            element = 'CLASS'
            includes = ['com.company.project.module.**']
            excludes = ['**/*Test', '**/generated/**']
            
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.80  // 核心模块行覆盖率 ≥ 80%
            }
            
            limit {
                counter = 'BRANCH'
                value = 'COVEREDRATIO'
                minimum = 0.70  // 分支覆盖率 ≥ 70%
            }
        }
    }
}
```

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

### 3.3 Spring Security 6.x 安全配置检查

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 配置（API 项目通常禁用）
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            )
            // CORS 配置
            .cors(cors -> cors
                .configurationSource(corsConfigurationSource())
            )
            // 授权配置
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            // Session 管理
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // OAuth2 资源服务器
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );
        
        return http.build();
    }
}
```

**安全检查清单：**

| 检查项 | 标准 | 严重等级 |
|--------|------|----------|
| 认证 | 所有 API 必须认证（除 /public/**） | 严重 |
| 授权 | 基于角色/Roles 授权 | 严重 |
| 敏感数据 | 密码/Token 不得日志记录 | 严重 |
| HTTPS | 生产环境强制 HTTPS | 高 |
| 依赖漏洞 | CVSS ≥ 7 禁止发布 | 高 |

---

## 四、CI/CD 流水线

### 4.1 流水线阶段

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Build  │ → │   Test  │ → │ Analyze │ → │  Build  │ → │ Deploy  │
│         │   │         │   │         │   │  Image  │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 4.2 门禁检查点

| 阶段 | 检查项 | 失败处理 |
|------|--------|----------|
| Build | 编译、单元测试 | 阻塞合并 |
| Test | 集成测试、覆盖率 | 阻塞合并 |
| Analyze | 代码规范、安全扫描 | 警告/阻塞 |
| Build Image | Docker 构建、多架构 | 警告 |
| Deploy | 冒烟测试、配置验证 | 阻塞发布 |

### 4.3 GitHub Actions 流水线配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          
      - name: Build with Maven
        run: ./mvnw clean package -DskipTests
        
      - name: Run Tests
        run: ./mvnw test
        
      - name: Run Static Analysis
        run: ./mvnw sonar:sonar -Dsonar.host.url=${{ secrets.SONAR_HOST }}
        
      - name: Check Coverage
        run: ./mvnw jacoco:check
        
      - name: Build Docker Image
        run: |
          docker build -t myapp:${{ github.sha }} .
          docker build -t myapp:latest .
          
      - name: Security Scan
        run: ./mvnw dependency-check:check
        
      - name: Push to Registry
        if: github.ref == 'refs/heads/main'
        run: |
          echo "${{ secrets.REGISTRY_TOKEN }}" | docker login -u ci ${{ secrets.REGISTRY_URL }} --password-stdin
          docker push myapp:latest
```

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
- [ ] **javax → jakarta 迁移检查**
- [ ] **虚拟线程安全（无 ThreadLocal 滥用）**
- [ ] **Record DTO 使用规范**

### 5.2 Review 通过标准

| 规则类型 | 要求 |
|----------|------|
| 必须修复 | 全部修复后才能合并 |
| 建议修复 | 可选择性修复，需记录原因 |
| 可忽略 | 不影响功能的规范问题 |

### 5.3 javax → jakarta 迁移检查点

| 检查项 | 描述 | 工具 |
|--------|------|------|
| Jakarta EE | javax.* → jakarta.* | `grep -r "javax\." src/` |
| 构造方法绑定 | @ConfigurationProperties 使用构造方法 | 代码审查 |
| 依赖升级 | 确认兼容版本 | `./mvnw dependency:tree` |
| Actuator 端点 | /actuator/health/** 路径变更 | `grep -r "actuator"` |
| 配置文件 | 旧属性名迁移 | `./mvnw spring-boot:help` |

---

## 六、SonarQube 集成配置

### 6.1 Maven 配置

```xml
<!-- pom.xml -->
<properties>
    <sonar.core.codeCoveragePlugin>jacoco</sonar.core.codeCoveragePlugin>
    <sonar.java.coveragePlugin>jacoco</sonar.java.coveragePlugin>
    <sonar.jacoco.rePorts>${project.build.directory}/jacoco.exec</sonar.jacoco.rePorts>
    <sonar.sources>src/main/java</sonar.sources>
    <sonar.tests>src/test/java</sonar.tests>
</properties>

<plugin>
    <groupId>org.sonarsource.scanner.maven</groupId>
    <artifactId>sonar-maven-plugin</artifactId>
    <version>3.10.0.2594</version>
</plugin>
```

### 6.2 质量门禁规则

| 指标 | 阈值 | 说明 |
|------|------|------|
| 可靠性 | A | 无阻塞 Bug |
| 安全性 | A | 无安全漏洞 |
| 可维护性 | A | 代码可读性好 |
| 行覆盖率 | ≥ 70% | 新代码必须达标 |
| 重复度 | ≤ 3% | 无重复代码 |

### 6.3 Quality Gate 配置

```json
{
  "name": "Spring Boot Quality Gate",
  "rules": [
    {
      "metric": "coverage",
      "operator": "GREATER_THAN",
      "value": 70
    },
    {
      "metric": "duplicated_lines_density",
      "operator": "LESS_THAN",
      "value": 3
    },
    {
      "metric": "security_hotspots_reviewed",
      "operator": "EQUALS",
      "value": 100
    }
  ]
}
```

---

## 七、可观测性质量门禁

### 7.1 日志质量检查

| 检查项 | 标准 | 验证方式 |
|--------|------|----------|
| 日志格式 | 结构化 JSON（生产环境） | logback 配置 |
| 敏感信息 | 不得记录密码/Token | SonarQube 扫描 |
| 日志级别 | ERROR/WARN 需有上下文 | 代码审查 |
| 日志输出 | 不使用 System.out/err | Checkstyle |

### 7.2 指标暴露检查

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
  tracing:
    sampling:
      probability: 0.1
```

**必须暴露的指标：**

| 指标 | 说明 |
|------|------|
| jvm_memory_used | JVM 内存使用 |
| http_server_requests | HTTP 请求指标 |
|hikaricp_connections | 连接池指标 |
| process_cpu_usage | CPU 使用率 |

### 7.3 OpenTelemetry 集成检查

```yaml
# 必须配置 tracing
management:
  tracing:
    enabled: true
    sampling:
      probability: 0.1  # 采样率 10%
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces
```

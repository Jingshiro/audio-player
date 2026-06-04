# Android 打包指南

## 前置条件

- Node.js 18+
- JDK 21+（推荐 JDK 17 或 25）
- Android SDK（通过 Android Studio 安装）

## 打包步骤

### 1. 配置服务器地址

修改 `frontend/.env.production`，填入你的服务器域名：

```bash
# frontend/.env.production
VITE_API_URL=https://your-domain.com/api
```

### 2. 修改后端 CORS 配置（重要！）

APP 需要服务器允许跨域访问。在服务器上修改 Docker 配置：

**docker-compose.full.yml:**
```yaml
backend:
  environment:
    - CORS_ORIGIN=https://your-domain.com,https://localhost,capacitor://localhost
```

**docker-compose.prod.yml:**
```yaml
backend:
  environment:
    - CORS_ORIGIN=https://your-domain.com,https://localhost,capacitor://localhost
```

重启后端容器：

```bash
docker compose -f docker-compose.full.yml up -d backend
# 或
docker compose -f docker-compose.prod.yml up -d backend
```

### 3. 构建前端

```bash
cd frontend
npm install
npm run build
```

### 4. 添加 Android 平台

```bash
npx cap add android
npx cap sync android
```

### 5. 打开 Android Studio

```bash
npx cap open android
```

或手动打开 `frontend/android` 目录。

### 6. 构建 APK

**方式一：Android Studio**
- 菜单：Build → Build Bundle(s) / APK(s) → Build APK(s)

**方式二：命令行**
```bash
cd frontend/android
./gradlew.bat assembleRelease
```

### 7. 找到 APK

构建完成后，APK 位于：

```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## 配置应用图标

将项目的 `icon.png` 复制到 Android 资源目录：

```bash
# 复制图标到各个分辨率目录
cp icon.png frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher.png
cp icon.png frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher.png
cp icon.png frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp icon.png frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
cp icon.png frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

或使用 Android Studio 的 **Image Asset** 工具生成多分辨率图标：
- 右键 `res` 目录 → New → Image Asset

---

## 配置应用名称

编辑 `frontend/android/app/src/main/res/values/strings.xml`：

```xml
<resources>
    <string name="app_name">你的应用名称</string>
</resources>
```

---

## 修改版本号

编辑 `frontend/android/app/build.gradle`：

```gradle
defaultConfig {
    versionCode 1          // 版本号（每次发布递增）
    versionName "1.0"      // 版本名称
}
```

---

## 签名配置

### 生成签名密钥

```bash
keytool -genkey -v \
  -keystore your-app.keystore \
  -alias your-app \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 配置签名

编辑 `frontend/android/app/build.gradle`，在 `android` 块内添加：

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../your-app.keystore')
            storePassword 'your-store-password'
            keyAlias 'your-app'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 更新 APP

```bash
# 1. 修改前端代码
# 2. 重新构建
cd frontend
npm run build

# 3. 同步到 Android
npx cap sync android

# 4. 重新构建 APK
cd android
./gradlew.bat assembleRelease
```

---

## 常见问题

### Q: APP 无法连接服务器？

检查后端 CORS 配置是否包含你的域名和 `capacitor://localhost`。

### Q: 构建时报错 "non-ASCII characters"？

项目路径不能包含中文字符。将项目移动到纯英文路径，或在 `gradle.properties` 中添加：

```properties
android.overridePathCheck=true
```

### Q: 构建时报错 "invalid source release: 21"？

Capacitor 8.x 需要 JDK 21+。设置正确的 JAVA_HOME：

```bash
JAVA_HOME="path/to/jdk-21" ./gradlew.bat assembleRelease
```

### Q: 如何调试 APP？

```bash
# 实时开发（热重载）
npx cap run android
```

或在 Android Studio 中直接运行到设备/模拟器。

---

## 项目结构

```
frontend/
├── android/                    # Android 原生项目
│   ├── app/
│   │   ├── build.gradle        # 应用构建配置
│   │   └── src/main/
│   │       ├── assets/public/  # Web 资源（自动生成）
│   │       └── res/            # 图标、字符串等资源
│   ├── build.gradle            # 项目构建配置
│   └── gradlew.bat             # Gradle 包装器
├── capacitor.config.json       # Capacitor 配置
├── .env.production             # 生产环境 API 地址
└── dist/                       # 构建输出
```

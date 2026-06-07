# Audio Player 项目代码审查报告

> 审查日期：2026-06-04
> 审查范围：前端 (Vue 3 + Pinia) / 后端 (Express + SQLite)
> 关注维度：安全性、健壮性、可靠性、简洁性

---

## 问题总览

| 严重程度 | 前端 | 后端 | 合计 |
|---------|------|------|------|
| **高** | 5 | 6 | **11** |
| **中** | 17 | 19 | **36** |
| **低** | 12 | 11 | **23** |
| 合计 | 34 | 36 | **70** |

---

## 一、高优先级问题（建议立即修复）

### 1. [安全] Storage 破坏性接口无认证 — 任何人可删光所有数据

**文件**: `backend/src/routes/storage.js:46,61,85`

`/api/storage/clear-lyrics`、`/api/storage/clear-audio`、`/api/storage/clear-all` 三个接口没有任何认证保护，任何人都能调用删除全部数据。

**建议**: 添加 `requireAuth` 中间件，或加二次确认机制。

---

### 2. [安全] JSON body limit 1GB — DoS 风险

**文件**: `backend/src/index.js:24`

```js
app.use(express.json({ limit: '1gb' }))
```

任何客户端可发送 1GB JSON 请求耗尽服务器内存。

**建议**: 降至 `50mb`，音频数据走 multipart 上传而非 base64-in-JSON。

---

### 3. [安全] Gemini API Key 通过 URL 参数和日志泄露

**文件**: `backend/src/routes/ai.js:108,116`

API Key 拼接在 URL query string 中，经过代理/CDN 时会记录在 access log。`console.log` 中 `substring(0, 80)` 也暴露了大部分 key。

**建议**: 改用 `x-goog-api-key` Header 传递；日志中对 key 脱敏。

---

### 4. [Bug] `DELETE /api/lyrics/batch` 路由被 `/:id` 劫持

**文件**: `backend/src/routes/lyrics.js:119,176`

`DELETE /batch` 定义在 `DELETE /:id` 之后，Express 按顺序匹配，`batch` 被当作 `:id` 参数，返回 404 而非执行批量删除。批量删除功能实际上不可用。

**建议**: 将 `DELETE /batch` 路由移到 `DELETE /:id` 之前。

---

### 5. [安全] 密码哈希无 salt + 默认弱密码 + 无限暴力破解

**文件**: `backend/src/routes/auth.js:9-11,27,40`

- SHA256 无 salt，彩虹表可秒破
- 默认密码 `admin`
- `/login` 无失败限流

**建议**: 使用 bcrypt/argon2；默认密码改强随机串；添加登录限流。

---

### 6. [Bug] Object URL 内存泄漏 — 每次播放泄漏一份 Blob

**文件**: `frontend/src/utils/indexedDB.js:128-138`

`loadAudioFileById()` 每次调用 `URL.createObjectURL()` 但从不 `revokeObjectURL()`。切换音频时旧 Blob 内存无法回收。

**建议**: 切换音频前 revoke 旧 URL，或在 player store 中统一管理生命周期。

---

### 7. [Bug] `retryGeneration()` 硬编码 STT — 翻译重试会执行错误流程

**文件**: `frontend/src/views/AIView.vue:569`

`retryGeneration()` 固定调用 `startSTT()`，当 `lastGeneratedType` 为 `'translate'` 时重试会走错分支。

**建议**: 根据 `lastGeneratedType` 分发到 `startSTT()` 或 `startTranslate()`。

---

### 8. [Bug] 双层 store 状态不同步

**文件**: `frontend/src/stores/unifiedLibrary.js` / `library.js`

`library.addAudioFile()` push 到 `library.audioFiles`，但 `unifiedLibrary.audioFiles` 不会自动同步。除非重新 `loadAll()`，新添加的本地文件不会出现在统一列表。

同样的问题存在于 `subtitles.js` / `unifiedSubtitles.js`。

**建议**: 让 unifiedStore 直接代理 localStore 的操作，或在 localStore 变更时自动同步。

---

### 9. [安全] AI 前端直连 API 绕过 token 注入

**文件**: `frontend/src/views/AIView.vue:480-496,518-523`

AIView 中 STT/翻译的前端直连逻辑直接 `fetch()`，绕过了 `api/index.js` 的 `request()` 封装，无 token 注入、无统一错误处理。

**建议**: 统一走 `request()` 或在 fetch 中手动加 token header。

---

### 10. [Bug] `migrateLegacy()` 配置污染 — STT 和翻译共享相同 API 配置

**文件**: `frontend/src/stores/ai.js:100-106`

迁移函数将同一个 `ai_` 前缀的值同时写入 `stt_` 和 `translate_`，导致 STT 和翻译使用相同的 baseUrl/apiKey/model。

**建议**: 迁移时只写入 `stt_`，`translate_` 留空让用户单独配置。

---

### 11. [安全] auth.js 修改密码时旧密码验证绕过 `safeCompare`

**文件**: `backend/src/routes/auth.js:105`

```js
if (!stored || stored.value !== hashPassword(oldPassword)) {
```

使用 `!==` 而非 `safeCompare`，存在时序攻击。

**建议**: 统一使用 `safeCompare(stored.value, hashPassword(oldPassword))`。

---

## 二、中优先级问题

### 前端

| # | 类别 | 文件 | 问题 |
|---|------|------|------|
| 1 | 健壮性 | `api/index.js:30-58` | `request()` 无超时控制，请求可能无限挂起 |
| 2 | 健壮性 | `api/index.js:52-53` | 非 JSON 响应（如 502 页面）被静默吞掉 |
| 3 | 健壮性 | `views/AIView.vue:457-501` | `startSTT()` 无 base64 大小校验，大文件会 OOM |
| 4 | 健壮性 | `views/AIView.vue:458-459` | `startSTT()` 未检查 `baseUrl` 是否为空 |
| 5 | 健壮性 | `stores/unifiedLibrary.js:47-88` | `loadAll()` 每次调 `checkBackend()`，频繁 HTTP 请求 |
| 6 | 健壮性 | `components/Toast.vue:33-39` | `setTimeout` 未在组件卸载时清理 |
| 7 | 简洁性 | `stores/ai.js:52-93` | 服务器设置加载代码重复约 40 行 |
| 8 | 简洁性 | `stores/ai.js:25-27` | API 预设同步无原子性保证 |
| 9 | 健壮性 | `views/SettingsView.vue:337-346` | 播放设置绕过 Pinia store 直接读写 localStorage |
| 10 | 简洁性 | `views/PlayerView.vue` | 直接操作 4 个 store + 2 个底层 store，耦合过重 |
| 11 | 简洁性 | `views/LibraryView.vue:371-388` | `playAudio()` 通过 `router.push` 副作用触发播放 |
| 12 | 简洁性 | `views/AIView.vue:386-396,484-496,516-523` | `detectApiFormat()` + fetch 模式重复 3 次 |
| 13 | 简洁性 | `views/PlayerView.vue:489-516,552-568` | LRC 导入逻辑重复 |
| 14 | 简洁性 | `stores/subtitles.js` + `utils/indexedDB.js` | 重复定义 `openDB()`，DB_VERSION 冲突风险 |
| 15 | 简洁性 | `views/AIView.vue` / `SettingsView.vue` | 每个视图 `onMounted` 都 `loadAll()`，重复加载 |
| 16 | 边界 | `views/LibraryView.vue:349-356` | `getAudioSubtitles()` 在 v-for 中被调 3 次，O(N*M) 无缓存 |
| 17 | Bug | `views/PlayerView.vue:139` | `contentInputRef` 在 v-for 中被收集为数组，语义不清晰 |

### 后端

| # | 类别 | 文件 | 问题 |
|---|------|------|------|
| 18 | 安全 | `middleware/auth.js:28` | `verifyToken` 用 `===` 比较 token，有时序攻击风险 |
| 19 | 安全 | `routes/audio.js:80` | 音频文件路径拼接存在路径遍历风险 |
| 20 | 安全 | `routes/ai.js` 全文 | 服务端作为 API 代理，`baseUrl` 由客户端控制，可被滥用 |
| 21 | 安全 | `routes/ai.js:127-132` | Gemini safetySettings 全部 `BLOCK_NONE`，合规风险 |
| 22 | Bug | `routes/settings.js:69-74` | `PUT /batch` 未验证 value 类型 |
| 23 | Bug | `routes/prompt.js:79,129` | `PUT /default` 被 `PUT /:id` 劫持，永远不可达 |
| 24 | 健壮性 | `routes/audio.js:103-106` | Range 请求未校验合法性，非法范围可致异常 |
| 25 | 健壮性 | `routes/storage.js:66-70` | `clear-audio` 同步阻塞删除文件 |
| 26 | 健壮性 | `routes/audio.js:24-27` | 上传无 MIME 类型校验，可上传任意文件 |
| 27 | 健壮性 | `routes/ai.js:7-24` | ffmpeg 进程无超时，可能挂起 |
| 28 | 健壮性 | 各路由 | 错误信息被吞掉，不利于调试 |
| 29 | 简洁性 | `routes/audio.js` + `ai.js` | MIME 映射表重复定义 |
| 30 | 简洁性 | 各路由 | "查找→404" 模式重复约 15 处 |
| 31 | 简洁性 | `routes/audio.js:65,78` | `GET /:id` 和 `GET /:id/stream` 重复查询 |
| 32 | API | 各路由 | 错误消息中英文混用 |

---

## 三、低优先级问题

### 前端

| # | 类别 | 文件 | 问题 |
|---|------|------|------|
| 1 | 内存 | `stores/player.js:90-104` | `setAudioElement(null)` 不清空 savedListeners |
| 2 | 内存 | `views/AIView.vue:475` | `startSTT()` 全文件 ArrayBuffer 大文件 OOM |
| 3 | 内存 | `views/PlayerView.vue:260` | `lyricsAutoScrollTimer` 卸载时仅 clearTimeout |
| 4 | Bug | `utils/lrcParser.js:7` | `TIME_REGEX` 带 `g` 标志定义在模块顶层，脆弱模式 |
| 5 | 边界 | `views/PlayerView.vue:524-528` | `onDragLeave` 的 `relatedTarget` 不可靠 |
| 6 | 边界 | `stores/player.js:277-295` | `playNext/playPrev` 无循环/随机播放，末尾无反馈 |
| 7 | 边界 | `views/PlayerView.vue:648-657` | 时间解析格式严格，用户输入非标准格式无提示 |
| 8 | 性能 | `views/PlayerView.vue:1006-1010` | 拖拽恢复 transition 硬编码，与 CSS 变量不一致 |
| 9 | 边界 | `views/PlayerView.vue:1201-1310` | 歌词全屏模式未处理横向溢出 |
| 10 | 简洁性 | `views/LibraryView.vue:652-668` | `.source-tag.*` 样式定义了但未使用（死代码） |
| 11 | 简洁性 | 多个视图 | `.glass-card`、`.form-group` 等样式 scoped 下重复定义 |
| 12 | 简洁性 | `views/AIView.vue:453` | `uint8ArrayToBase64()` 手动实现，浏览器有原生方案 |

### 后端

| # | 类别 | 文件 | 问题 |
|---|------|------|------|
| 13 | 安全 | `index.js:21` | CORS origin 配置宽松，credentials=true 增加 CSRF 风险 |
| 14 | Bug | `routes/folder.js:77-79` | `deleteFolder` 递归只处理一层，依赖外键级联 |
| 15 | 健壮性 | `db/init.js:30` | `initDatabase()` 同步执行 schema.sql |
| 16 | 健壮性 | `routes/storage.js:110-116` | `formatSize` 超 1TB 时数组越界 |
| 17 | 健壮性 | `routes/lyrics.js:179` | `DELETE /batch` 的 ids 未验证元素类型 |
| 18 | 健壮性 | `package.json:8` | `node --watch` 需 Node 22+，无 fallback |
| 19 | 简洁性 | `routes/storage.js:64-71,89-95` | 文件删除逻辑完全重复 |
| 20 | 简洁性 | `routes/audio.js` + `storage.js` + `index.js` | `uploadDir` 多处重复定义 |
| 21 | API | 各路由 | DELETE 返回格式不一致 |
| 22 | Schema | `db/schema.sql:44` | `prompt_presets.name` 缺少 UNIQUE 约束 |
| 23 | Schema | `db/schema.sql:3-7` | settings 表混存密码/token/应用设置 |

---

## 四、架构层面建议

### 1. 统一数据加载入口

当前每个视图组件在 `onMounted` 中独立调用 `loadAll()`，导致重复的 IndexedDB 读取和 HTTP 请求。

**建议**: 在 App 级别或路由守卫中加载一次，通过 provide/inject 或全局 store 管理。

### 2. 双层 store 合并

`library.js` / `unifiedLibrary.js` 各维护一份 `audioFiles`，状态容易不同步。`subtitles.js` / `unifiedSubtitles.js` 同理。

**建议**: 让 unifiedStore 直接包装 localStore 的操作，而非复制数据；或改用单一 store + source 字段区分来源。

### 3. 前端 API 调用统一

AIView 中多处直接 `fetch()` 绕过 `api/index.js`。

**建议**: 所有 HTTP 调用统一走 `request()`，确保 token 注入和错误处理一致。

### 4. 公共样式提取

`.glass-card`、`.form-group`、`.btn-primary` 等样式在多个 scoped 视图中重复定义。

**建议**: 提取到全局 CSS 或共享组件中。

### 5. 重复代码消除

| 重复模式 | 出现次数 | 建议 |
|---------|---------|------|
| "查找→404" 路由模式 | ~15 处 | 提取 `requireEntity()` 中间件 |
| MIME 类型映射 | 2 处 | 提取到 `utils/mime.js` |
| LRC 导入逻辑 | 2 处 | 提取为 `importLRC(content)` 函数 |
| API 直连 fetch 模式 | 3 处 | 提取为 `callApiDirectly(config, messages)` |
| 文件删除循环 | 2 处 | 提取为 `deleteAllAudioFiles()` |

---

## 五、修复优先级建议

### 立即修复（安全/数据丢失风险）

1. Storage 破坏性接口加认证
2. JSON body limit 降至合理值
3. `DELETE /api/lyrics/batch` 路由顺序修正
4. 密码存储改用 bcrypt
5. API Key 改用 Header 传递
6. auth.js `safeCompare` 统一使用

### 短期修复（功能 Bug）

7. Object URL 内存泄漏
8. `retryGeneration()` 翻译重试分支
9. 双层 store 状态同步
10. `migrateLegacy()` 配置污染
11. AIView 前端直连 API 加 token

### 中期优化（健壮性/代码质量）

12. API 请求超时控制
13. Range 请求校验
14. ffmpeg 进程超时
15. 公共样式提取
16. 重复代码消除
17. 统一错误信息语言

### 长期改进（架构）

18. 统一数据加载入口
19. 双层 store 合并
20. 前端 API 调用统一

<p align="center">
  <img src="icon.png" alt="Logo" width="128" />
</p>

# 🎵 凑合用的音声播放器

一个用来学习英语的工具（大嘘）

**在线试用** 👉 [jingshiro.github.io/audio-player](https://jingshiro.github.io/audio-player/)

## 懒人功能清单

- **能出声**（废话）
- **LRC 歌词**：自动滚，能点着跳转，当前行会亮。
- **多语种歌词切着玩**：一个音频随便挂几个歌词文件，中英日韩随意。
- **改时间戳**：双击歌词行直接改，专治各种对不上轴。
- **断点续播**：页面关了下次打开接着听，防止你听一半睡死过去。
- **AI 扒台词 & 翻译**：丢音频进去自己转 LRC，或者把现有歌词翻成别的语言。
  *(注：白嫖是不可能白嫖的，API Key 请自备)*
- **破限词预设**：懂的都懂。支持存多个 Prompt 预设。
- **文件管理**：直接把文件拖进来就行。

## 怎么跑起来（两种姿势）

### 1. 纯前端模式（“我就随便听听”）
数据全塞浏览器缓存里。关了浏览器清了缓存就没，适合没什么追求的听众。

```bash
cd frontend
npm install
npm run dev
# 浏览器滚去 http://localhost:8080

```

嫌配环境麻烦就用 Docker：

```bash
docker compose up -d
# 同样，打开 http://localhost:8080

```

### 2. 全栈模式（”我要囤积我的音声库”）

带个 Node 后端，数据给你老老实实存着，重启不丢。首次访问需要登录。

```bash
docker compose -f docker-compose.full.yml up -d
# 界面: http://localhost:8080
# 接口: http://localhost:3000

```

**登录**：全栈版首次打开会弹登录框，默认密码 `admin`。登录后 AI 设置（API Key 等）会同步到服务器，换浏览器也能用。

## 给想扔到服务器上的人

想自己构建镜像的：

```powershell
# 别敲那些又长又臭的 docker 命令了，直接跑脚本
.\docker-build-push.ps1

```

直接拉取运行的：

```bash
# 先建好存数据的地方，免得容器一重启你的宝贝们全没了
mkdir -p data/audio data/lyrics

# 跑起来
docker compose -f docker-compose.prod.yml up -d

```

记得在根目录建个 `.env` 文件，自己改端口：

```ini
FRONTEND_PORT=8080
BACKEND_PORT=3000

```

## 技术栈（随便看看）

* **前端**：Vue 3 + Vite + Pinia
* **后端**：Node.js + Express
* **数据库**：SQLite (better-sqlite3)
* **部署**：Docker + Nginx

## License

全是 AI 写的代码，没有任何人类智慧结晶的污染，随便拿去造作吧。
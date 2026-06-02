# Docker 镜像构建和推送脚本 (GitHub Container Registry)
# 使用方法: .\docker-build-push.ps1

$REGISTRY = "ghcr.io"
$OWNER = "jingshiro"
$FRONTEND_IMAGE = "$REGISTRY/$OWNER/audio-player-frontend"
$BACKEND_IMAGE = "$REGISTRY/$OWNER/audio-player-backend"

Write-Host "=== 音声播放器 Docker 镜像构建 ===" -ForegroundColor Cyan

# 登录 GHCR
Write-Host "`n[1/4] 登录 GitHub Container Registry..." -ForegroundColor Yellow
docker login $REGISTRY

# 构建前端镜像
Write-Host "`n[2/4] 构建前端镜像..." -ForegroundColor Yellow
docker build -t "${FRONTEND_IMAGE}:latest" -f docker/Dockerfile.frontend .
if ($LASTEXITCODE -ne 0) {
    Write-Host "前端镜像构建失败!" -ForegroundColor Red
    exit 1
}

# 构建后端镜像
Write-Host "`n[3/4] 构建后端镜像..." -ForegroundColor Yellow
docker build -t "${BACKEND_IMAGE}:latest" -f docker/Dockerfile.backend .
if ($LASTEXITCODE -ne 0) {
    Write-Host "后端镜像构建失败!" -ForegroundColor Red
    exit 1
}

# 推送镜像
Write-Host "`n[4/4] 推送镜像到 GHCR..." -ForegroundColor Yellow
docker push "${FRONTEND_IMAGE}:latest"
docker push "${BACKEND_IMAGE}:latest"

Write-Host "`n=== 完成! ===" -ForegroundColor Green
Write-Host "前端镜像: $FRONTEND_IMAGE:latest"
Write-Host "后端镜像: $BACKEND_IMAGE:latest"
Write-Host "`n使用方法:"
Write-Host "  docker compose -f docker-compose.full.yml up -d"

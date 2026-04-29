#!/bin/bash
set -e

echo "正在拉取最新镜像..."
podman pull ghcr.io/echohaoran/asset-management-system/zichan-backend:latest
podman pull ghcr.io/echohaoran/asset-management-system/zichan-frontend:latest

echo "正在停止旧容器..."
podman-compose down 2>/dev/null || true

echo "正在启动容器..."
podman-compose up -d

echo ""
echo "========================================="
echo "  部署完成！"
echo "  前端: http://你的服务器IP:8080"
echo "  后端 API: http://你的服务器IP:8000/docs"
echo "========================================="

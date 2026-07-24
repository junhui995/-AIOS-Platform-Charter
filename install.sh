#!/usr/bin/env bash
# 一键安装脚本：AIOS Platform

set -e

REPO_URL="https://github.com/junhui995/-AIOS-Platform-Charter.git"
TARGET_DIR="AIOS-Platform"

echo "======================================"
echo "    欢迎使用 AIOS 平台一键安装脚本"
echo "======================================"

# 1. 检查基础命令
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未安装 Git，请先安装 Git。"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js (推荐 v18+)，请先安装。"
    exit 1
fi

# 2. 检查并安装 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️ 未检测到 pnpm，正在通过 npm 全局安装..."
    npm install -g pnpm
fi

echo "✅ 环境检查通过: Node.js ($(node -v)) | pnpm ($(pnpm -v)) | Git"

# 3. 克隆仓库
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️ 目录 $TARGET_DIR 已存在。正在进入目录并拉取最新代码..."
    cd "$TARGET_DIR"
    git pull origin main || true
else
    echo "🚀 正在克隆 AIOS 仓库..."
    git clone "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

# 4. 依赖安装
echo "📦 正在安装依赖库 (pnpm workspace)..."
pnpm install

echo "======================================"
echo "🎉 AIOS 环境安装完成！"
echo ""
echo "👉 体验 Mock 闭环模式，请输入："
echo "   cd $TARGET_DIR"
echo "   npx tsx packages/runtime/src/cli.ts \"帮 Alice 报销 600 块打车费\""
echo ""
echo "👉 若有 OpenAI API Key，请设置后体验真实 AI 推理："
echo "   export OPENAI_API_KEY=\"sk-...\""
echo "   npx tsx packages/runtime/src/cli.ts \"帮 Alice 报销 600 块打车费\""
echo "======================================"

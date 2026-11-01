#!/usr/bin/env bash
# 用 Token 自动创建 GitHub 仓库并推送
# 用法: GITHUB_TOKEN=ghp_xxx REPO_NAME=hikc-karting-digital-twin bash tools/push_to_github.sh
set -euo pipefail

TOKEN="${GITHUB_TOKEN:?需要设置 GITHUB_TOKEN}"
REPO="${REPO_NAME:-hikc-karting-digital-twin}"
DESC="孝感 HIKC 国际卡丁车赛车场数字孪生 · 单文件 Three.js 场景"

cd "$(dirname "$0")/.."

echo "1/4 校验 Token 并获取账号…"
USER_JSON=$(curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/user)
USER=$(echo "$USER_JSON" | sed -n 's/.*"login": *"\([^"]*\)".*/\1/p' | head -1)
if [ -z "$USER" ]; then
  echo "Token 无效："; echo "$USER_JSON" | head -5; exit 1
fi
echo "   账号: $USER"

echo "2/4 创建仓库 $REPO …"
CREATE=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"description\":\"$DESC\",\"private\":false,\"has_issues\":true}")
if echo "$CREATE" | grep -q '"full_name"'; then
  echo "   已创建"
elif echo "$CREATE" | grep -q 'already exists'; then
  echo "   仓库已存在，直接使用"
else
  echo "   创建失败："; echo "$CREATE" | head -8; exit 1
fi

echo "3/4 配置远程并推送…"
git branch -M main
git remote remove origin 2>/dev/null || true
# 用临时 URL 推送，推完立即还原，避免 Token 留在 .git/config
git remote add origin "https://${USER}:${TOKEN}@github.com/${USER}/${REPO}.git"
git push -u origin main

echo "4/4 清理 Token…"
git remote set-url origin "https://github.com/${USER}/${REPO}.git"
git remote -v

echo
echo "完成 → https://github.com/${USER}/${REPO}"

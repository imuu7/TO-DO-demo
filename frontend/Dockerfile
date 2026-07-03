# --- 建置階段：Node 22（Vite 8 需 Node 20.19+/22.12+）---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# 建置期注入 API base URL；Docker 部署設為空字串 → 打包成同源相對路徑
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- 服務階段：nginx 靜態服務 + 反向代理後端 ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

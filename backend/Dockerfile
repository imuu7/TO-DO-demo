# 後端映像：Python 3.12 + uvicorn（生產模式，無 --reload）
FROM python:3.12-slim

# 先複製並安裝依賴，善用 layer cache
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式碼：檔案落於 /app/app/main.py，UPLOAD_DIR 會解析為 /app/uploads
COPY app/ ./app/

# uvicorn 只會把目前工作目錄加入 sys.path，需明確指定 PYTHONPATH 才能 import app 套件；
# WORKDIR 設在 /app/data，讓 sqlite:///./events.db 落在可掛載 volume 的目錄內
ENV PYTHONPATH=/app
WORKDIR /app/data

EXPOSE 8000

# 容器內必須綁 0.0.0.0，預設的 127.0.0.1 會導致 nginx 反向代理連不到
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

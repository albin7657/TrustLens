FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    git-lfs \
    && git lfs install \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "rm -rf models && GIT_LFS_SKIP_SMUDGE=1 git clone https://${GH_TOKEN}@github.com/albin7657/TrustLens-model.git models && cd models && git lfs pull && cd .. && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
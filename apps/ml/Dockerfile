# Base de execução em Python 3.11 slim
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências necessárias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar os diretórios de código
COPY app/ ./app/
COPY model/ ./model/

# Treinar os modelos na fase de build do container
RUN python model/train.py

# Expor a porta que o FastAPI irá rodar
EXPOSE 8000

# Inicializar uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

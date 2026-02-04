FROM python:3.12-slim

# Instalar Tesseract, Poppler y librerías de OpenCV
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-spa \
    poppler-utils \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar scripts OCR
COPY ocr_service.py .
COPY ocr_gemini_only.py .

# Exponer puerto para API (opcional)
EXPOSE 8000

# Mantener contenedor corriendo (esperando comandos de Laravel)
CMD ["tail", "-f", "/dev/null"]

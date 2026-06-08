FROM node:20-alpine

# Установка Python для скриптов парсинга (Pillow требует сборки)
RUN apk add --no-cache python3 py3-pip build-base python3-dev jpeg-dev zlib-dev \
    && rm -rf /var/cache/apk/*

# Виртуальное окружение для Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install Pillow

WORKDIR /app

# Копируем package.json
COPY backend/package*.json ./backend/
COPY package*.json ./

# Устанавливаем зависимости
WORKDIR /app/backend
RUN npm install

# Копируем остальной код
WORKDIR /app
COPY . .

WORKDIR /app/backend

# Инициализируем БД
RUN npm run db:init && npm run db:seed

EXPOSE 5000

CMD ["npm", "start"]

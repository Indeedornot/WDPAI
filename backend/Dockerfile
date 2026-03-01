# Backend (framework-free PHP + PDO MySQL)
FROM php:8.3-cli

WORKDIR /app/backend

RUN docker-php-ext-install pdo_mysql

COPY . .

RUN chmod +x /app/backend/bin/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/backend/bin/docker-entrypoint.sh"]

# Backend (framework-free PHP + PDO PostgreSQL)
FROM composer:2 AS composer

FROM php:8.3-cli

WORKDIR /app/backend

COPY --from=composer /usr/bin/composer /usr/local/bin/composer

RUN apt-get update \
	&& apt-get install -y --no-install-recommends libpq-dev git unzip \
	&& docker-php-ext-install pdo_pgsql \
	&& rm -rf /var/lib/apt/lists/*

COPY . .

RUN chmod +x /app/backend/bin/docker-entrypoint.sh \
	&& chmod +x /app/backend/bin/integration-smoke.sh

EXPOSE 8080

ENTRYPOINT ["/app/backend/bin/docker-entrypoint.sh"]

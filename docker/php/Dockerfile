FROM php:8.4-cli

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libpng-dev \
        libjpeg-dev \
        libwebp-dev \
        default-mysql-client \
    && pecl install pcov \
    && docker-php-ext-enable pcov \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install pcntl pdo_mysql zip gd \
    && rm -rf /var/lib/apt/lists/*

COPY docker/php/conf.d/ /usr/local/etc/php/conf.d/

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

EXPOSE 8000 8080

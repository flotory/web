#!/bin/sh
set -eu

cd /var/www/html
composer install --no-interaction --prefer-dist
exec php artisan reverb:start --host=0.0.0.0 --port=8080

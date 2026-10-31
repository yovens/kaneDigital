#!/usr/bin/env bash
# Kanè Dijital — enstalasyon an yon sèl kòmand.
# Itilizasyon:  bash setup.sh [non-dosye]   (pa defo: kane-dijital-app)
# Mache sou Linux, macOS, ak Windows (Git Bash).
set -euo pipefail

APP_DIR="${1:-kane-dijital-app}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/6 Kreye pwojè Laravel la nan ./$APP_DIR"
composer create-project laravel/laravel "$APP_DIR" --no-interaction
cd "$APP_DIR"

echo "==> 2/6 Enstale API a (Sanctum)"
php artisan install:api --without-migration-prompt --no-interaction

echo "==> 3/6 Kopye kòd Kanè Dijital la ak PWA a"
cp -R "$HERE/src/." .
# "/" kounye a redirije sou /app/, kidonk tès egzanp Laravel la pa valab ankò.
rm -f tests/Feature/ExampleTest.php
mkdir -p public/app
cp -R "$HERE/frontend/." public/app/
rm -rf public/app/dev public/app/package.json

echo "==> 4/6 Konfigire fizo orè ak non aplikasyon an"
sed -i.bak "s#'timezone' => .*#'timezone' => env('APP_TIMEZONE', 'America/Port-au-Prince'),#" config/app.php
sed -i.bak 's#^APP_NAME=.*#APP_NAME="Kanè Dijital"#' .env
grep -q '^APP_TIMEZONE=' .env || echo 'APP_TIMEZONE=America/Port-au-Prince' >> .env
rm -f config/app.php.bak .env.bak

echo "==> 5/6 Migrations + done demo"
php artisan migrate:fresh --seed --force

echo "==> 6/6 Tès yo"
php artisan test

echo
echo "Fini! Lanse sèvè a:  cd $APP_DIR && php artisan serve"
echo "Epi louvri:          http://localhost:8000/app/"
echo "Kont demo: telefòn 3700-0000, PIN 1234"

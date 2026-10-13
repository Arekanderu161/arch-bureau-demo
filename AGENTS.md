# АДБ Проект-5 — демо сайта

- Статичный сайт без зависимостей: `index.html`, `variant-a.html` («Монолит»), `variant-b.html` («Чертёж»), макет дома `house/house.html`.
- Запуск: `node server.mjs` → `http://127.0.0.1:4190` (`PORT` меняет порт).
- Макет дома: исходники в `house/` (`model.mjs` — единый источник цифр, `build.mjs`, `live.js`, `house.css`). После правок запускать `node house/build.mjs`, готовый `house/house.html` коммитится (GitHub Pages без сборки).
- Аудит макета: `node house/build.mjs --audit --quick` (полный `--audit` идёт долго — запускать в фоне). Известно: 2 «swaps» < 1 px² на стыке мауэрлата и кровли.
- Кит Anatomy (MIT) скопирован в `kit/` без изменений. Инструменты проверки `tools/capture.mjs` и `tools/drive.mjs` взяты из Anatomy; в `drive.mjs` добавлен селектор `@viewport` для снимка видимой области.
- Тесты: `node --test tests/site.test.mjs`; браузер (нужны Chrome и запущенный сервер): `node tests/browser.mjs`; скриншоты: `node tests/viewport-shots.mjs <url> <prefix> [w] [h]` → `shots/` (в .gitignore).
- Проверка синтаксиса: `node --check scripts/*.js server.mjs`.
- Контент: не выдумывать факты о реальной компании — проекты и отзывы помечать как «демо». Пути только относительные (сайт открывается из подпапки GitHub Pages).
- Тема: `data-theme` на `<html>`, ключ `adb-theme` в localStorage, параметр `?theme=`. В iframe макета тема передаётся через `postMessage({ type: "hx:set", theme })`.

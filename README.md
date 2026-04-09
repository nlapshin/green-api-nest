# GREEN-API Integration Gateway

Шлюз интеграции с [GREEN-API](https://green-api.com) на **NestJS + Fastify**: валидация входа **Zod**, исходящие вызовы **undici**, учётные данные инстанса только в теле запроса (не хранятся), единый JSON-конверт ответов/ошибок, веб-панель на `/`.

**Node.js:** >= 20.

## Проверка перед ревью

```bash
npm ci
npm run build
npm run lint
npm test
npm run test:e2e
```

Локально: `npm run start:dev` → `http://localhost:3000/`.

## Стек

| Компонент | Назначение |
|-----------|------------|
| NestJS, Fastify | HTTP, модули, lifecycle |
| Zod | Схемы и типы на границе API |
| undici | Исходящий HTTP, пул, таймауты |
| envalid | Валидация переменных окружения |
| nestjs-pino / Pino | Структурные логи |
| prom-client | `GET /metrics` (Prometheus) |

## Структура `src/`

| Путь | Содержимое |
|------|------------|
| `config/` | `EnvService`, `ConfigService` |
| `green-api/` | Контроллер, сервис, клиент, схемы Zod, маппер |
| `http-client/` | Общий HTTP-клиент, повторы, типы ошибок |
| `logging/` | Настройка Pino, request id |
| `metrics/` | Метрики, inbound-interceptor, `/metrics` |
| `response/` | Конверт успеха/ошибки, interceptor |
| `validation/` | Zod pipe и исключения |
| `exceptions/` | Глобальный exception filter |
| `main.ts` | Bootstrap Fastify (Helmet, лимит тела, статика, views) |

## HTTP API

База: **`POST /api/v1/green-api/*`** с JSON-телом.

| Маршрут | Назначение |
|---------|------------|
| `.../get-settings` | Настройки инстанса |
| `.../get-state-instance` | Состояние инстанса |
| `.../send-message` | Отправка текста |
| `.../send-file-by-url` | Файл по URL |

Контракт тела и ограничения полей: `src/green-api/green-api.schemas.ts`.

**Успех:** `{ "success": true, "data": { ... }, "meta": { "requestId": "..." } }`  
**Ошибка:** `{ "success": false, "error": { "code", "message", "details?" }, "meta": { "requestId" } }`  
Коды ошибок: `src/errors/error-codes.ts`.

## Переменные окружения

Загрузка и значения по умолчанию: `src/config/env.service.ts`.

| Переменная | Назначение |
|------------|------------|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT`, `HOST` | Прослушивание |
| `DEFAULT_API_URL` | Базовый URL GREEN-API |
| `LOG_LEVEL` | Уровень Pino |
| `REQUEST_TIMEOUT_MS` | Таймаут одной исходящей попытки |
| `TRUST_PROXY` | Доверие `X-Forwarded-*` |
| `INBOUND_REQUEST_TIMEOUT_MS` | Таймаут входящего запроса; `0` — без лимита |
| `OUTBOUND_RETRY_*` | Число попыток, backoff, джиттер, повтор при 429 |

## Прочие маршруты

| Метод и путь | Назначение |
|--------------|------------|
| `GET /` | SSR-панель (Handlebars) |
| `GET /healthz` | Liveness |
| `GET /readyz` | Readiness (без проверки GREEN-API) |
| `GET /metrics` | Prometheus |
| `GET /static/*` | Статика (CSS/JS UI) |

## Поведение исходящих вызовов

Повторы при сетевых ошибках, таймаутах, HTTP 5xx и (опционально) 429; обычные 4xx без повторов. Передаётся `x-request-id` к upstream. Детали: предыдущие версии README или код `HttpClientService` / `retry-policy.ts`.

## UI

Статика: `public/`, шаблон: `views/index.hbs`. При успехе в панели отображается поле **`data.body`** ответа шлюза (тело от GREEN-API), при ошибке — полный JSON конверта.

## Ограничения

Нет rate limiting на входе. Readiness не ходит в GREEN-API.

## Лицензия

MIT

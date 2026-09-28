# Чат MAX через GREEN-API

Веб-клиент для переписки в мессенджере MAX: вход по учётным данным инстанса GREEN-API, создание чата по номеру телефона, отправка текстовых сообщений и приём ответов.

Тестовое задание на должность «Фронтенд разработчик React».

**Демо:** https://oksnard.github.io/green-api-max-chat/

## Что умеет

- Вход по `idInstance` и `apiTokenInstance` — данные проверяются запросом к GREEN-API и хранятся только в `localStorage` этого браузера.
- Создание чата по номеру телефона: номер проверяется методом `checkAccount`, из ответа берётся `chatId`.
- Отправка текста методом `sendMessage`.
- Приём ответов методом `receiveNotification` (long-polling) с обязательным подтверждением через `deleteNotification`.
- История переписки по каждому чату, счётчики непрочитанных, повторная отправка при ошибке.
- Светлая и тёмная темы.

## Стек

React 19, TypeScript 5.7 (strict), Vite 6, Tailwind CSS 4, Zustand 5, Vitest 2 + React Testing Library.

## Локальный запуск

Нужен Node.js 20 или новее (проверено на 22 и 25).

```bash
git clone https://github.com/Oksnard/green-api-max-chat.git
cd green-api-max-chat
npm install
npm run dev
```

Vite напечатает адрес — по умолчанию http://localhost:5173.

### Учётные данные

1. Зайдите в [личный кабинет GREEN-API](https://console.green-api.com/) и создайте инстанс **MAX**.
2. Скопируйте `idInstance` и `apiTokenInstance`.
3. Введите их на экране входа в приложении.

В репозитории нет ни одного секрета: токен вводится в интерфейсе и остаётся в браузере.

### Проверка сценария из задания

1. Откройте приложение и войдите с реальными `idInstance` и `apiTokenInstance`.
   Если на инстансе выставлен `webhookUrl`, приложение предложит очистить его одной кнопкой — при включённом вебхуке GREEN-API не отдаёт уведомления по HTTP.
2. Нажмите «+» и введите номер получателя в формате `+7 999 123-45-67` или `+375 29 123-45-67`. Приложение вызовет `checkAccount` и создаст чат.
3. Напишите текстовое сообщение и отправьте его.
4. Ответьте с другого номера MAX — сообщение появится в ленте автоматически.

## Архитектура

Проект не имеет бэкенда. Браузер обращается к `api.green-api.com` напрямую — CORS открыт (`Access-Control-Allow-Origin: *`). Токен не покидает браузер пользователя.

```
src/
  api/              клиент GREEN-API: 7 методов, маппинг ошибок
  domain/           Chat, Message, ChatId
  stores/           Zustand-хранилища (persist → localStorage)
  services/         poller (long-poll цикл), sender (отправка и повтор)
  components/       Avatar, Composer, MessageBubble, Sidebar, …
  screens/          LoginScreen, ChatScreen
  hooks/            useTheme
  lib/              форматирование времени
```

Три границы, которые нельзя пересекать:

1. `api/` не знает про React и Zustand — только `fetch` и типы.
2. `services/poller.ts` — единственное место, где живёт сетевой цикл.
3. `stores/` — единственный источник правды. Компоненты только читают и вызывают экшены.

## Тесты

Запуск: `npm test`

| Файл | Что проверяет |
|---|---|
| `api/greenApi.test.ts` | пустое тело `receiveNotification`; 429; 400 с `reason`; битый JSON; кодирование `chatId`; формирование `apiUrl` |
| `services/poller.test.ts` | входящее доходит до стора; ACK при ошибке обработки; остановка по `AbortSignal`; нет вторичного цикла |
| `stores/chatsStore.test.ts` | непрочитанные; дедупликация по `idMessage`; создание чата из входящего; `failed` |
| `components/Composer.test.tsx` | Enter отправляет; Shift+Enter переносит; пустое не отправляется; > 4000 символов блокируется |
| `screens/LoginScreen.test.tsx` | авторизация; состояния инстанса; починка настроек |
| `screens/ChatScreen.test.tsx` | поллер; отправка; создание чата; ошибки номера |

## Деплой

GitHub Actions → `npm ci && npm run build` → `actions/deploy-pages`.
`base: '/green-api-max-chat/'` в `vite.config.ts`.

**Секретов в репозитории нет.** `apiTokenInstance`, использованный при разработке, в код не попадает.

# MANTROVA STUDIO — версия "GitHub Pages + Cloudflare Worker"

Эта сборка сделана **именно под ваш новый сценарий**:

- **основной сайт** работает как обычный статический сайт на **GitHub Pages**;
- **Cloudflare нужен только для двух задач**:
  1. принять заказ, отправить его в Telegram и сохранить в GitHub;
  2. сохранить изменения из админки в GitHub через токен, который лежит в секрете Worker.

То есть сам магазин — **чистый GitHub**.

---

## Что внутри

### Папка `docs/`
Это сам сайт для GitHub Pages.

- `docs/index.html` — основной магазин
- `docs/admin/index.html` — панель управления
- `docs/call-center/index.html` — колл-центр
- `docs/assets/style.css` — дизайн
- `docs/assets/app.js` — логика
- `docs/data/site.json` — оформление, контакты, баннеры, правила доставки
- `docs/data/products.json` — товары
- `docs/data/zones.geojson` — зоны доставки

### Папка `worker/`
Это Cloudflare Worker, который:

- принимает заказы;
- отправляет уведомление в Telegram;
- записывает заказы в GitHub;
- читает/обновляет заказы для колл-центра;
- читает/сохраняет `site.json`, `products.json`, `zones.geojson` для админки.

---

# ВАЖНО ПРО АРХИТЕКТУРУ

## Как будет работать правильно

Лучше всего использовать **2 GitHub-репозитория**:

### 1. Публичный репозиторий сайта
Например:
`mantrova-studio-site`

В него вы заливаете папку `docs/`.
Он публикуется через GitHub Pages.

### 2. Приватный репозиторий заказов
Например:
`mantrova-studio-orders`

В нём Worker будет хранить файл:
`data/orders.json`

Почему так:
- каталог и оформление сайта можно хранить в публичном репозитории;
- заказы нельзя хранить в публичном репозитории сайта.

---

# ЧТО И КУДА ВСТАВЛЯТЬ

## ШАГ 1. Создайте репозиторий сайта

Создайте на GitHub новый репозиторий, например:
`mantrova-studio-site`

Сделайте его:
- **public**, если хотите GitHub Pages без платного плана;
- либо **private**, если у вас подходящий GitHub план для Pages.

GitHub Docs указывают, что GitHub Pages доступен в public-репозиториях на бесплатных тарифах, а для private-репозиториев Pages зависит от плана. Кроме того, опубликованный Pages-сайт всё равно доступен в интернете. citeturn867154search6turn867154search3turn867154search9

### Что загрузить
Из этого архива загрузите **всё содержимое папки `docs/`** в корень репозитория.

То есть в репозитории должны лежать:

- `index.html`
- `admin/`
- `call-center/`
- `assets/`
- `data/`

Если хотите оставить папку `docs/` как есть — тоже можно, но тогда в GitHub Pages выберите source = `Deploy from a branch`, branch = `main`, folder = `/docs`.

---

## ШАГ 2. Включите GitHub Pages

В репозитории:

- `Settings`
- `Pages`
- `Build and deployment`
- `Source` → `Deploy from a branch`
- `Branch` → `main`
- `Folder` → `/docs`
- `Save`

После этого GitHub даст вам адрес сайта.

---

## ШАГ 3. Создайте приватный репозиторий для заказов

Создайте второй репозиторий:
`mantrova-studio-orders`

Сделайте его **private**.

Создайте внутри файл:
`data/orders.json`

И вставьте в него:

```json
[]
```

---

## ШАГ 4. Создайте GitHub token

Нужен **fine-grained personal access token**.
GitHub рекомендует по возможности использовать именно fine-grained token вместо classic. citeturn867154search20turn867154search2

### Где создать
- GitHub
- `Settings`
- `Developer settings`
- `Personal access tokens`
- `Fine-grained tokens`
- `Generate new token`

### Что указать
- доступ к репозиторию сайта;
- доступ к репозиторию заказов.

### Какие права дать
Минимально нужен доступ на чтение и запись содержимого репозиториев через API contents. GitHub описывает permissions для fine-grained tokens отдельно. citeturn867154search5

---

## ШАГ 5. Создайте Worker в Cloudflare

В Cloudflare:
- `Workers & Pages`
- `Create`
- `Worker`

Создайте Worker, например с именем:
`mantrova-github-bridge`

---

## ШАГ 6. Загрузите код Worker

Откройте папку `worker/`.

В файл Worker вставьте код из:
- `worker/index.js`

Если деплоите через Wrangler:

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Cloudflare рекомендует хранить чувствительные данные именно в secrets, а не в обычных vars/конфиге. citeturn867154search1turn867154search13turn867154search19

---

## ШАГ 7. Добавьте секреты в Worker

Добавьте такие secrets:

### 1. `GITHUB_TOKEN`
Ваш GitHub fine-grained token.

### 2. `ADMIN_PASSWORD`
Пароль для входа в админку и колл-центр.

### 3. `STORE_REPO_OWNER`
Ваш GitHub username или organization.

Пример:
`mantrova-studio`

### 4. `STORE_REPO_NAME`
Имя репозитория сайта.

Пример:
`mantrova-studio-site`

### 5. `STORE_SITE_PATH`
```text
docs/data/site.json
```
Если у вас сайт лежит в корне репозитория, тогда:
```text
data/site.json
```

### 6. `STORE_PRODUCTS_PATH`
```text
docs/data/products.json
```
или
```text
data/products.json
```

### 7. `STORE_ZONES_PATH`
```text
docs/data/zones.geojson
```
или
```text
data/zones.geojson
```

### 8. `ORDERS_REPO_OWNER`
Владелец приватного репозитория заказов.

### 9. `ORDERS_REPO_NAME`
Имя приватного репозитория заказов.

Пример:
`mantrova-studio-orders`

### 10. `ORDERS_FILE_PATH`
```text
data/orders.json
```

### 11. `GITHUB_BRANCH`
Обычно:
```text
main
```

### 12. `TG_BOT_TOKEN`
Токен Telegram-бота.

### 13. `TG_CHAT_ID`
ID чата, куда будут приходить заказы.

---

## ШАГ 8. Вставьте адрес Worker в сайт

Откройте файл:
`docs/assets/app.js`

В самом верху найдите строку:

```js
const WORKER_BASE = window.MS_WORKER_BASE || 'https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev';
```

И замените её на ваш адрес Worker.

Пример:

```js
const WORKER_BASE = 'https://mantrova-github-bridge.xxx.workers.dev';
```

Потом закоммитьте изменение в GitHub.

---

# КАК РАБОТАТЬ С САЙТОМ

## Основной сайт

Редактируется из файлов:

### Оформление и контакты
`docs/data/site.json`

### Товары
`docs/data/products.json`

### Зоны доставки
`docs/data/zones.geojson`

Но вручную это делать не обязательно — можно через админку.

---

## Админка

Адрес:

```text
https://ВАШ-САЙТ/admin/
```

Она:
- читает `site.json`, `products.json`, `zones.geojson` через Worker;
- после нажатия кнопки **"Сохранить всё в GitHub"** Worker коммитит изменения в репозиторий сайта.

---

## Колл-центр

Адрес:

```text
https://ВАШ-САЙТ/call-center/
```

Он:
- читает `orders.json` из приватного репозитория через Worker;
- меняет статусы заказов;
- сохраняет изменения обратно в private repo.

---

# ЧТО МОЖНО МЕНЯТЬ ПРЯМО СЕЙЧАС

## 1. Товары

Файл:
`docs/data/products.json`

Каждый товар выглядит так:

```json
{
  "id": "alenka-photo",
  "slug": "alenka-photo",
  "category": "Именной шоколад Алёнка",
  "name": "Шоколад “Алёнка” с фото",
  "description": "Описание",
  "price": 390,
  "image": "https://...",
  "badges": ["именной", "подарок"],
  "active": true,
  "options": [
    { "name": "1 плитка", "price": 390 },
    { "name": "3 плитки", "price": 990 }
  ]
}
```

---

## 2. Акции

Файл:
`docs/data/site.json`

Блок:

```json
"banners": [
  {
    "title": "Карта звёздного неба",
    "text": "Памятный подарок по дате и месту события.",
    "accent1": "#ffdbe7",
    "accent2": "#f0a9c3"
  }
]
```

---

## 3. Правила доставки

Тоже в `docs/data/site.json`:

```json
"delivery_rules": [
  { "zone": "Основная зона", "min_order_sum": 0, "delivery_price": 150 },
  { "zone": "Основная зона", "min_order_sum": 700, "delivery_price": 100 },
  { "zone": "Основная зона", "min_order_sum": 1500, "delivery_price": 0 }
]
```

---

# ЧЕСТНО ОГРАНИЧЕНИЯХ ЭТОЙ СХЕМЫ

1. **Это не realtime-база.**
   Заказы и настройки сохраняются в GitHub JSON-файлы коммитами.

2. **При большом количестве заказов** JSON-файл `orders.json` со временем станет тяжёлым.
   Для старта и небольшого магазина это нормально, но при росте лучше перейти на D1 или другое хранилище.

3. **Админка и колл-центр — статические страницы.**
   Защита данных идёт через пароль Worker API, а не через полноценный backend-сеанс.

4. **Если сайт публикуется через GitHub Pages, он публичен как сайт.**
   Даже если сам репозиторий private и план это позволяет, опубликованный сайт доступен по URL. citeturn867154search3turn867154search18

---

# ЧТО Я РЕКОМЕНДУЮ СРАЗУ ПОСЛЕ ЗАПУСКА

1. Сначала поднять сайт именно в этой схеме.
2. Проверить оформление заказа и Telegram.
3. Заполнить реальные товары и ссылки.
4. Потом отдельно добавить:
   - Яндекс.Карты с реальным определением адреса;
   - скрытие админки/колл-центра через Cloudflare Access;
   - загрузку фото не по URL, а через отдельный storage.


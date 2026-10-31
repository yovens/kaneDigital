# Kanè Dijital: API Laravel + PWA (Semèn 1–4)

Kaye kredi dijital pou ti biznis ayisyen: kliyan, kredi, peman, balans HTG/USD,
rapèl WhatsApp/SMS, paj piblik pou kliyan an, ak senkronizasyon pou mòd offline.

## Enstalasyon

**Sa w bezwen:** PHP 8.2+, Composer, ekstansyon `pdo_sqlite` (oswa MySQL).

```bash
bash setup.sh            # kreye ./kane-dijital-app, kopye kòd la, migrate, seed, tès
cd kane-dijital-app
php artisan serve        # louvri http://localhost:8000/app/
```

Kont demo: **telefòn `3700-0000`, PIN `1234`**.

### Si w pa ka itilize bash (Windows san Git Bash)
1. `composer create-project laravel/laravel kane-dijital-app`
2. `cd kane-dijital-app` epi `php artisan install:api`
3. Kopye tout sa ki nan dosye `src/` la anndan `kane-dijital-app/` (aksepte ranplase fichye yo)
4. Efase `tests/Feature/ExampleTest.php`, epi kopye dosye `frontend/` la nan `kane-dijital-app/public/app/` (san `dev/` ak `package.json`)
5. Nan `config/app.php`, mete `'timezone' => env('APP_TIMEZONE', 'America/Port-au-Prince'),`
6. `php artisan migrate:fresh --seed` epi `php artisan test`

### MySQL olye SQLite
Nan `.env`: `DB_CONNECTION=mysql`, `DB_DATABASE=kane_dijital`, `DB_USERNAME=...`, `DB_PASSWORD=...`

## Sa ki ladan l

| Fichye | Wòl |
|---|---|
| `app/Models/*` | User (telefòn + PIN), Business, Customer, Transaction, Reminder |
| `app/Observers/TransactionObserver.php` | Rekalkile balans kliyan an apre chak chanjman |
| `app/Services/SyncService.php` | Push/pull pou mòd offline (idanpotan ak uuid) |
| `app/Support/HaitiPhone.php` | `3700-1234` → `50937001234` (fòma WhatsApp) |
| `app/Http/Controllers/Api/*` | Tout API a |
| `resources/views/kane/show.blade.php` | Paj piblik `/k/{token}` kliyan an wè |
| `tests/Feature/Kane/*` | 33 tès |
| `frontend/` | PWA a (vin `public/app/` nan Laravel) |

## API

Tout wout yo kòmanse ak `/api`. Apre login, voye header `Authorization: Bearer {token}`.

### Koneksyon
| Metòd | Wout | Kò |
|---|---|---|
| POST | `/auth/register` | `name, phone, pin, pin_confirmation, business_name, currency_default?` |
| POST | `/auth/login` | `phone, pin, device_name?` (5 tantativ/minit) |
| GET | `/auth/me` | |
| POST | `/auth/logout` | |

### Biznis ak tablodbò
| Metòd | Wout | Nòt |
|---|---|---|
| GET/PUT | `/business` | `name, address, phone, currency_default` |
| GET | `/dashboard` | total moun dwe, jodi a, semèn nan, top 5, kliyan an reta |

### Kliyan
| Metòd | Wout | Nòt |
|---|---|---|
| GET | `/customers?search=&filter=owing&sort=balance\|name\|recent` | paj 50 |
| POST | `/customers` | `name, phone?, uuid?` |
| GET | `/customers/{uuid}` | ak 20 dènye tranzaksyon |
| PUT | `/customers/{uuid}` | |
| DELETE | `/customers/{uuid}` | soft delete |

### Tranzaksyon
| Metòd | Wout | Kò |
|---|---|---|
| GET | `/customers/{uuid}/transactions` | |
| POST | `/customers/{uuid}/transactions` | `type (credit\|payment), amount, currency?, note?, occurred_at?, uuid?` |
| PATCH | `/transactions/{uuid}` | `amount?, note?, occurred_at?` |
| DELETE | `/transactions/{uuid}` | |

Chak repons tranzaksyon gen `customer` ak **nouvo balans lan**, kidonk ekran an ka mete l ajou touswit.

### Rapèl
| Metòd | Wout | Repons |
|---|---|---|
| POST | `/customers/{uuid}/reminders` | `message, whatsapp_url, sms_url` |

Aplikasyon an louvri `whatsapp_url`, epi mèt boutik la jis peze "Voye". Sa pa koute anyen.

### Senkronizasyon (offline)
| Metòd | Wout | Nòt |
|---|---|---|
| POST | `/sync/push` | `{ customers: [...], transactions: [...] }` → `accepted`, `rejected` |
| GET | `/sync/pull?since=ISO8601` | tout sa ki chanje (enkli sa ki efase), `next_since`, `has_more` |

Règ yo:
- Telefòn nan **kreye uuid** pou chak kliyan ak tranzaksyon. Voye menm bagay la 2 fwa pa janm kreye doub.
- Kliyan: "dènye ki modifye a genyen" (`updated_at`).
- Tranzaksyon: yo pa modifye pa sync. Pou korije yon erè, voye `deleted_at` epi kreye yon nouvo tranzaksyon.
- Sere `next_since` la, epi voye l nan pwochen pull la. Si `has_more` = true, rele pull ankò.

## Kòmand itil
```bash
php artisan kane:recalculate            # rekalkile tout balans yo
php artisan kane:recalculate --business=1
```

## PWA a (`frontend/`)

JavaScript pi (modil ES), **san depandans ni etap build**. Laravel sèvi l nan `/app/`.
Li pi lejè sou ti telefòn Android yo, epi pa gen anyen pou konpile.

| Fichye | Wòl |
|---|---|
| `js/db.js` | Ti wrapper IndexedDB: tout done yo viv nan telefòn nan |
| `js/store.js` | Aksyon lokal yo (kliyan, kredi, peman, efase) ak `_dirty` |
| `js/sync.js` | Motè sync la: push, apre sa pull, otomatik (lè entènèt tounen, chak minit, lè app la louvri) |
| `js/stats.js` | Balans ak tablodbò a kalkile lokalman (menm règ "an reta" ak backend la) |
| `js/reminder.js` | Mesaj WhatsApp/SMS bati sou telefòn nan, kidonk li mache offline |
| `js/views/*` | Ekran yo: login, kont, akèy (gwo bouton), kliyan, rapò, kliyan detay, kredi/peman, paramèt |
| `sw.js` | Service worker: aplikasyon an louvri san entènèt |
| `dev/mock-api.mjs` | Fo API ki imite Laravel la: pou travay sou entèfas la san backend |
| `dev/e2e.mjs` | 42 verifikasyon nan yon vrè navigatè (offline, sync, limit, rapèl...) |

### Travay sou entèfas la san Laravel
```bash
cd frontend
node dev/mock-api.mjs        # http://localhost:8787/app/ (telefòn 3700-0000, PIN 1234)
```

### Lanse tès E2E yo
```bash
cd frontend
npm install && npm run e2e:setup
npm run e2e                  # SHOTS=./shots npm run e2e pou kapti ekran yo
```

### Lè w mete yon nouvo vèsyon an liy
Chanje `VERSION` nan `sw.js` (pa egzanp `kane-v2`). Sinon telefòn yo ap kontinye itilize ansyen fichye yo.

### Si API a sou yon lòt domèn
Nan `index.html`, chanje `window.KANE_API_BASE`, epi louvri CORS pou domèn PWA a nan `config/cors.php`.

## Pwochen etap
- Teste ak 5–10 vrè boutik (semèn 6)
- v2: peman MonCash, SMS otomatik, plan Pro

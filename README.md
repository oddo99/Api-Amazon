# Smart Analytics

**powered by Mela Services**

Dashboard per analisi e gestione dei venditori Amazon, con integrazione completa alle Amazon SP-API.

## 🔒 Sicurezza - READ ONLY per Amazon

**IMPORTANTE**: Questa applicazione è completamente **READ-ONLY** per Amazon.

- ✅ Legge SOLO dati da Amazon (ordini, finanze, inventario)
- ✅ NESSUNA modifica viene mai fatta su Amazon
- ✅ Tutte le modifiche (costi prodotti, prezzi, note) sono salvate SOLO nel database locale
- ✅ Nessun rischio di alterare dati su Amazon Seller Central

📄 **Leggi il documento completo**: [SECURITY.md](./SECURITY.md)

## Funzionalità

### ✅ Implementate
- **Dashboard Profitti**: Visualizzazione in tempo reale di vendite, ordini, commissioni e profitto netto
- **Gestione Prodotti**: Lista prodotti con metriche, modifica costi e prezzi (LOCALE)
- **Gestione Inventario**: Monitoraggio stock con alert automatici per prodotti in esaurimento
- **Sincronizzazione Automatica**: Job scheduler per sync periodica di ordini, finanze e inventario
- **Analytics**: Grafici profitti, breakdown per prodotto, trend analysis
- **API Integration**: Integrazione completa con Amazon SP-API (Orders, Finances, Inventory) - SOLO LETTURA

### 🔄 Future Features
- PPC Optimization (Amazon Advertising API)
- Review Management
- Listing Change Alerts
- Export Reports (CSV/Excel)
- Multi-account support

## Stack Tecnologico

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Bull (Redis)
- **Amazon API**: amazon-sp-api SDK

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Language**: TypeScript

## Struttura del Progetto

```
.
├── backend/
│   ├── src/
│   │   ├── api/           # REST API routes
│   │   ├── services/      # Business logic & SP-API
│   │   ├── jobs/          # Background sync jobs
│   │   ├── config/        # Configuration
│   │   └── index.ts       # Server entry point
│   └── prisma/
│       └── schema.prisma  # Database schema
│
├── frontend/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   └── lib/               # API client
│
└── shared/                # Shared types (future)
```

## Prerequisiti

- Node.js 18+ e npm
- PostgreSQL 14+
- Redis 6+
- Account Amazon Seller con SP-API credentials

## Setup

### 1. Clone e Installazione

```bash
# Installa dipendenze
npm install

# Setup backend
cd backend
cp .env.example .env
# Modifica .env con le tue credenziali
```

### 2. Configurazione Database

```bash
# Crea database PostgreSQL
createdb sellerboard

# Genera Prisma Client
cd backend
npm run db:generate

# Esegui migrations
npm run db:migrate
```

### 3. Configurazione Amazon SP-API

Per ottenere le credenziali SP-API:

1. Vai su https://developer-docs.amazon.com/sp-api/
2. Registra la tua applicazione
3. Ottieni:
   - Client ID
   - Client Secret
   - Refresh Token

Aggiungi le credenziali nel file `backend/.env`:

```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=xxxxx
AMAZON_REFRESH_TOKEN=Atzr|xxxxx
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

**Marketplace IDs**:
- US: `ATVPDKIKX0DER`
- UK: `A1F83G8C2ARO7P`
- DE: `A1PA6795UKMFR9`
- FR: `A13V1IB3VIYZZH`
- IT: `APJ6JRA9NG5V4`
- ES: `A1RKKUPIHCS9HS`

### 4. Setup Redis

```bash
# MacOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Modifica se necessario (default: http://localhost:3001/api)
```

### 6. Creazione Account

Prima di avviare l'app, crea un account nel database:

```bash
# Apri Prisma Studio
cd backend
npm run db:studio
```

Crea un nuovo record nella tabella `Account` con:
- `sellerId`: Il tuo Seller ID Amazon
- `marketplaceId`: Es. `ATVPDKIKX0DER` (US)
- `accessToken`: Inizialmente vuoto (verrà generato)
- `refreshToken`: Il tuo refresh token SP-API
- `expiresAt`: Una data futura
- `region`: `na`, `eu`, o `fe`

## Avvio Applicazione

### Sviluppo (Monorepo)

```bash
# Dalla root, avvia tutto insieme
npm run dev
```

Questo avvierà:
- Backend su http://localhost:3001
- Frontend su http://localhost:3000

### Sviluppo (Separato)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Produzione

```bash
# Build
npm run build

# Start
npm run start
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/:accountId?days=30` - Dashboard data

### Ordini
- `GET /api/orders/:accountId` - Lista ordini
- `GET /api/orders/:accountId/:orderId` - Dettaglio ordine

### Prodotti
- `GET /api/products/:accountId` - Lista prodotti
- `GET /api/products/:accountId/:productId` - Dettaglio prodotto
- `PUT /api/products/:accountId/:productId` - Aggiorna prodotto

### Analytics
- `GET /api/analytics/profit/:accountId` - Calcolo profitti
- `GET /api/analytics/profit-by-product/:accountId` - Profitti per prodotto

### Inventario
- `GET /api/inventory/:accountId` - Lista inventario
- `GET /api/inventory/:accountId/alerts` - Alert stock basso

### Sincronizzazione
- `POST /api/sync/:accountId` - Trigger sync manuale
- `GET /api/sync/status/:accountId` - Status sync jobs

## Sincronizzazione Automatica

Il sistema sincronizza automaticamente i dati da Amazon:

- **Ordini**: Ogni 5 minuti
- **Finanze**: Ogni 10 minuti
- **Inventario**: Ogni 15 minuti

Puoi modificare gli intervalli in `backend/.env`:

```env
SYNC_ORDERS_INTERVAL=300000
SYNC_FINANCES_INTERVAL=600000
SYNC_INVENTORY_INTERVAL=900000
```

## Database Schema

### Tabelle Principali

- `Account` - Account Amazon SP-API
- `Product` - Prodotti (SKU, ASIN, prezzo, costo)
- `Order` - Ordini Amazon
- `OrderItem` - Item degli ordini
- `FinancialEvent` - Eventi finanziari (revenue, fees, refunds)
- `Inventory` - Livelli inventario
- `SyncJob` - Log sync jobs

## Calcolo Profitti

Il profitto viene calcolato come:

```
Net Profit = Revenue - Refunds - Amazon Fees - COGS
Margin = (Net Profit / Revenue) × 100
```

Dove:
- **Revenue**: Totale vendite
- **Refunds**: Rimborsi
- **Amazon Fees**: Commissioni Amazon (referral, FBA, ecc.)
- **COGS**: Cost of Goods Sold (costo prodotto impostato manualmente)

## Troubleshooting

### Errore: "No Amazon Account Connected"
1. Verifica di aver creato un account nel database
2. Verifica le credenziali SP-API nel file `.env`

### Errore SP-API "Invalid credentials"
1. Verifica che il refresh token sia valido
2. Verifica che client ID e secret siano corretti
3. Verifica che la region corrisponda al marketplace

### Redis connection error
```bash
# Verifica che Redis sia in esecuzione
redis-cli ping
# Dovrebbe rispondere: PONG
```

### Database connection error
```bash
# Verifica PostgreSQL
psql -l

# Verifica DATABASE_URL in .env
```

## Sicurezza

⚠️ **IMPORTANTE**:
- Non committare mai i file `.env` con credenziali reali
- Le credenziali SP-API sono sensibili, proteggile
- Usa HTTPS in produzione
- Implementa autenticazione utente prima di esporre pubblicamente

## Limitazioni Amazon SP-API

- **Rate Limits**: Le API hanno limiti di richieste. Il sistema usa code e retry automatici.
- **Data Retention**: Alcuni dati sono disponibili solo per periodi limitati
- **Sandbox**: Usa l'ambiente sandbox per testing

## Contribuire

Questo è un progetto locale/personale, ma se vuoi estenderlo:

1. Aggiungi test (Jest/Vitest)
2. Implementa autenticazione multi-utente
3. Aggiungi supporto PPC (Advertising API)
4. Implementa export reports
5. Aggiungi notifiche email/push

## Risorse

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Sellerboard](https://sellerboard.com) - Ispirazione
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)

## License

MIT

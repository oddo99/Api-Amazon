# Smart Analytics - Amazon Seller Analytics Platform

## Descrizione Progetto
Smart Analytics è una piattaforma di analytics per venditori Amazon che permette di:
- Analizzare vendite, profitti e metriche di performance
- Gestire inventario e alert di rifornimento
- Monitorare costi dettagliati (commissioni, shipping, ads)
- Confrontare performance tra marketplace
- Gestire più account Amazon tramite Solution Provider

## Stack Tecnologico

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State**: React Context API
- **Auth**: JWT tokens in localStorage

### Backend
- **Runtime**: Node.js con TypeScript
- **Framework**: Express.js
- **ORM**: Prisma 5.22.0
- **Database**: MySQL (MAMP su localhost:8889)
- **Queue**: Bull with Redis
- **API Amazon**: amazon-sp-api package
- **Watch Mode**: tsx watch (auto-reload)

### Infrastructure
- **Workspace**: npm workspaces (monorepo)
- **Dev Server**: concurrently per frontend + backend
- **Database Server**: MAMP MySQL su porta 8889

## Struttura Progetto

```
/
├── backend/                 # Backend Express API
│   ├── src/
│   │   ├── api/            # Route handlers
│   │   │   ├── routes.ts   # Main API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── clients.routes.ts
│   │   ├── services/       # Business logic
│   │   │   ├── order.service.ts
│   │   │   ├── finance.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── spapi.service.ts
│   │   │   └── analytics.service.ts
│   │   ├── jobs/           # Background jobs
│   │   │   ├── sync.jobs.ts    # Bull queue jobs
│   │   │   └── sync.direct.ts  # Direct sync functions
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   └── authorization.middleware.ts
│   │   ├── config/         # Configuration
│   │   └── index.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── .env                # Environment variables
│
├── frontend/               # Next.js Frontend
│   ├── app/               # App Router pages
│   │   ├── page.tsx       # Dashboard (/)
│   │   ├── orders/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── analytics/
│   │   └── auth/
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── SyncButton.tsx
│   │   ├── FiltersBar.tsx
│   │   └── ClientSelector.tsx
│   ├── lib/
│   │   ├── api.ts         # API client
│   │   ├── amazonUtils.ts # Amazon utility functions
│   │   ├── currency.ts
│   │   └── contexts/      # React contexts
│   └── .env.local         # Frontend env vars
│
└── package.json           # Root workspace config
```

## Porte e Configurazione

### Server Ports
- **Frontend**: http://localhost:3001 (Next.js dev server)
- **Backend**: http://localhost:3002 (Express API)
- **Database**: localhost:8889 (MAMP MySQL)
- **Redis**: localhost:6379

### Database
- **Name**: `sellerboard`
- **User**: `root`
- **Password**: `root`
- **Host**: `localhost`
- **Port**: `8889`

### Comandi Principali

```bash
# Avviare tutto (frontend + backend)
npm run dev

# Solo backend
cd backend && npm run dev

# Solo frontend
cd frontend && npm run dev

# Database schema push
cd backend && npx prisma db push

# Generate Prisma client
cd backend && npx prisma generate
```

## Convenzioni di Naming

### Marketplace
**IMPORTANTE**: Usare sempre nomi ITALIANI per i marketplace:
- ✅ Italia (non Italy, non amazon.it)
- ✅ Germania (non Germany, non amazon.de)
- ✅ Francia (non France, non amazon.fr)
- ✅ Spagna (non Spain, non amazon.es)
- ✅ Regno Unito (non UK, non United Kingdom)
- ✅ Paesi Bassi (non Netherlands, non Holland)

Mappatura completa in `backend/src/api/routes.ts` (linee 858-872)

### Marketplace IDs Amazon
```
APJ6JRA9NG5V4    → Italia
A1PA6795UKMFR9   → Germania
A13V1IB3VIYZZH   → Francia
A1RKKUPIHCS9HS   → Spagna
A1F83G8C2ARO7P   → Regno Unito
A1805IZSGTT6HS   → Paesi Bassi
ATVPDKIKX0DER    → Stati Uniti
```

### Date Format
- Backend: ISO 8601 string
- Frontend display: `dd/mm/yyyy`
- API parameters: `yyyy-mm-dd`

### Currency
- Primary: EUR (€)
- Format: `€1.234,56` (Italian locale)

## Decisioni di Design Chiave

### 1. Sincronizzazione Dati Amazon
- **Sincronizzazione automatica** all'avvio del backend via Redis queue
- **Pulsante sync manuale** nella dashboard (solo "Sincronizza" - no dropdown)
- **NO animazioni** dettagliate dei job in corso (troppo spazio)
- Sync types: orders, finances, inventory (tutti insieme di default)

### 2. Filtri Marketplace
- I marketplace vengono estratti dinamicamente dal database
- Solo marketplace ID ufficiali vengono mostrati (filtro in `routes.ts:877`)
- NO duplicati (es. "Italia" e "amazon.it" sono la stessa cosa)

### 3. Autenticazione
- JWT tokens stored in localStorage
- Middleware: `authenticate` (verifica token) + `authorizeAccount` (verifica accesso account)
- User roles: user, admin
- Multi-account access via UserAccountAccess table

### 4. Solution Provider Support
- Un account può gestire più "client" (altri seller)
- `sellingPartnerId` parameter nelle sync per specificare quale client
- Table: `SolutionProviderClient`

### 5. Financial Events
- Usa API Finances v2024-06-19 (non deprecated)
- Sync in chunks di 30 giorni per evitare TTL expiration
- Stati: DEFERRED, DEFERRED_RELEASED, RELEASED
- Eventi: OrderRevenue, Fee, Refund, etc.

## API Endpoints Principali

### Dashboard
- `GET /api/dashboard/:accountId` - Dashboard overview
- `GET /api/dashboard/:accountId/daily` - Daily stats chart

### Orders
- `GET /api/orders/:accountId` - List orders
- `GET /api/orders/:accountId/:orderId` - Order details
- `GET /api/orders/:accountId/:orderId/balance` - Order balance breakdown

### Products
- `GET /api/products/:accountId` - List products (or top selling if date range)
- `PUT /api/products/:accountId/:productId` - Update product (cost/price)

### Sync
- `POST /api/sync/:accountId` - Trigger sync (body: { type?, sellingPartnerId? })
- `GET /api/sync/status/:accountId` - Get sync jobs status

### Filters
- `GET /api/marketplaces/:accountId` - Available marketplaces (filtered & Italian names)
- `GET /api/products/:accountId` - Available products for filters

## Problemi Comuni e Soluzioni

### 1. "Failed to fetch" nel frontend
**Causa**: Backend non connesso al database MySQL
**Soluzione**: Verificare che MAMP MySQL sia avviato su porta 8889

### 2. Frontend non carica
**Causa**: npm run dev eseguito dalla cartella sbagliata
**Soluzione**: Eseguire dalla root del progetto, non da backend/

### 3. Marketplace duplicati nei filtri
**Causa**: Marketplace ID non mappati nel backend
**Soluzione**: Filtro applicato in `routes.ts:877` - solo ID mappati vengono restituiti

### 4. Sincronizzazione non parte
**Causa**: Redis non disponibile
**Soluzione**: Verificare che Redis sia in esecuzione (`brew services start redis`)

## Environment Variables

### Backend (.env)
```bash
PORT=3002
NODE_ENV=development
DATABASE_URL="mysql://root:root@localhost:8889/sellerboard"
REDIS_HOST=localhost
REDIS_PORT=6379

# Amazon SP-API
AMAZON_CLIENT_ID=...
AMAZON_CLIENT_SECRET=...
AMAZON_REFRESH_TOKEN=...
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=APJ6JRA9NG5V4
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

## Note Importanti

1. **NON committare mai** file .env con credenziali reali
2. **Database locale** - tutti i dati Amazon sono in read-only, nessuna modifica su Amazon
3. **Workspace structure** - sempre usare npm workspaces, mai cd frontend/backend separatamente per install
4. **TypeScript strict** - mantenere type safety in tutto il progetto
5. **Naming italiano** - UI sempre in italiano, marketplace sempre con nomi italiani

## Modifiche Recenti

### 2025-10-17
- ✅ Rimosso menu dropdown dal pulsante sincronizzazione
- ✅ Rimossa visualizzazione dettagliata job sync in corso
- ✅ Unificati nomi marketplace (solo italiano, no duplicati)
- ✅ Filtrato marketplace non mappati dall'API

## Risorse

- [Amazon SP-API Docs](https://developer-docs.amazon.com/sp-api/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)

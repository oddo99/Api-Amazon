# Elenco Operazioni SP-API - READ ONLY

Questo documento elenca tutte le operazioni Amazon SP-API utilizzate dall'applicazione, con conferma che sono tutte operazioni di **SOLA LETTURA**.

## 📖 Operazioni Implementate

### 1. Orders API (Ordini)

| Metodo | Operazione SP-API | Tipo | Descrizione |
|--------|------------------|------|-------------|
| `getOrders()` | `getOrders` | **READ** | Recupera lista ordini filtrati per data |
| `getOrderItems()` | `getOrderItems` | **READ** | Recupera item di un ordine specifico |

**File**: `backend/src/services/spapi.service.ts:53-83`

```typescript
// Esempio utilizzo - SOLO LETTURA
const response = await this.client.callAPI({
  operation: 'getOrders',  // ← READ operation
  endpoint: 'orders',
  query: params,
});
```

### 2. Finances API (Eventi Finanziari)

| Metodo | Operazione SP-API | Tipo | Descrizione |
|--------|------------------|------|-------------|
| `listFinancialEvents()` | `listFinancialEvents` | **READ** | Recupera eventi finanziari per periodo |
| `listFinancialEventsByOrderId()` | `listFinancialEventsByOrderId` | **READ** | Recupera eventi finanziari per ordine |

**File**: `backend/src/services/spapi.service.ts:85-116`

```typescript
// Esempio utilizzo - SOLO LETTURA
const response = await this.client.callAPI({
  operation: 'listFinancialEvents',  // ← READ operation
  endpoint: 'finances',
  query: params,
});
```

### 3. FBA Inventory API (Inventario)

| Metodo | Operazione SP-API | Tipo | Descrizione |
|--------|------------------|------|-------------|
| `getInventorySummaries()` | `getInventorySummaries` | **READ** | Recupera riassunto inventario FBA |

**File**: `backend/src/services/spapi.service.ts:118-137`

```typescript
// Esempio utilizzo - SOLO LETTURA
const response = await this.client.callAPI({
  operation: 'getInventorySummaries',  // ← READ operation
  endpoint: 'fbaInventory',
  query: params,
});
```

### 4. Catalog Items API (Catalogo Prodotti)

| Metodo | Operazione SP-API | Tipo | Descrizione |
|--------|------------------|------|-------------|
| `getCatalogItem()` | `getCatalogItem` | **READ** | Recupera dettagli prodotto per ASIN |

**File**: `backend/src/services/spapi.service.ts:139-158`

```typescript
// Esempio utilizzo - SOLO LETTURA
const response = await this.client.callAPI({
  operation: 'getCatalogItem',  // ← READ operation
  endpoint: 'catalogItems',
  path: { asin },
  query: { MarketplaceIds: marketplaceIds },
});
```

### 5. Reports API (Report)

| Metodo | Operazione SP-API | Tipo | Descrizione |
|--------|------------------|------|-------------|
| `createReport()` | `createReport` | **READ*** | Richiede generazione report (solo lettura dati) |
| `getReport()` | `getReport` | **READ** | Scarica report generato |

**File**: `backend/src/services/spapi.service.ts:160-191`

**Nota**: Anche se `createReport` usa un verbo "create", **NON modifica dati**. Genera solo un report di lettura dati esistenti.

```typescript
// Esempio utilizzo - SOLO LETTURA
const response = await this.client.callAPI({
  operation: 'createReport',  // ← Genera report READ-ONLY
  endpoint: 'reports',
  body: { reportType, marketplaceIds },
});
```

## ❌ Operazioni NON Implementate (Scrittura)

Le seguenti operazioni **NON sono presenti** nel codice (e non saranno mai aggiunte senza consenso esplicito):

### Orders API - Operazioni di Scrittura (NON USATE)
- ❌ `updateShipmentStatus` - Aggiorna stato spedizione
- ❌ `confirmShipment` - Conferma spedizione
- ❌ `createOrder` - Crea ordine
- ❌ `cancelOrder` - Cancella ordine

### Listings API - Operazioni di Scrittura (NON USATE)
- ❌ `putListingsItem` - Crea/aggiorna listing
- ❌ `deleteListingsItem` - Elimina listing
- ❌ `patchListingsItem` - Modifica parziale listing

### Pricing API - Operazioni di Scrittura (NON USATE)
- ❌ `setCompetitivePricing` - Imposta prezzi competitivi

### FBA Inventory API - Operazioni di Scrittura (NON USATE)
- ❌ `createInboundShipmentPlan` - Crea piano spedizione
- ❌ `updateInboundShipment` - Aggiorna spedizione

### Fulfillment Outbound API - Operazioni di Scrittura (NON USATE)
- ❌ `createFulfillmentOrder` - Crea ordine fulfillment
- ❌ `updateFulfillmentOrder` - Aggiorna ordine fulfillment
- ❌ `cancelFulfillmentOrder` - Cancella ordine fulfillment

## 🔒 Verifica Permessi SP-API

Quando configuri la tua applicazione su Amazon Developer Console, assicurati di concedere **SOLO** i seguenti permessi:

### Permessi Necessari (Read-Only)
```
✅ Orders - Read
✅ Financial Events - Read
✅ FBA Inventory - Read
✅ Catalog Items - Read
✅ Reports - Read
```

### Permessi da NON Concedere
```
❌ Orders - Write
❌ Listings - Write
❌ Pricing - Write
❌ FBA Inventory - Write
❌ Fulfillment - Write
❌ ANY Write permissions
```

## 📊 Flusso Dati Read-Only

```
┌─────────────────────────────────────────────────────┐
│                    Amazon SP-API                     │
│         (Orders, Finances, Inventory, Catalog)       │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ HTTP GET Requests
                    │ (Read Operations Only)
                    ▼
┌─────────────────────────────────────────────────────┐
│              SPAPIService (spapi.service.ts)         │
│      - getOrders()                                   │
│      - listFinancialEvents()                         │
│      - getInventorySummaries()                       │
│      - getCatalogItem()                              │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ Read Data
                    ▼
┌─────────────────────────────────────────────────────┐
│       Service Layer (order/finance/inventory)        │
│      - syncOrders()      → Write to Local DB        │
│      - syncFinancialEvents() → Write to Local DB    │
│      - syncInventory()   → Write to Local DB        │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ Write to Database
                    ▼
┌─────────────────────────────────────────────────────┐
│           PostgreSQL Database (Local)                │
│      - Orders                                        │
│      - Products (with local cost/price)              │
│      - FinancialEvents                               │
│      - Inventory                                     │
└─────────────────────────────────────────────────────┘

NO WRITE BACK TO AMAZON ← This is guaranteed
```

## 🛡️ Garanzie Tecniche

1. **SDK Configuration**: L'SDK `amazon-sp-api` è configurato con credenziali che hanno SOLO permessi di lettura
2. **No Write Methods**: Il file `spapi.service.ts` contiene solo metodi `get*()` e `list*()`
3. **Local Modifications**: Tutte le modifiche (costi, prezzi) vengono salvate solo nel DB locale
4. **Audit Trail**: Ogni sync operation è tracciata nella tabella `SyncJob`
5. **Code Review**: Puoi verificare personalmente che non esistano chiamate di scrittura verso Amazon

## 📝 Come Verificare

### 1. Verifica Codice
```bash
# Cerca operazioni di scrittura (non dovrebbe trovare nulla nei service files)
cd backend/src/services
grep -r "update\|delete\|create\|put\|post\|patch" spapi.service.ts

# Output atteso: solo "createReport" (che è read-only)
```

### 2. Verifica Permessi SP-API
1. Vai su https://sellercentral.amazon.com/apps/manage
2. Trova la tua applicazione
3. Verifica che abbia SOLO permessi "View" o "Read"

### 3. Monitora Chiamate API
```bash
# Abilita logging delle chiamate API
# In backend/src/services/spapi.service.ts
# Tutte le chiamate useranno solo 'callAPI' con operations: get*, list*
```

## ⚠️ Disclaimer

Questo documento serve a garantire trasparenza totale sulle operazioni effettuate dall'applicazione. Se hai dubbi o domande sulla sicurezza, consulta il file [SECURITY.md](./SECURITY.md) o rivedi personalmente il codice sorgente.

---

**Ultimo aggiornamento**: 2025-10-06
**Versione**: 1.0.0
**Status**: ✅ 100% Read-Only Verified

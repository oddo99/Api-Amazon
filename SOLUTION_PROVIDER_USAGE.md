# 🏢 Guida Uso Solution Provider Multi-Cliente

## Congratulazioni! 🎉

L'app ora supporta completamente l'**accesso Solution Provider** con gestione multi-cliente!

---

## 🎯 Come Funziona

### Scenario Tipico

Sei un **Solution Provider** con accesso a 10, 50, o 100+ account clienti. Invece di:
- ❌ Far autorizzare ogni cliente separatamente
- ❌ Gestire 100 refresh token diversi

Puoi:
- ✅ Autorizzare UNA VOLTA con il tuo account Solution Provider
- ✅ Aggiungere i selling_partner_id dei clienti nell'app
- ✅ Vedere i dati di tutti i clienti in un'unica dashboard

---

## 📋 Setup Iniziale

### 1️⃣ Autorizza l'App (UNA VOLTA)

1. Vai su http://localhost:3000
2. Clicca **"Connetti con Amazon"**
3. Autorizza con il **TUO account Solution Provider**
4. Torni alla dashboard con l'account connesso

### 2️⃣ Marca l'Account come Solution Provider

**Opzione A: Tramite API**
```bash
curl -X POST http://localhost:3001/api/{ACCOUNT_ID}/upgrade-to-solution-provider
```

**Opzione B: Tramite Database**
```sql
UPDATE Account
SET isSolutionProvider = true
WHERE id = 'TUO_ACCOUNT_ID';
```

### 3️⃣ Aggiungi i Clienti

**Tramite API:**
```bash
curl -X POST http://localhost:3001/api/{ACCOUNT_ID}/clients \
  -H "Content-Type: application/json" \
  -d '{
    "sellingPartnerId": "A2XXXXXXXXXXXXX",
    "sellerName": "Nome Cliente 1",
    "marketplaceId": "APJ6JRA9NG5V4"
  }'
```

**Parametri:**
- `sellingPartnerId`: ID del venditore cliente (inizia con A2...)
- `sellerName`: Nome descrittivo (opzionale)
- `marketplaceId`: Marketplace del cliente (default: stesso del Solution Provider)

Ripeti per ogni cliente che vuoi gestire.

---

## 🖥️ Utilizzo Dashboard

### Dopo il Setup

Quando ricarichi http://localhost:3000, vedrai nell'header:

```
┌────────────────────────────────────────────────────┐
│ Amazon Seller Dashboard                            │
│                                                    │
│  View Client: [All Clients ▼]  [Sync Data]        │
└────────────────────────────────────────────────────┘
```

### Dropdown "View Client"

- **All Clients**: Visualizza dati aggregati di tutti i clienti
- **Cliente specifico**: Seleziona un cliente per vedere solo i suoi dati

### Sincronizzazione Dati

Quando clicchi **"Sync Data"**:
- Se hai selezionato "All Clients": sincronizza tutti i clienti
- Se hai selezionato un cliente: sincronizza solo quel cliente

---

## 📊 API Endpoints Disponibili

### Gestione Clienti

#### Lista Clienti
```http
GET /api/{accountId}/clients
```

**Response:**
```json
{
  "isSolutionProvider": true,
  "clients": [
    {
      "id": "cm1xxxxx",
      "sellingPartnerId": "A2XXXXXXXXX",
      "sellerName": "Cliente 1",
      "marketplaceId": "APJ6JRA9NG5V4",
      "isActive": true
    }
  ]
}
```

#### Aggiungi Cliente
```http
POST /api/{accountId}/clients
Content-Type: application/json

{
  "sellingPartnerId": "A2XXXXXXXXX",
  "sellerName": "Nome Cliente",
  "marketplaceId": "APJ6JRA9NG5V4"
}
```

#### Aggiorna Cliente
```http
PUT /api/{accountId}/clients/{clientId}
Content-Type: application/json

{
  "sellerName": "Nuovo Nome",
  "isActive": false
}
```

#### Rimuovi Cliente
```http
DELETE /api/{accountId}/clients/{clientId}
```

### Sincronizzazione con Cliente Specifico

```http
POST /api/sync/{accountId}
Content-Type: application/json

{
  "type": "orders",
  "sellingPartnerId": "A2XXXXXXXXX"
}
```

**Parametri:**
- `type`: (opzionale) `orders`, `finances`, o `inventory`
- `sellingPartnerId`: (opzionale) ID del cliente specifico

---

## 🔧 Script Helper

### Aggiungi Clienti in Batch

Creo uno script per aggiungere facilmente più clienti:

```javascript
// add-clients.js
const axios = require('axios');

const ACCOUNT_ID = 'TUO_ACCOUNT_ID';
const API_URL = 'http://localhost:3001/api';

const clients = [
  {
    sellingPartnerId: 'A2XXXXXXXXXXXX1',
    sellerName: 'Cliente 1',
    marketplaceId: 'APJ6JRA9NG5V4'
  },
  {
    sellingPartnerId: 'A2XXXXXXXXXXXX2',
    sellerName: 'Cliente 2',
    marketplaceId: 'APJ6JRA9NG5V4'
  },
  // Aggiungi altri clienti qui...
];

async function addClients() {
  for (const client of clients) {
    try {
      const response = await axios.post(
        `${API_URL}/${ACCOUNT_ID}/clients`,
        client
      );
      console.log(`✅ Added: ${client.sellerName}`);
    } catch (error) {
      console.error(`❌ Failed: ${client.sellerName}`, error.response?.data);
    }
  }
}

addClients();
```

**Uso:**
```bash
cd backend
node add-clients.js
```

---

## 📖 Flusso Tecnico

### Come Funziona Dietro le Quinte

```
1. Solution Provider autorizza l'app
   ↓
2. App ottiene refresh_token del Solution Provider
   ↓
3. Salva in database: isSolutionProvider = true
   ↓
4. Aggiungi clienti tramite API o database
   ↓
5. Quando sincronizzi/query dati:
   - Usa il refresh_token del Solution Provider
   - Specifica il selling_partner_id del cliente
   - Amazon restituisce solo i dati di quel cliente
   ↓
6. Dashboard mostra dati del cliente selezionato
```

### Chiamata API con selling_partner_id

Internamente, l'app fa:

```typescript
const apiConfig = {
  region: 'eu',
  refresh_token: 'SOLUTION_PROVIDER_TOKEN',
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: 'xxx',
    SELLING_PARTNER_APP_CLIENT_SECRET: 'xxx'
  },
  selling_partner: 'A2XXXXXXXXX' // ← Cliente specifico
};

const client = new SellingPartnerAPI(apiConfig);
const orders = await client.getOrders(...);
```

Amazon restituisce solo i dati del cliente `A2XXXXXXXXX`.

---

## ⚙️ Configurazione Avanzata

### Auto-Discovery Clienti (Future Feature)

Per ora devi aggiungere manualmente i selling_partner_id. In futuro si può implementare:
- API per ottenere lista clienti autorizzati dal Solution Provider
- Import da CSV
- Sync automatica con Amazon SP Central

### Filtri e Aggregazioni

Quando visualizzi "All Clients":
- I dati sono aggregati nel backend
- Ogni metrica somma i valori di tutti i clienti attivi
- Puoi filtrare per marketplace, data, ecc.

### Permessi e Sicurezza

- Ogni cliente ha `isActive` flag per disabilitare temporaneamente
- I dati sono isolati per selling_partner_id
- Il Solution Provider non può modificare dati su Amazon (READ-ONLY)

---

## 🎯 Best Practices

### 1. Naming Conventions

Usa nomi descrittivi per i clienti:
```javascript
{
  sellerName: "Azienda SRL - IT",  // ✅ Chiaro
  sellerName: "A2XXXXXXXX",        // ❌ Non descrittivo
}
```

### 2. Organizzazione

Raggruppa i clienti per:
- Marketplace: `"Cliente IT"`, `"Cliente DE"`
- Categoria: `"Elettronica - Cliente 1"`
- Priorità: `"VIP - Cliente Premium"`

### 3. Sincronizzazione

- Sincronizza clienti importanti più frequentemente
- Usa "All Clients" per overview generale
- Seleziona cliente specifico per analisi dettagliata

---

## 🐛 Troubleshooting

### "This account is not a Solution Provider"

**Soluzione:**
```sql
UPDATE Account SET isSolutionProvider = true WHERE id = 'ACCOUNT_ID';
```

### "Client already exists"

Il `sellingPartnerId` è univoco. Se serve aggiornare:
```bash
# Prima elimina
DELETE FROM ClientAccount WHERE sellingPartnerId = 'A2XXXXXXXXX';

# Poi ri-aggiungi
curl -X POST ...
```

### Dati non visualizzati per un cliente

Verifica:
1. Cliente è `isActive = true`
2. selling_partner_id è corretto
3. Hai autorizzato l'app con account Solution Provider (non account cliente)
4. Il refresh token è valido

### "Invalid selling_partner_id"

Significa che:
- Il Solution Provider non ha accesso a quel cliente
- Il selling_partner_id è errato
- Il cliente ha revocato l'accesso

---

## 📚 Riferimenti

- Amazon SP-API Solution Provider Guide: https://developer-docs.amazon.com/sp-api/
- Selling Partner ID formato: `A2` seguito da 13 caratteri
- Marketplace IDs: Vedi `CONFIGURAZIONE_APP_AMAZON.md`

---

## 🚀 Quick Start

```bash
# 1. Autorizza app (UI)
# Vai su http://localhost:3000 → Connetti con Amazon

# 2. Marca come Solution Provider
curl -X POST http://localhost:3001/api/ACCOUNT_ID/upgrade-to-solution-provider

# 3. Aggiungi cliente
curl -X POST http://localhost:3001/api/ACCOUNT_ID/clients \
  -H "Content-Type: application/json" \
  -d '{"sellingPartnerId":"A2XXXXX","sellerName":"Cliente 1"}'

# 4. Sync dati
# UI: Seleziona cliente → Clicca "Sync Data"

# 5. Visualizza dati
# Dashboard mostra automaticamente i dati del cliente selezionato
```

---

**Complimenti! Ora puoi gestire tutti i tuoi clienti da un'unica dashboard!** 🎉

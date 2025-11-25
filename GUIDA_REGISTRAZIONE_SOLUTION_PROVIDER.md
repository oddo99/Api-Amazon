# 🎯 Guida Passo-Passo: Registrazione Solution Provider

## Fase 1: Accesso al Developer Portal

### Step 1.1: Vai al Portal

1. Apri il browser
2. Vai su: **https://developer.amazonservices.com/**
3. Clicca su **"Sign up"** o **"Sign in"**
4. Usa le tue credenziali Amazon (stesso account del Seller Central)

### Step 1.2: Completa il Profilo Sviluppatore

Se è la prima volta che accedi, compila:

| Campo | Cosa Inserire |
|-------|---------------|
| **Developer Name** | `Il tuo nome` o `Nome Azienda` |
| **Email Address** | La tua email (riceverai notifiche qui) |
| **Website** (opzionale) | `https://localhost` o il tuo sito |
| **Privacy Policy URL** | `https://localhost/privacy` (per test locale) |
| **Support Email** | La tua email di supporto |

✅ Accetta i **Terms & Conditions**
✅ Clicca **"Register"**

---

## Fase 2: Registrazione Applicazione SP-API

### Step 2.1: Crea Nuova Applicazione

1. Nel Developer Console, trova la sezione **"SP-API Apps"**
2. Clicca su **"Add New App Client"** o **"Register Application"**

### Step 2.2: Informazioni Base dell'App

#### Application Information

| Campo | Valore da Inserire |
|-------|-------------------|
| **Application Name** | `Sellerboard Clone` (o un nome personalizzato) |
| **Description** | `Dashboard di analytics per venditori Amazon. Visualizza vendite, profitti, inventario e metriche business.` |
| **Application Type** | ☑ **Web Application** |
| **Platform** | Seleziona: **Other** (o **Web** se disponibile) |

#### Developer Information

| Campo | Valore |
|-------|--------|
| **Developer Name** | (Auto-compilato dal profilo) |
| **Contact Email** | La tua email |
| **Support URL** | `https://localhost/support` (per test) |
| **Privacy Policy URL** | `https://localhost/privacy` |

### Step 2.3: OAuth Configuration

**Questa è la parte CRITICA** ⚠️

| Campo | Valore ESATTO da Inserire |
|-------|--------------------------|
| **OAuth Client ID** | (Sarà generato automaticamente da Amazon) |
| **OAuth Client Secret** | (Sarà generato automaticamente da Amazon) |
| **Redirect URI** | `http://localhost:3001/auth/amazon/callback` |

⚠️ **IMPORTANTE**: Il Redirect URI deve essere **ESATTAMENTE** come sopra (senza spazi, senza slash finale)

#### Aggiungi Redirect URI Multipli (Opzionale)

Se vuoi supportare anche produzione in futuro:
```
http://localhost:3001/auth/amazon/callback
https://tuodominio.com/auth/amazon/callback
```

---

## Fase 3: Selezionare i Data Access Roles

**Questa è la parte più importante!** 🔐

### Roles da Selezionare (READ-ONLY)

Cerca e **SPUNTA** questi ruoli:

#### 1. Orders
```
☑ Orders
   Description: "View orders information"
   Level: Read/View
```
**Operazioni consentite:**
- getOrders
- getOrder
- getOrderItems
- getOrderBuyerInfo (opzionale)
- getOrderAddress (opzionale)

#### 2. Finance
```
☑ Finance
   Description: "View financial data"
   Level: Read/View
```
**Operazioni consentite:**
- listFinancialEvents
- listFinancialEventGroups
- listFinancialEventsByOrderId

#### 3. FBA Inventory
```
☑ FBA Inventory
   Description: "View inventory"
   Level: Read/View
```
**Operazioni consentite:**
- getInventorySummaries
- getInventoryItems

#### 4. Reports
```
☑ Reports
   Description: "View and request reports"
   Level: Read/View
```
**Operazioni consentite:**
- createReport
- getReport
- getReports
- getReportDocument

#### 5. Catalog Items
```
☑ Catalog Items
   Description: "View catalog information"
   Level: Read/View
```
**Operazioni consentite:**
- getCatalogItem
- listCatalogItems
- listCatalogCategories

### ❌ Roles da NON Selezionare

**NON spuntare questi** (sono operazioni di scrittura):

```
☐ Listings Management - Write
☐ Orders - Manage/Write
☐ Pricing - Write
☐ Product Listings - Write
☐ Fulfillment Orders - Write
☐ Feeds - Write
☐ Merchant Fulfillment - Write
```

### 📸 Checklist Visiva

Quando hai finito, dovresti avere selezionato **SOLO 5 ruoli**:
```
✅ Orders (Read)
✅ Finance (Read)
✅ FBA Inventory (Read)
✅ Reports (Read)
✅ Catalog Items (Read)
```

Totale: **5 roles** con permessi di sola lettura.

---

## Fase 4: Submit e Ottieni Credenziali

### Step 4.1: Review e Submit

1. Rivedi tutte le informazioni
2. Clicca **"Submit"** o **"Create Application"**
3. Amazon elaborerà la richiesta (di solito istantaneo per test)

### Step 4.2: Ottieni le Credenziali

Dopo aver creato l'app, vedrai:

```
🔑 LWA Client ID:
amzn1.application-oa2-client.xxxxxxxxxxxxxxxxxxxxxxxx

🔑 LWA Client Secret:
[Click "View" or "Show" per vederlo]
amzn1.oa2-cs.v1.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **ATTENZIONE**:
- Il **Client Secret** viene mostrato **UNA SOLA VOLTA**
- Salvalo subito in un posto sicuro
- Se lo perdi, dovrai generarne uno nuovo

### Step 4.3: Copia le Credenziali

Apri un file di testo e copia:

```
Client ID: amzn1.application-oa2-client.xxxxx
Client Secret: amzn1.oa2-cs.v1.xxxxx
```

---

## Fase 5: Configurare l'Applicazione Locale

### Step 5.1: Aggiorna il file .env

Apri il file `.env` nel backend:

```bash
# MacOS/Linux
nano "/Users/oddo/Desktop/Lavoro/Sellerboard clone/backend/.env"

# Oppure usa qualsiasi editor di testo
```

### Step 5.2: Modifica le Credenziali

Trova e sostituisci:

```env
# Amazon SP-API Credentials
AMAZON_CLIENT_ID=incolla_qui_il_tuo_client_id
AMAZON_CLIENT_SECRET=incolla_qui_il_tuo_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token_here  # Lascia così per ora
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

**Esempio reale:**
```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.abc123xyz456
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.def789ghi012jkl345
AMAZON_REFRESH_TOKEN=your_refresh_token_here
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

### Step 5.3: Salva il File

- Salva e chiudi l'editor
- Le credenziali sono ora configurate

---

## Fase 6: Testare l'Integrazione

### Step 6.1: Riavvia il Server (se necessario)

I server dovrebbero essere già in esecuzione. Se non lo sono:

```bash
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone"
npm run dev
```

Verifica che vedi:
```
🚀 Server running on port 3001
```

### Step 6.2: Testa l'OAuth Flow

1. **Apri browser**: http://localhost:3000

2. **Vedrai**: Schermata "Connetti il tuo Account Amazon"

3. **Clicca**: Pulsante arancione "Connetti con Amazon"

4. **Vieni rediretto** a Amazon Seller Central

5. **Accedi** (se non sei già loggato)

6. **Autorizza l'app**: Vedrai una schermata tipo:
   ```
   Sellerboard Clone vuole accedere al tuo account:

   ✓ Visualizzare gli ordini
   ✓ Visualizzare i dati finanziari
   ✓ Visualizzare l'inventario
   ✓ Visualizzare i report
   ✓ Visualizzare il catalogo prodotti

   [Autorizza] [Annulla]
   ```

7. **Clicca "Autorizza"**

8. **Vieni rediretto** a: http://localhost:3000?auth=success

9. **Vedrai**: Alert "✅ Account Amazon connesso con successo!"

10. **La Dashboard** si caricherà con i tuoi dati

### Step 6.3: Verifica nel Database

Apri phpMyAdmin (MAMP):
- http://localhost/phpMyAdmin
- Database: `sellerboard`
- Tabella: `Account`

Dovresti vedere un nuovo record con:
- `sellerId`: Il tuo Seller ID
- `refreshToken`: Token generato automaticamente
- `accessToken`: Access token temporaneo
- Tutti i campi popolati automaticamente

---

## Fase 7: Prima Sincronizzazione

### Step 7.1: Trigger Sync Manuale

Nella dashboard, clicca sul pulsante **"Sync Data"**

Questo:
1. Scarica ordini degli ultimi 7 giorni
2. Scarica eventi finanziari degli ultimi 30 giorni
3. Scarica inventario corrente
4. Popola la dashboard con i tuoi dati

### Step 7.2: Verifica i Dati

Dopo 1-2 minuti, la dashboard dovrebbe mostrare:
- **Revenue**: Totale vendite
- **Net Profit**: Profitto netto
- **Total Fees**: Commissioni Amazon
- **Orders**: Numero ordini
- **Grafico**: Trend profitti

---

## 🎉 Setup Completato!

Congratulazioni! Hai configurato con successo:

✅ App registrata su Amazon Solution Provider Portal
✅ OAuth flow automatico funzionante
✅ Dati sincronizzati da Amazon
✅ Dashboard operativa

---

## 🔧 Troubleshooting

### Problema: "Invalid client_id"

**Causa**: Client ID errato nel `.env`

**Soluzione**:
1. Verifica di aver copiato il Client ID corretto da Amazon
2. Non deve avere spazi all'inizio/fine
3. Deve iniziare con `amzn1.application-oa2-client.`

### Problema: "Redirect URI mismatch"

**Causa**: L'URI nel codice non corrisponde a quello registrato

**Soluzione**:
1. Vai su Developer Portal
2. Verifica che il Redirect URI sia esattamente:
   ```
   http://localhost:3001/auth/amazon/callback
   ```
3. Nessuno spazio, nessuno slash finale
4. Salva e riprova

### Problema: "Access denied - insufficient permissions"

**Causa**: Mancano alcuni ruoli nell'app

**Soluzione**:
1. Vai su Developer Portal
2. Modifica l'app
3. Verifica di aver selezionato tutti e 5 i ruoli
4. Salva le modifiche
5. Riautorizza l'app (disconnetti e riconnetti)

### Problema: "Authorization code expired"

**Causa**: Il codice OAuth ha una scadenza di 5 minuti

**Soluzione**:
1. Riprova il flusso OAuth dall'inizio
2. Completa l'autorizzazione entro 5 minuti

### Problema: Nessun dato nella dashboard

**Causa**: Nessun ordine negli ultimi 7 giorni o sync non completato

**Soluzione**:
1. Clicca "Sync Data" di nuovo
2. Controlla i log del backend (terminale)
3. Verifica che ci siano ordini nel tuo account Amazon
4. Prova ad aumentare il periodo di sync modificando:
   ```typescript
   // backend/src/services/order.service.ts:14
   async syncOrders(accountId: string, daysBack: number = 30) // era 7
   ```

---

## 📞 Risorse Utili

### Link Importanti

- **Developer Portal**: https://developer.amazonservices.com/
- **SP-API Docs**: https://developer-docs.amazon.com/sp-api/
- **Seller Central**: https://sellercentral.amazon.com/
- **OAuth Guide**: https://developer-docs.amazon.com/sp-api/docs/authorizing-selling-partner-api-applications

### Comandi Utili

```bash
# Riavviare server
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone"
npm run dev

# Vedere log backend in tempo reale
# (Nel terminale dove gira npm run dev)

# Aprire phpMyAdmin
http://localhost/phpMyAdmin

# Test endpoint
curl http://localhost:3001/health
curl http://localhost:3001/auth/status
```

---

## 🚀 Prossimi Passi (Opzionale)

### Setup Redis per Sync Automatica

Per abilitare la sincronizzazione automatica ogni 5-15 minuti:

1. Installa Homebrew (se non presente):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Installa Redis:
   ```bash
   brew install redis
   brew services start redis
   ```

3. Riavvia il server - ora i background jobs saranno attivi!

### Deploy in Produzione

Quando sei pronto per produzione:

1. Aggiungi un dominio pubblico al Redirect URI
2. Usa HTTPS
3. Deploy backend e frontend su un server
4. Aggiorna le variabili d'ambiente
5. Richiedi la review dell'app ad Amazon (se vuoi pubblicarla)

---

**Fine della guida!** 🎊

Se incontri problemi, consulta la sezione Troubleshooting o fammi sapere!

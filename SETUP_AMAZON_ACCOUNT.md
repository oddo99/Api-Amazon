# 🚀 Guida Setup Account Amazon SP-API

## Metodo Rapido: Script Automatico

### Passo 1: Ottieni le Credenziali da Amazon

1. **Vai su Amazon Seller Central**
   - https://sellercentral.amazon.com
   - Accedi con il tuo account venditore

2. **Apri Developer Central**
   - Menu → **App e servizi** → **Sviluppa app**
   - Oppure: https://sellercentral.amazon.com/apps/manage

3. **Crea una Nuova Applicazione**
   - Clicca **"Add new app client"**
   - Nome: `Sellerboard Clone` (o qualsiasi nome)
   - OAuth Redirect URI: `https://localhost`
   - Clicca **"Crea"**

4. **Seleziona i Permessi (SOLO LETTURA)**

   ✅ **Seleziona questi:**
   - `Read orders information` (Orders - Read)
   - `Read financial data` (Financial Events - Read)
   - `Read inventory data` (FBA Inventory - Read)
   - `Read reports` (Reports - Read)

   ❌ **NON selezionare:**
   - Nessun permesso di scrittura (Write, Manage, Update)

5. **Ottieni le Credenziali**

   Dopo aver creato l'app vedrai:
   - **LWA Client ID**: `amzn1.application-oa2-client.xxxxxx`
   - **LWA Client Secret**: Clicca "View" per vederlo (copialo subito!)

6. **Autorizza l'Applicazione (Self-Authorization)**

   - Nella pagina dell'app, clicca **"Authorize"** / **"Autorizza"**
   - Accetta i permessi
   - **Copia il Refresh Token** che appare (importante!)

### Passo 2: Esegui lo Script di Setup

Apri un nuovo terminale e esegui:

```bash
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone/backend"
node setup-account.js
```

Lo script ti chiederà:
1. **Seller ID** (lo trovi in Seller Central → Settings → Account Info)
2. **Regione** (na/eu/fe)
3. **Marketplace ID** (vedi tabella sotto)
4. **Client ID** (dalla fase 1.5)
5. **Client Secret** (dalla fase 1.5)
6. **Refresh Token** (dalla fase 1.6)

Lo script creerà automaticamente:
- Record nel database
- Aggiornamento del file `.env`

### Passo 3: Riavvia il Server

Dopo aver eseguito lo script:

```bash
# Interrompi il server se è in esecuzione (Ctrl+C)
# Poi riavvia dalla root del progetto
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone"
npm run dev
```

### Passo 4: Sincronizza i Dati

1. Vai su http://localhost:3000
2. Clicca **"Sync Data"**
3. Attendi qualche minuto per la prima sincronizzazione
4. I tuoi dati Amazon appariranno nella dashboard!

---

## 📍 Tabella Marketplace IDs

### Nord America (region: `na`)

| Paese | Marketplace ID | Codice |
|-------|---------------|--------|
| 🇺🇸 United States | `ATVPDKIKX0DER` | amazon.com |
| 🇨🇦 Canada | `A2EUQ1WTGCTBG2` | amazon.ca |
| 🇲🇽 Mexico | `A1AM78C64UM0Y8` | amazon.com.mx |
| 🇧🇷 Brazil | `A2Q3Y263D00KWC` | amazon.com.br |

### Europa (region: `eu`)

| Paese | Marketplace ID | Codice |
|-------|---------------|--------|
| 🇬🇧 United Kingdom | `A1F83G8C2ARO7P` | amazon.co.uk |
| 🇩🇪 Germany | `A1PA6795UKMFR9` | amazon.de |
| 🇫🇷 France | `A13V1IB3VIYZZH` | amazon.fr |
| 🇮🇹 Italy | `APJ6JRA9NG5V4` | amazon.it |
| 🇪🇸 Spain | `A1RKKUPIHCS9HS` | amazon.es |
| 🇳🇱 Netherlands | `A1805IZSGTT6HS` | amazon.nl |
| 🇸🇪 Sweden | `A2NODRKZP88ZB9` | amazon.se |
| 🇵🇱 Poland | `A1C3SOZRARQ6R3` | amazon.pl |
| 🇹🇷 Turkey | `A33AVAJ2PDY3EV` | amazon.com.tr |
| 🇦🇪 UAE | `A2VIGQ35RCS4UG` | amazon.ae |

### Far East (region: `fe`)

| Paese | Marketplace ID | Codice |
|-------|---------------|--------|
| 🇯🇵 Japan | `A1VC38T7YXB528` | amazon.co.jp |
| 🇦🇺 Australia | `A39IBJ37TRP1C6` | amazon.com.au |
| 🇸🇬 Singapore | `A19VAU5U5O7RUS` | amazon.sg |
| 🇮🇳 India | `A21TJRUUN4KGV` | amazon.in |

---

## 🔧 Setup Manuale (Alternativo)

Se preferisci non usare lo script, puoi configurare manualmente:

### 1. Modifica il file `.env`

```bash
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone/backend"
# Apri .env con un editor e modifica:

AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_REFRESH_TOKEN=Atzr|xxxxx
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

### 2. Crea il Record nel Database

Apri phpMyAdmin (MAMP):
- URL: http://localhost/phpMyAdmin
- Database: `sellerboard`
- Tabella: `Account`

Clicca "Inserisci" e compila:

```sql
INSERT INTO Account (
  id,
  sellerId,
  marketplaceId,
  accessToken,
  refreshToken,
  expiresAt,
  region,
  createdAt,
  updatedAt
) VALUES (
  'cm1xxxxxx',  -- Genera un CUID o usa UUID
  'A2EUQ1WTGCTBG2',  -- Il tuo Seller ID
  'ATVPDKIKX0DER',   -- Marketplace ID
  '',  -- Lascia vuoto
  'Atzr|xxxxxx',  -- Il tuo refresh token
  '2026-01-01 00:00:00',  -- Data futura
  'na',  -- Regione
  NOW(),
  NOW()
);
```

**Oppure usa questo SQL diretto:**

```sql
INSERT INTO Account
SET id = UUID(),
    sellerId = 'IL_TUO_SELLER_ID',
    marketplaceId = 'ATVPDKIKX0DER',
    accessToken = '',
    refreshToken = 'IL_TUO_REFRESH_TOKEN',
    expiresAt = DATE_ADD(NOW(), INTERVAL 1 YEAR),
    region = 'na',
    createdAt = NOW(),
    updatedAt = NOW();
```

---

## ❓ Troubleshooting

### "Invalid refresh token"
- Verifica che il refresh token sia corretto
- Assicurati di non avere spazi all'inizio/fine
- Prova a rigenerare il token autorizzando di nuovo l'app

### "Access denied"
- Verifica di aver selezionato i permessi corretti
- Assicurati che l'app sia autorizzata nel tuo account

### "No accounts found"
- Verifica che il record sia presente nel database
- Controlla che le credenziali nel `.env` siano corrette
- Riavvia il server dopo le modifiche

### "Connection error"
- Verifica che MAMP sia in esecuzione
- Controlla che MySQL sia avviato (porta 8889)
- Verifica la stringa di connessione nel `.env`

---

## 🔐 Sicurezza

**IMPORTANTE:**
- Le credenziali SP-API sono sensibili - non condividerle mai
- Il file `.env` è ignorato da git (non verrà committato)
- Usa solo permessi di LETTURA (l'app non può modificare dati su Amazon)

---

## 📞 Link Utili

- [Amazon SP-API Docs](https://developer-docs.amazon.com/sp-api/)
- [Seller Central](https://sellercentral.amazon.com)
- [Developer Console](https://sellercentral.amazon.com/apps/manage)
- [SP-API Setup Guide](https://developer-docs.amazon.com/sp-api/docs/registering-your-application)

---

**Hai finito!** 🎉 Visita http://localhost:3000 e inizia ad analizzare i tuoi dati Amazon!

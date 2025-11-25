# 🏢 Setup con Amazon Solution Provider Portal

## Vantaggi del Solution Provider

✅ **Professionale**: App registrata ufficialmente
✅ **Multi-account**: Gestisci più venditori
✅ **OAuth automatico**: Token generati automaticamente
✅ **Scalabile**: Pronto per essere offerto come servizio

---

## Fase 1: Registrazione come Solution Provider

### 1.1 Accedi al Solution Provider Portal

1. Vai su: https://developer.amazonservices.com/
2. Clicca **"Sign up"** o **"Register as a developer"**
3. Accedi con le tue credenziali Amazon

### 1.2 Completa la Registrazione Sviluppatore

- **Developer Name**: Il tuo nome o nome azienda
- **Email**: Email di contatto
- **Privacy Policy URL**: URL privacy policy (puoi usare anche localhost per test)
- **Terms & Conditions**: Accetta i termini

### 1.3 Crea una Nuova Applicazione SP-API

1. Nel Developer Portal, vai su **"Apps & Services"** → **"Add New App"**
2. Compila i dettagli:

#### App Information
- **Application Name**: `Sellerboard Clone` (o il tuo nome)
- **Description**: `Analytics dashboard for Amazon sellers`
- **Privacy Policy URL**: `https://yourdomain.com/privacy` (o localhost per test)

#### OAuth Configuration
- **OAuth Client ID**: Verrà generato automaticamente
- **OAuth Client Secret**: Verrà generato automaticamente
- **OAuth Redirect URIs**:
  ```
  http://localhost:3001/auth/amazon/callback
  ```

#### Application Type
- Seleziona: **"Web Application"**

---

## Fase 2: Configurare i Ruoli di Accesso

Nel form di registrazione, seleziona i seguenti **Data Access Roles**:

### ✅ Ruoli Necessari (READ-ONLY)

```
☑ Orders - View and manage orders
   → Per leggere ordini e dettagli item

☑ Finance - View financial data
   → Per leggere eventi finanziari, commissioni, revenue

☑ FBA Inventory - View inventory
   → Per leggere livelli inventario FBA

☑ Reports - View and request reports
   → Per generare e scaricare report

☑ Catalog Items - View catalog information
   → Per leggere info prodotti (ASIN, titolo, immagini)
```

### ❌ Ruoli da NON Richiedere

```
☐ Listings - Write
☐ Orders - Write/Manage
☐ Pricing - Write
☐ Fulfillment - Write
☐ Feeds - Write
☐ Any WRITE permissions
```

**Motivazione**: L'app è completamente READ-ONLY. Non modifica mai dati su Amazon.

---

## Fase 3: Ottieni le Credenziali

Dopo aver creato l'app, riceverai:

```
🔑 LWA Client ID: amzn1.application-oa2-client.xxxxxxxx
🔑 LWA Client Secret: amzn1.oa2-cs.v1.xxxxxxxx
```

**⚠️ IMPORTANTE**: Salva il Client Secret subito - Amazon lo mostra una sola volta!

---

## Fase 4: Implementare OAuth Flow nell'App

L'app deve supportare l'OAuth flow per ottenere il refresh token automaticamente.

### 4.1 Aggiorna Backend per OAuth

Creo i nuovi endpoint per gestire l'OAuth flow:

**File**: `backend/src/api/auth.routes.ts`

```typescript
import { Router } from 'express';
import axios from 'axios';
import { config } from '../config';

const router = Router();

// Step 1: Redirect user to Amazon authorization page
router.get('/amazon/authorize', (req, res) => {
  const authUrl =
    `https://sellercentral.amazon.com/apps/authorize/consent` +
    `?application_id=${config.amazon.clientId}` +
    `&state=${generateState()}` + // Random state for security
    `&version=beta`;

  res.redirect(authUrl);
});

// Step 2: Amazon redirects back with authorization code
router.get('/amazon/callback', async (req, res) => {
  const { spapi_oauth_code, state, selling_partner_id } = req.query;

  if (!spapi_oauth_code) {
    return res.status(400).json({ error: 'No authorization code received' });
  }

  try {
    // Exchange authorization code for refresh token
    const response = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: spapi_oauth_code as string,
        client_id: config.amazon.clientId,
        client_secret: config.amazon.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { refresh_token, access_token } = response.data;

    // Save to database
    await prisma.account.create({
      data: {
        sellerId: selling_partner_id as string,
        marketplaceId: config.amazon.marketplaceId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        region: config.amazon.region,
      }
    });

    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to authorize' });
  }
});

function generateState() {
  return Math.random().toString(36).substring(7);
}

export default router;
```

### 4.2 Aggiorna Configurazione

**File**: `backend/.env`

```env
# Solution Provider OAuth
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER

# OAuth Redirect URI (deve corrispondere a quello registrato)
OAUTH_REDIRECT_URI=http://localhost:3001/auth/amazon/callback
```

### 4.3 Aggiungi Routes nel Server

**File**: `backend/src/index.ts`

```typescript
import authRoutes from './api/auth.routes';

// ... existing code ...

app.use('/auth', authRoutes);
app.use('/api', routes);
```

---

## Fase 5: Frontend - Pulsante "Connetti Amazon"

Nel frontend, aggiungi un pulsante per iniziare l'OAuth flow:

**File**: `frontend/app/page.tsx`

```typescript
const connectAmazon = () => {
  window.location.href = 'http://localhost:3001/auth/amazon/authorize';
};

// Nel render:
<button onClick={connectAmazon}>
  Connetti Account Amazon
</button>
```

---

## Flusso OAuth Completo

```
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│ Browser │                 │  Your   │                 │ Amazon  │
│  User   │                 │  App    │                 │   API   │
└────┬────┘                 └────┬────┘                 └────┬────┘
     │                           │                           │
     │ 1. Click "Connect Amazon" │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │   2. Redirect to Amazon   │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │    3. User authorizes app                             │
     ├──────────────────────────────────────────────────────>│
     │                           │                           │
     │  4. Amazon redirects back with auth code              │
     │<──────────────────────────────────────────────────────┤
     │                           │                           │
     │   5. Forward code to app  │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │                           │ 6. Exchange code for token│
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │  7. Return refresh_token  │
     │                           │<──────────────────────────┤
     │                           │                           │
     │                           │ 8. Save to database       │
     │                           ├───┐                       │
     │                           │<──┘                       │
     │                           │                           │
     │  9. Redirect to dashboard │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
```

---

## Fase 6: Testing in Sandbox

Amazon offre un ambiente **Sandbox** per testare:

1. Usa endpoint sandbox:
   ```
   https://sandbox.sellingpartnerapi-na.amazon.com
   ```

2. Nel `.env` aggiungi:
   ```env
   AMAZON_SANDBOX=true
   ```

3. Modifica `spapi.service.ts`:
   ```typescript
   const endpoint = config.amazon.sandbox
     ? 'https://sandbox.sellingpartnerapi-na.amazon.com'
     : 'https://sellingpartnerapi-na.amazon.com';
   ```

---

## Fase 7: Pubblicazione (Opzionale)

Se vuoi offrire l'app ad altri venditori:

1. **Completa l'App Listing**:
   - Screenshots
   - Descrizione dettagliata
   - Support URL
   - Privacy Policy

2. **Submit per Review**:
   - Amazon revisiona l'app (7-10 giorni)
   - Testa tutte le funzionalità
   - Approva l'app

3. **Pubblica su Amazon Appstore**:
   - L'app appare nel Seller Central Appstore
   - Venditori possono installarla con 1 click

---

## Confronto: Developer Central vs Solution Provider

| Feature | Developer Central | Solution Provider |
|---------|------------------|-------------------|
| Setup | ⭐⭐⭐ Facile | ⭐⭐ Medio |
| Authorization | Manuale | OAuth automatico |
| Multi-account | ❌ No | ✅ Si |
| Scalabilità | ❌ Limitata | ✅ Illimitata |
| Professional | ❌ No | ✅ Si |
| Pubblicabile | ❌ No | ✅ Si |
| Tempo setup | 10 minuti | 30-60 minuti |

---

## Permessi Dettagliati (Reference)

### Orders API
```
Role: Orders
Permissions: View/Read
Endpoints:
  - getOrders
  - getOrder
  - getOrderItems
  - getOrderBuyerInfo (opzionale)
  - getOrderAddress (opzionale)
```

### Finance API
```
Role: Finance
Permissions: View/Read
Endpoints:
  - listFinancialEvents
  - listFinancialEventGroups
  - listFinancialEventsByOrderId
  - listFinancialEventsByGroupId
```

### FBA Inventory API
```
Role: Inventory
Permissions: View/Read
Endpoints:
  - getInventorySummaries
  - getInventoryItems (opzionale)
```

### Reports API
```
Role: Reports
Permissions: View/Read
Endpoints:
  - createReport
  - getReport
  - getReports
  - getReportSchedules
  - createReportSchedule
  - getReportDocument
```

### Catalog Items API
```
Role: Catalog
Permissions: View/Read
Endpoints:
  - getCatalogItem
  - listCatalogItems
  - listCatalogCategories
```

---

## Security Best Practices

1. **State Parameter**: Usa un token random per prevenire CSRF
2. **HTTPS**: In produzione usa sempre HTTPS
3. **Token Storage**: Cripta i refresh token nel database
4. **Rate Limiting**: Implementa rate limiting sulle API
5. **Audit Log**: Traccia tutte le operazioni

---

## Troubleshooting

### "Invalid client_id"
→ Verifica che il Client ID sia corretto nel `.env`

### "Redirect URI mismatch"
→ Verifica che l'URI nel codice corrisponda esattamente a quello registrato

### "Invalid authorization code"
→ Il codice è usa-e-getta, non può essere riutilizzato

### "Token expired"
→ Implementa il refresh token flow per rinnovare automaticamente

---

## Next Steps

Vuoi che implementi il supporto OAuth completo nell'app? Posso:

1. ✅ Creare gli endpoint OAuth nel backend
2. ✅ Aggiungere il pulsante "Connetti Amazon" nel frontend
3. ✅ Implementare il token refresh automatico
4. ✅ Gestire multi-account nel database

---

## Resources

- [SP-API OAuth Guide](https://developer-docs.amazon.com/sp-api/docs/authorizing-selling-partner-api-applications)
- [Solution Provider Hub](https://developer.amazonservices.com/)
- [SP-API Roles](https://developer-docs.amazon.com/sp-api/docs/roles-in-the-selling-partner-api)
- [Sandbox Testing](https://developer-docs.amazon.com/sp-api/docs/the-selling-partner-api-sandbox)

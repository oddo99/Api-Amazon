# Documento di Sicurezza

## 🔒 Garanzia READ-ONLY per Amazon

Questa applicazione è progettata per essere **completamente sicura** e **READ-ONLY** per quanto riguarda Amazon.

### ✅ Cosa Fa l'Applicazione

L'applicazione **LEGGE SOLAMENTE** i seguenti dati da Amazon:

1. **Ordini** (Orders API)
   - Lista ordini con date, importi, stati
   - Dettagli item per ordine
   - Informazioni acquirente (email, indirizzo)

2. **Eventi Finanziari** (Finances API)
   - Revenue da vendite
   - Commissioni Amazon (referral, FBA, subscription)
   - Rimborsi e storni

3. **Inventario** (FBA Inventory API)
   - Quantità disponibili (fulfillable)
   - Quantità in transito (inbound)
   - Quantità riservate
   - Quantità non vendibili (unfulfillable)

4. **Catalogo Prodotti** (Catalog Items API)
   - Informazioni prodotto (titolo, immagine)
   - ASIN e SKU

### ❌ Cosa NON Fa l'Applicazione

L'applicazione **NON può e NON farà MAI**:

- ❌ Modificare prezzi su Amazon
- ❌ Modificare quantità inventario
- ❌ Creare o cancellare listing
- ❌ Modificare descrizioni prodotti
- ❌ Gestire ordini (conferme spedizione, tracking)
- ❌ Processare rimborsi
- ❌ Modificare impostazioni account
- ❌ Qualsiasi operazione di SCRITTURA su Amazon

### 📝 Modifiche Locali

Quando modifichi dati nell'applicazione (esempio: costo prodotto, note, prezzi target), questi vengono salvati **ESCLUSIVAMENTE nel database locale PostgreSQL**.

**Esempio**:
```typescript
// Quando aggiorni il costo di un prodotto:
// ✅ Salvato nel database locale
await prisma.product.update({
  where: { id: productId },
  data: { cost: 10.50 }
});

// ❌ NESSUNA chiamata ad Amazon
// NO: await amazonAPI.updateProduct(...)
```

### 🔐 Permessi SP-API Necessari

Per funzionare correttamente, l'applicazione richiede SOLO permessi di **lettura**:

#### Permessi Minimi Richiesti:
- ✅ **Read Orders** - Lettura ordini
- ✅ **Read Financial Events** - Lettura eventi finanziari
- ✅ **Read Inventory** - Lettura inventario
- ✅ **Read Catalog** - Lettura catalogo prodotti

#### Permessi NON Necessari (e NON utilizzati):
- ❌ Write Orders
- ❌ Write Inventory
- ❌ Write Catalog
- ❌ Write Pricing
- ❌ Manage Orders
- ❌ Any WRITE permissions

### 🔍 Verifica del Codice

Puoi verificare personalmente che il codice sia read-only:

1. **Service SP-API** (`backend/src/services/spapi.service.ts`)
   - Contiene SOLO metodi `get*()`, `list*()`, `read*()`
   - Nessun metodo `update*()`, `create*()`, `delete*()`, `write*()`

2. **Services** (`backend/src/services/*.service.ts`)
   - `sync*()` methods → Leggono da Amazon, scrivono nel DB locale
   - Nessuna chiamata di scrittura verso Amazon

3. **API Routes** (`backend/src/api/routes.ts`)
   - Route PUT/POST modificano SOLO il database locale
   - Nessun proxy verso Amazon per operazioni di scrittura

### ⚠️ Note Importanti

1. **Refresh Token SP-API**: Il token è usato SOLO per autenticare le chiamate di lettura
2. **Rate Limits Amazon**: L'app rispetta i rate limits per non sovraccaricare le API
3. **Dati Sincronizzati**: I dati vengono sincronizzati periodicamente ma mai modificati su Amazon
4. **Isolamento**: Anche se il database locale viene modificato, Amazon rimane invariato

### 📊 Flusso Dati

```
Amazon (Read-Only)
    ↓ (Sync - Solo Lettura)
Database Locale PostgreSQL
    ↓ (Read/Write)
Applicazione Web
```

**Amazon ← NO WRITE** (Nessuna scrittura verso Amazon, MAI)

### 🛡️ Garanzie Tecniche

- **SDK amazon-sp-api**: Configurato SOLO con operazioni di lettura
- **Nessun Endpoint di Scrittura**: Il codice non contiene chiamate API di modifica
- **Audit Trail**: Tutti i sync jobs sono loggati nel database
- **Fail-Safe**: Anche se si tentasse di aggiungere codice di scrittura, servirebbe riconfigurare i permessi SP-API

### 📞 In Caso di Dubbi

Se hai dubbi sulla sicurezza:

1. Rivedi il codice in `backend/src/services/spapi.service.ts`
2. Verifica i permessi nella tua app SP-API su Amazon Developer Console
3. Monitora i log di sync in `SyncJob` table
4. Controlla che le credenziali SP-API abbiano SOLO permessi di lettura

---

**TL;DR**: L'applicazione è un "mirror read-only" dei tuoi dati Amazon. Legge, salva localmente, e ti permette di analizzare. Non può e non modificherà mai nulla su Amazon.

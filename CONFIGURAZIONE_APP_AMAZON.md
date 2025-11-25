# 🎯 Configurazione Esatta App Amazon SP-API

## Basato sul Form Reale di Amazon (PDF fornito)

---

## 📋 STEP 1: Informazioni Base

### Nome app
```
Mela Sellerboard
```
*(o qualsiasi nome tu preferisca, 2-40 caratteri)*

### Tipo API
```
☑ API SP (Selling Partner API)
```

### Tipo di app
```
☑ Produzione
```
*(NON Sandbox - vogliamo dati reali)*

---

## 🏢 STEP 2: Entità Economiche Supportate

Seleziona **SOLO**:

```
☑ Venditori
```

**NON selezionare:**
- ☐ Amazon Business
- ☐ Trasporto merci aereo/marittimo
- ☐ Spedizione
- ☐ Certificazione
- ☐ Fornitori

---

## 🔐 STEP 3: Ruoli (Permessi) - SEZIONE VENDITORI

Nella sezione **Venditori**, seleziona questi ruoli:

### ✅ Ruoli da Selezionare:

#### 1. Finanza e contabilità
```
☑ Finanza e contabilità
   Produrre rendiconti contabili e finanziari. Non include le informazioni necessarie
   per creare fatture fiscali.
```
**Per cosa serve:** Dati finanziari, commissioni, revenue, rimborsi

#### 2. Monitoraggio di ordini e inventario
```
☑ Monitoraggio di ordini e inventario
   Autorizza a gestire l'inventario. Non include le informazioni necessarie
   per creare etichette di spedizione.
```
**Per cosa serve:** Ordini, items, inventario FBA, quantità disponibili

#### 3. Offerte di prodotti
```
☑ Offerte di prodotti
   Creare e gestire le offerte di prodotti. Inclusi i contenuti A+.
```
**Per cosa serve:** Catalogo prodotti, ASIN, SKU, titoli, immagini

#### 4. Brand Analytics (Opzionale ma consigliato)
```
☑ Brand Analytics
   Accedi ai dati relativi a vendite e inventario per gestire la tua attività su Amazon.
```
**Per cosa serve:** Analytics avanzate, trend, performance

### ❌ Ruoli da NON Selezionare:

```
☐ Informazioni sui partner di vendita
☐ Comunicazione con gli acquirenti
☐ Assegnazione del prezzo
☐ Logistica di Amazon (solo se non usi FBA)
☐ Sollecitazione degli acquirenti
☐ Magazzinaggio e distribuzione Amazon (AWD)
```

---

## 🔒 STEP 4: Token e Restrizioni (RDT)

### Il Token dati soggetti a restrizioni (RDT)

Domanda: *"Desidero delegare l'accesso alle informazioni di identificazione personale all'applicazione di un altro sviluppatore?"*

Risposta:
```
☑ No, non desidero ricevere alle informazioni di identificazione personale
   all'applicazione di un altro sviluppatore.
```

*(Non serve accedere a dati personali degli acquirenti per analytics)*

---

## 🌐 STEP 5: URL OAuth

### URL di accesso OAuth
```
https://localhost
```
*(o lascia vuoto se non applicabile)*

### URL di reindirizzamento OAuth ⚠️ IMPORTANTE
```
http://localhost:3001/auth/amazon/callback
```

**Clicca "Aggiungi un altro URL"** se vuoi aggiungere quello di produzione:
```
https://tuodominio.com/auth/amazon/callback
```

---

## 📝 Riepilogo Configurazione Finale

```
✅ Nome app: Mela Sellerboard
✅ Tipo API: API SP
✅ Tipo app: Produzione
✅ Entità: Venditori

✅ Ruoli selezionati (4):
   1. Finanza e contabilità
   2. Monitoraggio di ordini e inventario
   3. Offerte di prodotti
   4. Brand Analytics (opzionale)

✅ RDT: No
✅ OAuth Redirect: http://localhost:3001/auth/amazon/callback

❌ Tutti gli altri ruoli: NON selezionati
```

---

## 🚀 Dopo aver Salvato

### 1. Otterrai le Credenziali

Dopo aver cliccato **"Salva ed esci"**, vedrai:

```
LWA Client ID: amzn1.application-oa2-client.xxxxx
LWA Client Secret: amzn1.oa2-cs.v1.xxxxx
```

⚠️ **COPIA IL CLIENT SECRET SUBITO** - lo vedrai una sola volta!

### 2. Aggiorna il file .env

Apri `/Users/oddo/Desktop/Lavoro/Sellerboard clone/backend/.env`:

```env
# Amazon SP-API Credentials
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_REFRESH_TOKEN=your_refresh_token_here
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=APJ6JRA9NG5V4
```

**Per l'Italia:**
- Region: `eu`
- Marketplace ID: `APJ6JRA9NG5V4`

### 3. Riavvia il Server

```bash
# Se il server è già in esecuzione, riavvialo
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone"
npm run dev
```

### 4. Connetti l'Account

1. Vai su http://localhost:3000
2. Clicca **"Connetti con Amazon"**
3. Autorizza l'app
4. Torna alla dashboard
5. Clicca **"Sync Data"**
6. 🎉 Fatto!

---

## 📊 Corrispondenza Ruoli → Funzionalità App

| Ruolo Amazon | API SP-API | Funzionalità Dashboard |
|--------------|-----------|----------------------|
| Finanza e contabilità | Finance API | Revenue, Fees, Profit, Refunds |
| Monitoraggio ordini/inventario | Orders API + FBA Inventory API | Orders, Items, Stock levels |
| Offerte di prodotti | Catalog Items API | Product info, ASIN, SKU |
| Brand Analytics | Reports API | Advanced analytics, trends |

---

## 🔍 Verifica Configurazione

Dopo aver salvato, verifica che i ruoli siano corretti:

1. Torna alla pagina dell'app nel Developer Portal
2. Controlla la sezione **"Ruoli"**
3. Dovresti vedere:
   ```
   ✓ Finanza e contabilità
   ✓ Monitoraggio di ordini e inventario
   ✓ Offerte di prodotti
   ✓ Brand Analytics
   ```

---

## ⚠️ Note Importanti

### Privacy e Sicurezza

- ✅ Questi ruoli sono **READ-ONLY**
- ✅ Non possono modificare ordini, prezzi, o listing
- ✅ Non accedono a dati personali acquirenti (email, indirizzi completi)
- ✅ Sono perfetti per analytics e dashboard

### Limitazioni

Con questi ruoli NON puoi:
- ❌ Modificare prezzi
- ❌ Creare o modificare listing
- ❌ Gestire ordini (conferme spedizione)
- ❌ Modificare inventario
- ❌ Contattare acquirenti

Perfetto per un'app di **solo analytics**! ✅

---

## 🎯 Checklist Finale

Prima di cliccare "Salva ed esci":

- [ ] Nome app inserito
- [ ] Tipo API: API SP
- [ ] Tipo app: Produzione
- [ ] Entità: Solo "Venditori"
- [ ] Ruoli: 4 selezionati (Finanza, Monitoraggio, Offerte, Brand Analytics)
- [ ] RDT: "No"
- [ ] OAuth Redirect: `http://localhost:3001/auth/amazon/callback`
- [ ] Hai un editor di testo pronto per copiare Client ID e Secret

✅ Tutto pronto? Clicca **"Salva ed esci"**!

---

## 📞 Supporto

Se hai dubbi o errori, consulta:
- `GUIDA_REGISTRAZIONE_SOLUTION_PROVIDER.md` - Guida dettagliata
- `QUICK_START.md` - Checklist veloce
- `README.md` - Documentazione completa

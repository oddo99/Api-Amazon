# ⚡ Quick Start - Checklist Veloce

## 🎯 Checklist in 7 Passi

### ✅ Passo 1: Vai al Developer Portal
- URL: https://developer.amazonservices.com/
- **Tempo**: 2 minuti

### ✅ Passo 2: Registra Applicazione SP-API
- Nome app: `Sellerboard Clone`
- Tipo: Web Application
- Redirect URI: `http://localhost:3001/auth/amazon/callback`
- **Tempo**: 5 minuti

### ✅ Passo 3: Seleziona i 5 Ruoli READ-ONLY
```
☑ Orders (Read)
☑ Finance (Read)
☑ FBA Inventory (Read)
☑ Reports (Read)
☑ Catalog Items (Read)
```
- **Tempo**: 2 minuti

### ✅ Passo 4: Copia le Credenziali
```
Client ID: amzn1.application-oa2-client.xxxxx
Client Secret: amzn1.oa2-cs.v1.xxxxx
```
⚠️ Salva il Client Secret subito - lo vedi una sola volta!
- **Tempo**: 1 minuto

### ✅ Passo 5: Aggiorna .env
Apri `backend/.env` e modifica:
```env
AMAZON_CLIENT_ID=tuo_client_id_qui
AMAZON_CLIENT_SECRET=tuo_client_secret_qui
```
- **Tempo**: 1 minuto

### ✅ Passo 6: Avvia/Riavvia Server
```bash
cd "/Users/oddo/Desktop/Lavoro/Sellerboard clone"
npm run dev
```
- **Tempo**: 30 secondi

### ✅ Passo 7: Connetti Account Amazon
1. Vai su http://localhost:3000
2. Clicca "Connetti con Amazon"
3. Autorizza l'app su Amazon
4. Clicca "Sync Data"
5. 🎉 Fatto!
- **Tempo**: 2 minuti

---

## ⏱️ Tempo Totale: ~15 minuti

---

## 📋 Configurazione Marketplace

Scegli il tuo marketplace e aggiorna nel `.env`:

### 🇮🇹 Italia
```env
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=APJ6JRA9NG5V4
```

### 🇺🇸 USA
```env
AMAZON_REGION=na
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
```

### 🇬🇧 UK
```env
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=A1F83G8C2ARO7P
```

### 🇩🇪 Germania
```env
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=A1PA6795UKMFR9
```

### 🇫🇷 Francia
```env
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=A13V1IB3VIYZZH
```

### 🇪🇸 Spagna
```env
AMAZON_REGION=eu
AMAZON_MARKETPLACE_ID=A1RKKUPIHCS9HS
```

---

## ⚡ Test Veloce

Verifica che tutto funzioni:

```bash
# Test backend
curl http://localhost:3001/health
# Output: {"status":"ok"}

# Test auth status
curl http://localhost:3001/auth/status
# Output: {"authorized":false,"accounts":[]}
```

---

## 🚨 Problemi Comuni

### "Invalid client_id"
→ Verifica di aver copiato correttamente il Client ID nel `.env`

### "Redirect URI mismatch"
→ Deve essere esattamente: `http://localhost:3001/auth/amazon/callback`

### Server non parte
→ Verifica che MAMP MySQL sia avviato (porta 8889)

### Dashboard vuota
→ Clicca "Sync Data" per importare i dati da Amazon

---

## 📚 Guide Dettagliate

Per istruzioni complete, consulta:

1. **GUIDA_REGISTRAZIONE_SOLUTION_PROVIDER.md** - Guida passo-passo con screenshot guide
2. **SETUP_AMAZON_ACCOUNT.md** - Metodo alternativo (setup manuale)
3. **README.md** - Documentazione completa progetto

---

## 🎊 Sei Pronto!

Dopo questi 7 passi avrai:
- ✅ App registrata su Amazon
- ✅ OAuth automatico funzionante
- ✅ Dati sincronizzati
- ✅ Dashboard operativa

**Vai su http://localhost:3000 e inizia! 🚀**

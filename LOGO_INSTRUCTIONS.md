# Istruzioni per Aggiungere il Logo Mela Services

## Logo Fornito
Il logo di Mela Services è stato fornito come immagine. Per utilizzarlo nell'app:

## Opzione 1: Usa l'immagine PNG/SVG
1. Salva l'immagine del logo in: `frontend/public/mela-logo.png` (o `.svg`)
2. Modifica il componente `frontend/components/MelaLogo.tsx`:

```tsx
import Image from 'next/image';

export default function MelaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/mela-logo.png"
        alt="Mela Services Logo"
        width={200}
        height={80}
        className="h-full w-auto"
        priority
      />
    </div>
  );
}
```

## Opzione 2: Usa il componente SVG temporaneo
Il componente `MelaLogo.tsx` contiene già una versione SVG approssimativa del logo.
È funzionale ma si consiglia di sostituirla con il logo ufficiale.

## Dove viene usato il Logo
Il logo può essere aggiunto in:
- Sidebar: `frontend/components/Sidebar.tsx` (già aggiornato con testo)
- Login page: `frontend/app/auth/login/page.tsx` (già aggiornato con testo)
- Signup page: `frontend/app/auth/signup/page.tsx` (già aggiornato con testo)

## Per aggiungere il logo visivamente:
Importa e usa il componente MelaLogo:

```tsx
import MelaLogo from '@/components/MelaLogo';

// Poi nel JSX:
<MelaLogo className="h-12" />
```

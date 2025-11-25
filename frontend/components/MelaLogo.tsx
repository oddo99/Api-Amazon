export default function MelaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mela Services Logo - puoi sostituire questo con l'immagine vera */}
      <svg viewBox="0 0 300 200" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg">
        {/* Logo "mela" con foglia arancione */}
        <defs>
          <style>{`
            .mela-text { fill: #2563EB; font-family: Arial, sans-serif; font-weight: bold; }
            .marketplace-text { fill: #FB923C; font-family: Arial, sans-serif; }
            .heroes-text { fill: #FB923C; font-family: Arial, sans-serif; font-weight: bold; }
          `}</style>
        </defs>

        {/* Foglia arancione */}
        <ellipse cx="240" cy="30" rx="25" ry="35" fill="#FB923C" transform="rotate(-30 240 30)"/>

        {/* Testo "mela" */}
        <text x="10" y="100" className="mela-text" fontSize="80">mela</text>

        {/* Testo "marketplace heroes" */}
        <text x="10" y="140" className="marketplace-text" fontSize="28">marketplace </text>
        <text x="10" y="170" className="heroes-text" fontSize="28">heroes</text>
      </svg>
    </div>
  );
}

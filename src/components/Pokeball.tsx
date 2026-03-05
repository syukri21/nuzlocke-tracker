export function Pokeball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="47" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
      <path d="M3 50 A47 47 0 0 1 97 50" fill="rgba(220,50,50,0.5)"/>
      <path d="M3 50 A47 47 0 0 0 97 50" fill="rgba(255,255,255,0.07)"/>
      <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
      <circle cx="50" cy="50" r="11" fill="#1a1a1a" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
    </svg>
  );
}

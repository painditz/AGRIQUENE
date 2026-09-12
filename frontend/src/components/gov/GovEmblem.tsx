export function GovEmblem({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Agriquene Digital Agriculture Emblem"
    >
      {/* Outer Golden/Navy Crest Ring */}
      <circle cx="32" cy="32" r="30" stroke="#0B2545" strokeWidth="2.5" fill="#F8FAFC" />
      <circle cx="32" cy="32" r="26" stroke="#EA580C" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      
      {/* Wheat Sheaves (Golden) */}
      <path
        d="M26 38C23 35 21 28 25 21C26 25 28 28 28 32"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="#FDE68A"
      />
      <path
        d="M38 38C41 35 43 28 39 21C38 25 36 28 36 32"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="#FDE68A"
      />
      <path
        d="M32 44V18"
        stroke="#15803D"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Center Digital Grain/Clock Token */}
      <circle cx="32" cy="24" r="5" fill="#0B2545" />
      <circle cx="32" cy="24" r="2.5" fill="#FFFFFF" />
      <path d="M32 24L34 22" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Base Pedestal Ribbon */}
      <path
        d="M18 46H46L42 51H22L18 46Z"
        fill="#0B2545"
      />
      <circle cx="32" cy="48.5" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

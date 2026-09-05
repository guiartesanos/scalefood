"use client";

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function WhatsAppButton({
  telefone,
  nome,
  compact,
}: {
  telefone: string | null;
  nome: string;
  compact?: boolean;
}) {
  if (!telefone) return null;
  const digits = onlyDigits(telefone);
  const numero = digits.length <= 11 ? `55${digits}` : digits;
  const msg = encodeURIComponent(
    `Oi, ${nome}! Aqui é da Food Scale 👋 faz um tempo que a gente não trabalha junto — abriu espaço na agenda e queria saber se faz sentido retomar a aceleração. Bora conversar?`
  );
  const href = `https://wa.me/${numero}?text=${msg}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
      }`}
      style={{ background: "#25D36622", color: "#128C4A" }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
        <path d="M12.02 2C6.5 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.09-1.33A9.96 9.96 0 0 0 12.02 22C17.54 22 22 17.52 22 12S17.54 2 12.02 2Zm0 18.1c-1.6 0-3.09-.44-4.36-1.2l-.31-.18-3.02.79.81-2.94-.2-.31A8.08 8.08 0 0 1 3.9 12c0-4.48 3.65-8.1 8.12-8.1 4.47 0 8.1 3.62 8.1 8.1 0 4.48-3.63 8.1-8.1 8.1Zm4.46-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14-.01-.3-.01-.46-.01a.9.9 0 0 0-.65.3c-.22.24-.85.83-.85 2.03 0 1.2.87 2.36.99 2.52.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      {compact ? "WhatsApp" : "Chamar no WhatsApp"}
    </a>
  );
}

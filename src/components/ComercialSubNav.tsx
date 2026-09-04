"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Clientes/Consultoria/Propostas viraram um grupo só ("Comercial") na nav
// principal (ver TabNav.tsx) pra não lotar o menu — esse sub-nav aparece
// no topo das 3 páginas pra continuar trocando entre elas rápido, sem
// precisar voltar pro menu de cima toda vez (especialmente no mobile, que
// agora só tem 1 ícone "Comercial" na barra de baixo).
const ITENS = [
  { href: "/clientes", label: "Clientes" },
  { href: "/consultoria", label: "Consultoria" },
  { href: "/propostas", label: "Propostas" },
] as const;

export function ComercialSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1.5 border-b border-line -mt-1">
      {ITENS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="font-display font-bold text-[14px] px-3.5 pt-2 pb-2.5 border-b-2 transition-colors -mb-px"
            style={{
              color: active ? "var(--accent-ink)" : "var(--muted)",
              borderColor: active ? "var(--accent)" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

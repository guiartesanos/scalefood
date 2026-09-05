// Fonte única de formatação de reais. Isso já foi reimplementado à mão em
// mais de 15 arquivos — e já tinha divergido de verdade (MetaTV/GrowthChart
// arredondavam pro inteiro sem casas decimais, o resto usava 2 casas, cada
// um por conta própria, sem ninguém decidir isso num lugar só). Sem
// dependência nenhuma (nem de Supabase, nem de "use client"/"use server")
// de propósito, pra poder ser importado de qualquer lado — client, server
// ou route handler.

export function brl(v: number | null | undefined): string {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Mesmo valor, sem casas decimais — usado onde precisão de centavos não
// ajuda a leitura (TV do dashboard, eixo de gráfico).
export function brlInt(v: number | null | undefined): string {
  return "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");
}

// Mesma história do brl() acima: fmtData estava reimplementado à mão em 11
// arquivos, e 2 deles já tinham divergido pra um formato mais curto
// (Consultoria mostrava "04/09", Radar de notícias mostrava "04 set") sem
// nenhum motivo — o resto do sistema sempre mostra a data cheia. Overload
// só pra manter o tipo de retorno preciso: quem já garante uma string não
// precisa lidar com null de volta.
export function fmtData(d: string): string;
export function fmtData(d: string | null | undefined): string | null;
export function fmtData(d: string | null | undefined): string | null {
  if (!d) return null;
  // meio-dia de propósito — evita o fuso do servidor (UTC na Vercel)
  // empurrar a data pro dia anterior (mesma classe de bug do src/lib/tz.ts).
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

// Mesma formatação, mas pra uma string que já é timestamp completo (data +
// hora + fuso, tipo as colunas timestamptz do banco) em vez de só "YYYY-MM-DD"
// — usar fmtData() nessas quebraria o parse (o "T12:00:00" que ele
// acrescenta colidiria com a hora que já vem na string). Formata no fuso de
// São Paulo, não no fuso de quem estiver com o navegador aberto.
export function fmtDataHora(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

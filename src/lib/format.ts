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

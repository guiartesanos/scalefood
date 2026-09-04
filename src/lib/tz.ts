// "Hoje" de verdade no fuso do Brasil — não importa em que timezone o
// processo Node está rodando. A Vercel roda as functions em UTC, então
// sem isso o "hoje"/"amanhã" do sistema (pendências financeiras, DRE,
// MetaBar, Propostas, calendário de contas) podia adiantar em até 3h
// perto da meia-noite em São Paulo (ex: 21h de 03/09 em SP já é 00h de
// 04/09 em UTC).
const TIMEZONE = "America/Sao_Paulo";

export function hojeBR(): { ano: number; mes: number; dia: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { ano: get("year"), mes: get("month"), dia: get("day") };
}

// "YYYY-MM-DD" de hoje no fuso do Brasil.
export function hojeISOBR(): string {
  const { ano, mes, dia } = hojeBR();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

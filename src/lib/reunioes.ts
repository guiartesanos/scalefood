// Sugere datas de reunião de consultoria: a primeira até 3 dias após o
// fechamento, as seguintes semanalmente — nunca caindo num domingo.

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d;
}

function pularDomingo(d: Date): Date {
  if (d.getDay() === 0) {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return next;
  }
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sugerirDatasReunioes(fechamento: string, quantidade: number): string[] {
  const datas: string[] = [];
  let atual = pularDomingo(addDays(fechamento, 2));
  for (let i = 0; i < quantidade; i++) {
    datas.push(toISODate(atual));
    atual = pularDomingo(addDays(toISODate(atual), 7));
  }
  return datas;
}

// Regras de data das reuniões de consultoria.
//
// A 1ª reunião NÃO é mais auto-agendada — vira uma tarefa de agendamento
// manual (o vendedor alinha a data/hora direto com o cliente). Esta função
// só calcula um PRAZO SUGERIDO pra mostrar como referência ao lado do campo
// manual: até 3 dias corridos (pulando domingo) após o fechamento,
// priorizando segunda/terça/quarta dentro dessa janela — mas se nenhum dos 3
// dias cair em seg/ter/qua, prevalece o prazo de 3 dias mesmo assim.
//
// As reuniões 2 em diante seguem uma cadência fixa escolhida pelo usuário
// ("toda segunda/terça/quarta às X"), guardada em
// ConsultoriaCliente.dia_semana_recorrente/hora_recorrente — ver
// gerarDatasCadencia.

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function prazoSugeridoPrimeiraReuniao(fechamento: string): string {
  const candidatos: Date[] = [];
  let d = addDays(fechamento, 1);
  while (candidatos.length < 3) {
    if (d.getDay() !== 0) candidatos.push(new Date(d));
    d = addDays(toISODate(d), 1);
  }
  const preferido = candidatos.find((c) => [1, 2, 3].includes(c.getDay()));
  return toISODate(preferido || candidatos[0]);
}

// Datas das reuniões seguintes, a partir de `apartirDe` (não incluso),
// caindo sempre em `diaSemana` (1=segunda, 2=terça, 3=quarta), uma por
// semana.
export function gerarDatasCadencia(apartirDe: string, diaSemana: number, quantidade: number): string[] {
  const datas: string[] = [];
  let atual = addDays(apartirDe, 1);
  while (atual.getDay() !== diaSemana) atual = addDays(toISODate(atual), 1);
  for (let i = 0; i < quantidade; i++) {
    datas.push(toISODate(atual));
    atual = addDays(toISODate(atual), 7);
  }
  return datas;
}

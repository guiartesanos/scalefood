export type UserRole = "master" | "comercial" | "financeiro" | "onboarding";

export type ClienteStatus =
  | "Rodando - com resultado"
  | "Rodando - sem resultado ainda"
  | "Onboarding urgente"
  | "Pediu pra cancelar";

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  created_at: string;
}

export interface Cliente {
  id: string;
  n: number;
  nome: string;
  dono: string;
  status: ClienteStatus;
  pgto: string;
  nicho: string;
  rec: number;
  traf: number;
  com: number;
  imp: number;
  taxa: number;
  taxa_fonte: "real" | "estimado" | null;
  // liq/marg vêm null pra financeiro/onboarding (view esconde de propósito)
  liq: number | null;
  marg: number | null;
  entrada: number | null;
  hoje: number | null;
  growth_note: string | null;
  band: string | null;
  extra: string | null;
  fechamento: string | null;
  promo_primeiro_mes_gratis: boolean;
  inicio_cobranca_recorrente: string | null;
  created_at: string;
  updated_at: string;
  asaas_customer_id: string | null;
}

export interface CustoFixo {
  id: string;
  nome: string;
  valor: number;
  categoria: string | null;
  data: string;
  recorrencia: "pontual" | "semanal" | "mensal";
  vigente_desde: string;
  created_at: string;
}

export interface CustoVariavelExtra {
  id: string;
  nome: string;
  valor: number;
  categoria: string | null;
  cliente: string | null;
  obs: string | null;
  created_at: string;
}

export interface Pagamento {
  id: string;
  data: string | null;
  cliente: string | null;
  valor: number;
  canal: string;
  tipo: "recorrencia" | "consultoria" | "avulso";
  descricao: string | null;
  pendente: boolean;
  created_at: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  coluna: "a-fazer" | "em-andamento" | "feito";
  urgencia: "alta" | "media" | "baixa";
  cliente_nome: string | null;
  agenda_id: string | null;
  criado_em: string;
}

export interface Rotina {
  id: string;
  nome: string;
  frequencia: "semana" | "mes";
  itens: string[];
}

export interface Agenda {
  id: string;
  nome: string;
  email: string | null;
}

export interface IcpLogEntry {
  id: string;
  data: string;
  titulo: string;
  detalhe: string | null;
}

export interface FaturamentoMesAtual {
  dia_atual: number;
  dias_no_mes: number;
  faturamento_novo_mes: number;
  projecao_fechamento: number;
  valor_meta: number | null;
  bonus_valor: number | null;
  pct_meta: number | null;
  pct_projecao: number | null;
}

export interface ClienteCancelado {
  id: string;
  nome: string;
  asaas_customer_id: string | null;
  total_recebido: number;
  ultimo_pagamento: string | null;
  motivo: string | null;
  observacao: string | null;
  created_at: string;
}

export const MOTIVOS_CANCELAMENTO = [
  "Problemas financeiros",
  "Não teve resultado",
  "Optou por gestor mais barato",
  "Fechou o negócio",
  "Insatisfação com atendimento",
  "Assumiu o marketing internamente",
] as const;

export const CATEGORIAS_CUSTO = [
  "Pessoas",
  "Sistema/Ferramentas",
  "Taxas",
  "Tráfego",
  "Comissão",
  "Outros",
] as const;

export const STATUS_LIST: ClienteStatus[] = [
  "Rodando - com resultado",
  "Rodando - sem resultado ainda",
  "Onboarding urgente",
  "Pediu pra cancelar",
];

export const STATUS_META: Record<ClienteStatus, { cls: string; short: string }> = {
  "Rodando - com resultado": { cls: "good", short: "Com resultado" },
  "Rodando - sem resultado ainda": { cls: "warning", short: "Sem resultado" },
  "Onboarding urgente": { cls: "serious", short: "Onboarding" },
  "Pediu pra cancelar": { cls: "critical", short: "Cancelando" },
};

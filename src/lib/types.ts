export type UserRole = "master" | "comercial" | "financeiro" | "onboarding";

export type ClienteStatus =
  | "Rodando - com resultado"
  | "Rodando - sem resultado ainda"
  | "Onboarding urgente"
  | "Pediu pra cancelar"
  | "Cancelado";

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
  trafego_gestor: string;
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

export interface ContaPagarAvulsa {
  id: string;
  nome: string;
  valor: number;
  cliente_nome: string | null;
  gestor: string | null;
  categoria: string | null;
  origem: string;
  referencia: string | null;
  data: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
}

export interface RecebivelManual {
  id: string;
  nome: string;
  valor: number;
  cliente_nome: string | null;
  data: string;
  recorrencia: "pontual" | "semanal" | "mensal";
  vigente_desde: string;
  ativo: boolean;
  created_at: string;
}

export interface CustoVariavelExtra {
  id: string;
  nome: string;
  valor: number;
  categoria: string | null;
  cliente: string | null;
  obs: string | null;
  data: string;
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
  responsavel: string | null;
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

export interface ReceitaEvento {
  id: string;
  cliente_id: string | null;
  tipo: "novo_cliente" | "upsell" | "downsell" | "consultoria";
  valor: number;
  data: string;
  descricao: string | null;
  criado_por: string | null;
  created_at: string;
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
  numero_vendas: number;
  ticket_medio: number | null;
  vendas_faltantes: number | null;
}

export interface RadarNoticia {
  id: string;
  titulo: string;
  resumo: string | null;
  link: string;
  fonte: string | null;
  publicado_em: string | null;
  status: "novo" | "descartado" | "gerador";
  created_at: string;
}

export interface CanvaTemplate {
  id: string;
  nome: string;
  brand_template_id: string;
  usa_imagem: boolean;
  ativo: boolean;
  created_at: string;
}

export interface GeracaoConteudo {
  id: string;
  noticia_id: string | null;
  tema: string;
  status: "rascunho" | "perguntas" | "pronto";
  template_id: string | null;
  respostas: Record<string, string> | null;
  conteudo_gerado: { slides?: string[] } | null;
  canva_design_url: string | null;
  imagem_drive_url: string | null;
  imagem_drive_nome: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultoriaCliente {
  id: string;
  nome: string;
  email: string | null;
  cliente_id: string | null;
  data_fechamento: string;
  valor: number | null;
  dia_semana_recorrente: number;
  hora_recorrente: string;
  concluido: boolean;
  concluido_em: string | null;
  criado_por: string | null;
  created_at: string;
}

export interface ConsultoriaTarefa {
  id: string;
  consultoria_cliente_id: string;
  titulo: string;
  ordem: number;
  feito: boolean;
  feito_em: string | null;
  data_reuniao: string | null;
  hora_reuniao: string | null;
  google_event_id: string | null;
  google_event_url: string | null;
  created_at: string;
}

// Toda consultoria nova gera sempre essas 8 tarefas, nessa ordem — a 1ª é
// agendada manualmente (ver src/lib/reunioes.ts), as demais seguem a
// cadência semanal do cliente (ConsultoriaCliente.dia_semana_recorrente/
// hora_recorrente).
export const CONSULTORIA_TAREFAS_PADRAO = [
  "Onboarding + raio X",
  "Diagnóstico + apresentação de plano",
  "Cardápio e sistema",
  "Alavancagem sazonal",
  "Estratégia de marketplace",
  "Estratégia de comunicação",
  "Processo de compras",
  "Mapeamento de fornecedores",
] as const;

export interface ClienteCancelado {
  id: string;
  nome: string;
  asaas_customer_id: string | null;
  total_recebido: number;
  ultimo_pagamento: string | null;
  primeiro_pagamento: string | null;
  telefone: string | null;
  nicho: string | null;
  dono: string | null;
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
  "Nem começou",
] as const;

export const CATEGORIAS_CUSTO = [
  "Pessoas",
  "Sistema/Ferramentas",
  "Taxas",
  "Tráfego",
  "Comissão",
  "Imposto",
  "Outros",
] as const;

export const STATUS_LIST: ClienteStatus[] = [
  "Rodando - com resultado",
  "Rodando - sem resultado ainda",
  "Onboarding urgente",
  "Pediu pra cancelar",
  "Cancelado",
];

export const STATUS_META: Record<ClienteStatus, { cls: string; short: string }> = {
  "Rodando - com resultado": { cls: "good", short: "Com resultado" },
  "Rodando - sem resultado ainda": { cls: "warning", short: "Sem resultado" },
  "Onboarding urgente": { cls: "serious", short: "Onboarding" },
  "Pediu pra cancelar": { cls: "critical", short: "Cancelando" },
  // selecionar esse status move o cliente pra clientes_cancelados e
  // remove ele da lista de ativos (ver atualizarStatusCliente) — por
  // isso não aparece em ClientesKanban.COLS, é um estado de transição.
  Cancelado: { cls: "critical", short: "Cancelado" },
};

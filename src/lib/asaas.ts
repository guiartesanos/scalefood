// Cliente mínimo pra API do Asaas — usado só em Server Actions (nunca no
// navegador). Espelha o comportamento de asaas-alertas/asaas_lib.py.

const BASE_URL = "https://api.asaas.com/v3";

function onlyDigits(s: string | undefined | null): string {
  return (s || "").replace(/\D/g, "");
}

async function asaasRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      accept: "application/json",
      access_token: apiKey,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.errors?.map((e: { description?: string }) => e.description).join("; ") || JSON.stringify(data);
    throw new Error(`Asaas API ${res.status}: ${msg}`);
  }
  return data as T;
}

export interface NovoClienteAsaas {
  nome: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  cep: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
}

export async function criarClienteAsaas(c: NovoClienteAsaas): Promise<{ id: string }> {
  const cpfCnpj = onlyDigits(c.cpfCnpj);
  const personType = cpfCnpj.length === 14 ? "JURIDICA" : cpfCnpj.length === 11 ? "FISICA" : null;
  if (!personType) {
    throw new Error(`CPF/CNPJ "${c.cpfCnpj}" tem ${cpfCnpj.length} dígitos — esperado 11 (CPF) ou 14 (CNPJ).`);
  }

  const body: Record<string, unknown> = {
    name: c.nome,
    cpfCnpj,
    personType,
    email: c.email || undefined,
    mobilePhone: c.telefone ? onlyDigits(c.telefone) : undefined,
    postalCode: onlyDigits(c.cep),
    address: c.endereco || undefined,
    addressNumber: c.numero || undefined,
    complement: c.complemento || undefined,
    province: c.bairro || undefined,
  };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  return asaasRequest<{ id: string }>("POST", "/customers", body);
}

export interface NovaAssinaturaAsaas {
  customerId: string;
  valor: number;
  vencimento: string; // YYYY-MM-DD
  juros: number; // % ao mês
  multa: number; // %
  descricao?: string;
  ciclo?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
}

export interface PagamentoAsaas {
  id: string;
  value: number;
  status: string;
  paymentDate: string | null;
  dueDate: string;
  description: string | null;
  billingType: string;
}

export async function listarPagamentosAsaas(customerId: string): Promise<PagamentoAsaas[]> {
  const data = await asaasRequest<{ data: PagamentoAsaas[] }>(
    "GET",
    `/payments?customer=${customerId}&limit=100`
  );
  return data.data || [];
}

interface PaginadoAsaas<T> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
}

async function listarTudoPaginado<T>(path: string): Promise<T[]> {
  const separador = path.includes("?") ? "&" : "?";
  const out: T[] = [];
  let offset = 0;
  for (let i = 0; i < 20; i++) {
    const pagina = await asaasRequest<PaginadoAsaas<T>>(
      "GET",
      `${path}${separador}limit=100&offset=${offset}`
    );
    out.push(...pagina.data);
    if (!pagina.hasMore) break;
    offset += 100;
  }
  return out;
}

export interface ClienteAsaasResumo {
  id: string;
  name: string;
}

// Mapa id -> nome de TODOS os clientes Asaas — usado pra "traduzir" o
// customer id (que é tudo que vem no payment) num nome legível.
export async function mapaClientesAsaas(): Promise<Map<string, string>> {
  const clientes = await listarTudoPaginado<ClienteAsaasResumo>("/customers");
  return new Map(clientes.map((c) => [c.id, c.name]));
}

export interface ContaReceberAsaas {
  id: string;
  customerId: string;
  customerName: string;
  value: number;
  dueDate: string;
  status: "PENDING" | "OVERDUE";
  description: string | null;
  billingType: string;
  invoiceUrl: string | null;
}

// TODAS as cobranças em aberto (pendentes + vencidas) de TODOS os
// clientes — é o "contas a receber" de verdade, direto do Asaas (não é
// projeção nossa nem depende de lançamento manual).
export async function listarContasReceberAsaas(): Promise<ContaReceberAsaas[]> {
  const [pendentes, vencidas, nomesPorId] = await Promise.all([
    listarTudoPaginado<PagamentoAsaas & { customer: string; invoiceUrl: string | null }>("/payments?status=PENDING"),
    listarTudoPaginado<PagamentoAsaas & { customer: string; invoiceUrl: string | null }>("/payments?status=OVERDUE"),
    mapaClientesAsaas(),
  ]);

  const todas = [...pendentes.map((p) => ({ ...p, status: "PENDING" as const })), ...vencidas.map((p) => ({ ...p, status: "OVERDUE" as const }))];

  return todas
    .map((p) => ({
      id: p.id,
      customerId: p.customer,
      customerName: nomesPorId.get(p.customer) || p.customer,
      value: Number(p.value),
      dueDate: p.dueDate,
      status: p.status,
      description: p.description,
      billingType: p.billingType,
      invoiceUrl: p.invoiceUrl,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface PagamentoRecebidoAsaas {
  id: string;
  customerId: string;
  customerName: string;
  value: number;
  netValue: number;
  subscription: string | null;
  description: string | null;
  paymentDate: string;
}

// Todo pagamento com dinheiro efetivamente recebido num período — o
// filtro por paymentDate (não por status) já garante isso: só fica
// preenchido quando o Asaas confirma o recebimento de fato.
// subscription != null identifica cobrança de assinatura (recorrência);
// null é cobrança avulsa (consultoria ou catch-up pontual).
export async function listarPagamentosRecebidosNoPeriodo(
  inicio: string,
  fim: string
): Promise<PagamentoRecebidoAsaas[]> {
  const [pagamentos, nomesPorId] = await Promise.all([
    listarTudoPaginado<{
      id: string;
      customer: string;
      value: number;
      netValue: number;
      subscription: string | null;
      description: string | null;
      paymentDate: string;
    }>(`/payments?paymentDate[ge]=${inicio}&paymentDate[le]=${fim}`),
    mapaClientesAsaas(),
  ]);

  return pagamentos.map((p) => ({
    id: p.id,
    customerId: p.customer,
    customerName: nomesPorId.get(p.customer) || p.customer,
    value: Number(p.value),
    netValue: p.netValue != null ? Number(p.netValue) : Number(p.value),
    subscription: p.subscription || null,
    description: p.description,
    paymentDate: p.paymentDate,
  }));
}

interface FinancialTransactionAsaas {
  type: string;
  value: number;
  date: string;
}

// Total de notas fiscais de serviço efetivamente emitidas (status
// AUTHORIZED — ignora canceladas e as ainda em processamento) num
// período — base de cálculo do imposto (7% sobre esse valor).
export async function totalNotasFiscaisAsaas(inicio: string, fim: string): Promise<number> {
  const notas = await listarTudoPaginado<{ value: number; status: string }>(
    `/invoices?effectiveDate[ge]=${inicio}&effectiveDate[le]=${fim}`
  );
  return Math.round(notas.filter((n) => n.status === "AUTHORIZED").reduce((s, n) => s + Number(n.value), 0) * 100) / 100;
}

export interface TarifasAsaas {
  cobranca: number;
  antecipacao: number;
  sms: number;
  notas: number;
  transferencia: number;
  estorno: number;
  total: number;
  // taxa de processamento por pagamento (boleto/pix/cartão + mensageria) —
  // fica de fora do `total` de propósito (ver comentário abaixo). Direto do
  // extrato, não de value-netValue: pagamento antecipado zera o netValue
  // sem refletir a taxa real, então netValue subestima o valor.
  processamento: number;
}

// Tarifas reais cobradas pelo Asaas num período — via /financialTransactions,
// que é o "extrato" da conta (não é estimativa, é o que foi debitado de fato).
export async function listarTarifasAsaas(inicio: string, fim: string): Promise<TarifasAsaas> {
  const transacoes = await listarTudoPaginado<FinancialTransactionAsaas>(
    `/financialTransactions?startDate=${inicio}&finishDate=${fim}`
  );

  const somaTipos = (tipos: string[]) =>
    transacoes.filter((t) => tipos.includes(t.type)).reduce((acc, t) => acc + t.value, 0);

  // PAYMENT_FEE e PAYMENT_MESSAGING_NOTIFICATION_FEE ficam de fora de
  // propósito — esses dois já são descontados dentro do netValue de cada
  // pagamento (é o que vira `clientes.taxa` via webhook, na linha "Taxa de
  // plataforma" do financeiro). Incluir aqui contaria a mesma tarifa 2x.
  const cobranca = -somaTipos(["PAYMENT_DUNNING_REQUEST_FEE"]);
  const antecipacao = -somaTipos(["RECEIVABLE_ANTICIPATION_FEE"]);
  const sms = -somaTipos(["INSTANT_TEXT_MESSAGE_FEE"]);
  const notas = -somaTipos(["INVOICE_FEE"]);
  const transferencia = -somaTipos(["TRANSFER_FEE"]);
  const estorno = somaTipos(["CHARGED_FEE_REFUND"]);
  const processamento = -somaTipos(["PAYMENT_FEE", "PAYMENT_MESSAGING_NOTIFICATION_FEE"]);

  return {
    cobranca,
    antecipacao,
    sms,
    notas,
    transferencia,
    estorno,
    processamento: Math.round(processamento * 100) / 100,
    total: Math.round((cobranca + antecipacao + sms + notas + transferencia - estorno) * 100) / 100,
  };
}

export async function criarAssinaturaAsaas(a: NovaAssinaturaAsaas): Promise<{ id: string; status: string }> {
  const body = {
    customer: a.customerId,
    billingType: "BOLETO",
    value: a.valor,
    description: a.descricao || "",
    fine: { value: a.multa, type: "PERCENTAGE" },
    interest: { value: a.juros, type: "PERCENTAGE" },
    nextDueDate: a.vencimento,
    cycle: a.ciclo || "MONTHLY",
  };
  return asaasRequest<{ id: string; status: string }>("POST", "/subscriptions", body);
}

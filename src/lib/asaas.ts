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

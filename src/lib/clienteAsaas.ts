import type { SupabaseClient } from "@supabase/supabase-js";
import { criarClienteAsaas, criarAssinaturaAsaas } from "@/lib/asaas";

function calcTraf(rec: number): number {
  return rec >= 2500 ? Math.round(rec * 0.34 * 100) / 100 : 850;
}

function brl(v: number | null | undefined) {
  return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface DadosClienteRecorrencia {
  nome: string;
  dono?: string;
  nicho: string;
  status?: string;
  fechamento: string;
  valorRecorrencia: number;
  entrada?: number | null;
  primeiroMesGratis: boolean;
  dataPrimeiroPagamento: string | null;
  integrarAsaas: boolean;
  // dados do Asaas, obrigatórios só quando integrarAsaas = true
  cpfCnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  juros?: number;
  multa?: number;
}

// Cria o cliente no nosso banco e, se pedido, no Asaas de verdade
// (cliente + assinatura recorrente). Usado tanto pela venda de
// recorrência direta quanto pelo fluxo de consultoria que vende
// recorrência junto — pra não duplicar essa lógica em dois lugares.
export async function criarClienteComRecorrencia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  criadoPorId: string,
  d: DadosClienteRecorrencia
): Promise<
  | { error: string }
  | { clienteId: string; asaasCustomerId: string | null; asaasSubscriptionId: string | null }
> {
  const traf = calcTraf(d.valorRecorrencia);
  const taxa = 2.98;
  const liq = d.valorRecorrencia - traf - taxa;
  const marg = d.valorRecorrencia ? (liq / d.valorRecorrencia) * 100 : 0;

  const { count } = await supabase.from("clientes").select("*", { count: "exact", head: true });

  const { data: novoCliente, error: clienteError } = await supabase
    .from("clientes")
    .insert({
      n: (count || 0) + 1,
      nome: d.nome,
      dono: d.dono || "",
      nicho: d.nicho,
      status: d.status || "Onboarding urgente",
      rec: d.valorRecorrencia,
      traf,
      com: 0,
      imp: 0,
      taxa,
      taxa_fonte: "estimado",
      liq,
      marg,
      entrada: d.entrada ?? null,
      hoje: d.entrada ?? null,
      growth_note: d.entrada == null ? "sem_dado" : "nao_iniciado",
      band: null,
      fechamento: d.fechamento,
      promo_primeiro_mes_gratis: d.primeiroMesGratis,
      inicio_cobranca_recorrente: d.primeiroMesGratis ? d.dataPrimeiroPagamento : null,
    })
    .select("id")
    .single();

  if (clienteError || !novoCliente) {
    return { error: "Não deu pra salvar o cliente: " + (clienteError?.message || "erro desconhecido") };
  }
  const clienteId = novoCliente.id as string;

  if (d.primeiroMesGratis && d.dataPrimeiroPagamento) {
    await supabase.from("receita_eventos").insert({
      cliente_id: clienteId,
      cliente_nome: d.nome,
      tipo: "novo_cliente",
      valor: d.valorRecorrencia,
      data: d.dataPrimeiroPagamento,
      descricao: `Novo cliente (início da recorrência pós-promo): ${d.nome}`,
      criado_por: criadoPorId,
    });
  }

  await supabase.from("icp_log").insert({
    titulo: `Novo cliente: ${d.nome}`,
    detalhe: `Nicho ${d.nicho}, entrada de recorrência ${brl(d.valorRecorrencia)}${
      d.entrada != null ? `, faturamento de entrada ${brl(d.entrada)}` : ""
    }.`,
  });

  if (!d.integrarAsaas) {
    return { clienteId, asaasCustomerId: null, asaasSubscriptionId: null };
  }

  if (!d.cpfCnpj || !d.cep || !d.dataPrimeiroPagamento) {
    return {
      error:
        "Cliente salvo no sistema, mas faltou CPF/CNPJ, CEP ou data do 1º pagamento pra integrar com o Asaas.",
    };
  }

  try {
    const asaasCliente = await criarClienteAsaas({
      nome: d.nome,
      cpfCnpj: d.cpfCnpj,
      email: d.email,
      telefone: d.telefone,
      cep: d.cep,
      endereco: d.endereco,
      numero: d.numero,
      complemento: d.complemento,
      bairro: d.bairro,
    });

    await supabase.from("clientes").update({ asaas_customer_id: asaasCliente.id }).eq("id", clienteId);

    const asaasAssinatura = await criarAssinaturaAsaas({
      customerId: asaasCliente.id,
      valor: d.valorRecorrencia,
      vencimento: d.dataPrimeiroPagamento,
      juros: d.juros ?? 1,
      multa: d.multa ?? 2,
      descricao: `Aceleração — assinatura mensal (${d.nome})`,
    });

    return { clienteId, asaasCustomerId: asaasCliente.id, asaasSubscriptionId: asaasAssinatura.id };
  } catch (e) {
    return {
      error:
        "Cliente salvo no sistema, mas a criação no Asaas falhou: " +
        (e instanceof Error ? e.message : String(e)) +
        ". Cadastre manualmente no Asaas e atualize o asaas_customer_id depois.",
    };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sugerirDatasReunioes } from "@/lib/reunioes";
import { criarClienteAsaas, criarAssinaturaAsaas } from "@/lib/asaas";

// Quem vende a consultoria normalmente é o comercial — precisa poder
// lançar isso ele mesmo, não só financeiro/onboarding.
function podeLancarConsultoria(role: string) {
  return role === "master" || role === "comercial" || role === "financeiro" || role === "onboarding";
}

function calcTraf(rec: number): number {
  return rec >= 2500 ? Math.round(rec * 0.34 * 100) / 100 : 850;
}

export async function lancarConsultoria(formData: FormData) {
  const profile = await requireProfile();
  if (!podeLancarConsultoria(profile.role)) return { error: "Sem permissão." };

  const supabase = await createClient();

  const valorConsultoria = parseFloat(String(formData.get("valorConsultoria") || "0")) || 0;
  const dataFechamento = String(formData.get("dataFechamento") || "");
  const nomeCliente = String(formData.get("nomeCliente") || "").trim();
  const vendeuRecorrencia = formData.get("vendeuRecorrencia") === "on";

  if (!valorConsultoria || !dataFechamento || !nomeCliente) {
    return { error: "Preencha valor da consultoria, data de fechamento e nome do cliente." };
  }

  const temas = formData.getAll("tema").map((t) => String(t).trim()).filter(Boolean);
  const datasReunioes = sugerirDatasReunioes(dataFechamento, temas.length);

  let clienteId: string | null = null;
  let asaasCustomerId: string | null = null;
  let asaasSubscriptionId: string | null = null;

  // -----------------------------------------------------------------
  // Se vendeu recorrência: cadastra o cliente (sempre como novo, por
  // regra — consultoria pra quem já paga recorrência é raríssimo) e
  // cria de verdade no Asaas (cliente + assinatura recorrente).
  // -----------------------------------------------------------------
  if (vendeuRecorrencia) {
    const nicho = String(formData.get("nicho") || "").trim();
    const cpfCnpj = String(formData.get("cpfCnpj") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const telefone = String(formData.get("telefone") || "").trim();
    const cep = String(formData.get("cep") || "").trim();
    const endereco = String(formData.get("endereco") || "").trim();
    const numero = String(formData.get("numero") || "").trim();
    const complemento = String(formData.get("complemento") || "").trim();
    const bairro = String(formData.get("bairro") || "").trim();

    const valorRecorrencia = parseFloat(String(formData.get("valorRecorrencia") || "0")) || 0;
    const primeiroMesGratis = formData.get("primeiroMesGratis") === "on";
    const dataPrimeiroPagamento = String(formData.get("dataPrimeiroPagamento") || "");
    const juros = parseFloat(String(formData.get("juros") || "1")) || 1;
    const multa = parseFloat(String(formData.get("multa") || "2")) || 2;

    if (!nicho || !cpfCnpj || !cep || !valorRecorrencia || !dataPrimeiroPagamento) {
      return {
        error:
          "Pra recorrência com Asaas, preencha nicho, CPF/CNPJ, CEP, valor da recorrência e data do 1º pagamento.",
      };
    }

    const traf = calcTraf(valorRecorrencia);
    const taxa = 2.98;
    const liq = valorRecorrencia - traf - taxa;
    const marg = valorRecorrencia ? (liq / valorRecorrencia) * 100 : 0;

    const { count } = await supabase.from("clientes").select("*", { count: "exact", head: true });

    const { data: novoCliente, error: clienteError } = await supabase
      .from("clientes")
      .insert({
        n: (count || 0) + 1,
        nome: nomeCliente,
        dono: "",
        nicho,
        status: "Onboarding urgente",
        rec: valorRecorrencia,
        traf,
        com: 0,
        imp: 0,
        taxa,
        taxa_fonte: "estimado",
        liq,
        marg,
        entrada: null,
        hoje: null,
        growth_note: "nao_iniciado",
        band: null,
        fechamento: dataFechamento,
        promo_primeiro_mes_gratis: primeiroMesGratis,
        inicio_cobranca_recorrente: primeiroMesGratis ? dataPrimeiroPagamento : null,
      })
      .select("id")
      .single();

    if (clienteError || !novoCliente) {
      return { error: "Não deu pra cadastrar o cliente: " + (clienteError?.message || "erro desconhecido") };
    }
    clienteId = novoCliente.id;

    // Se for promo, a trigger de insert NÃO loga o evento de receita (só
    // loga quando não é promo) — então agenda aqui, na data real do 1º
    // pagamento, pra "faturamento novo do mês" contar certo quando chegar.
    if (primeiroMesGratis) {
      await supabase.from("receita_eventos").insert({
        cliente_id: clienteId,
        tipo: "novo_cliente",
        valor: valorRecorrencia,
        data: dataPrimeiroPagamento,
        descricao: `Novo cliente (início da recorrência pós-promo): ${nomeCliente}`,
        criado_por: profile.id,
      });
    }

    // Cria de verdade no Asaas — cliente + assinatura recorrente.
    try {
      const asaasCliente = await criarClienteAsaas({
        nome: nomeCliente,
        cpfCnpj,
        email,
        telefone,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
      });
      asaasCustomerId = asaasCliente.id;

      await supabase.from("clientes").update({ asaas_customer_id: asaasCustomerId }).eq("id", clienteId);

      const asaasAssinatura = await criarAssinaturaAsaas({
        customerId: asaasCustomerId,
        valor: valorRecorrencia,
        vencimento: dataPrimeiroPagamento,
        juros,
        multa,
        descricao: `Aceleração — assinatura mensal (${nomeCliente})`,
      });
      asaasSubscriptionId = asaasAssinatura.id;
    } catch (e) {
      // O cliente já foi criado no nosso sistema — não desfaz, só avisa
      // que a parte do Asaas falhou, pra tratar manualmente.
      return {
        error:
          "Cliente salvo no sistema, mas a criação no Asaas falhou: " +
          (e instanceof Error ? e.message : String(e)) +
          ". Cadastre manualmente no Asaas e atualize o asaas_customer_id depois.",
      };
    }

    revalidatePath("/clientes");
    revalidatePath("/dashboard");
  }

  // -----------------------------------------------------------------
  // Pagamento da consultoria em si — sempre, com ou sem recorrência.
  // -----------------------------------------------------------------
  await supabase.from("pagamentos").insert({
    data: dataFechamento,
    cliente: nomeCliente,
    valor: valorConsultoria,
    canal: "Asaas",
    tipo: "consultoria",
    descricao: `Consultoria — ${temas.length} reunião(ões)`,
    pendente: false,
  });

  await supabase.from("receita_eventos").insert({
    cliente_id: clienteId,
    tipo: "consultoria",
    valor: valorConsultoria,
    data: dataFechamento,
    descricao: `Consultoria: ${nomeCliente}`,
    criado_por: profile.id,
  });

  // -----------------------------------------------------------------
  // Uma tarefa por tema de reunião, datada.
  // -----------------------------------------------------------------
  if (temas.length) {
    await supabase.from("tarefas").insert(
      temas.map((tema, i) => ({
        titulo: tema,
        descricao: `Reunião de consultoria — ${nomeCliente} · sugerida pra ${new Date(
          datasReunioes[i] + "T12:00:00"
        ).toLocaleDateString("pt-BR")}`,
        coluna: "a-fazer",
        urgencia: "media",
        cliente_nome: nomeCliente,
        criado_em: datasReunioes[i],
      }))
    );
  }

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/dashboard");

  return {
    success: true,
    asaasCustomerId,
    asaasSubscriptionId,
  };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sugerirDatasReunioes } from "@/lib/reunioes";
import { criarClienteComRecorrencia } from "@/lib/clienteAsaas";

// Quem vende a consultoria normalmente é o comercial — precisa poder
// lançar isso ele mesmo, não só financeiro/onboarding.
function podeLancarConsultoria(role: string) {
  return role === "master" || role === "comercial" || role === "financeiro" || role === "onboarding";
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

  // Se vendeu recorrência: cadastra o cliente (sempre como novo, por
  // regra — consultoria pra quem já paga recorrência é raríssimo) e
  // cria de verdade no Asaas (cliente + assinatura recorrente).
  if (vendeuRecorrencia) {
    const resultado = await criarClienteComRecorrencia(supabase, profile.id, {
      nome: nomeCliente,
      nicho: String(formData.get("nicho") || "").trim(),
      fechamento: dataFechamento,
      valorRecorrencia: parseFloat(String(formData.get("valorRecorrencia") || "0")) || 0,
      primeiroMesGratis: formData.get("primeiroMesGratis") === "on",
      dataPrimeiroPagamento: String(formData.get("dataPrimeiroPagamento") || "") || null,
      integrarAsaas: true,
      cpfCnpj: String(formData.get("cpfCnpj") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      telefone: String(formData.get("telefone") || "").trim(),
      cep: String(formData.get("cep") || "").trim(),
      endereco: String(formData.get("endereco") || "").trim(),
      numero: String(formData.get("numero") || "").trim(),
      complemento: String(formData.get("complemento") || "").trim(),
      bairro: String(formData.get("bairro") || "").trim(),
      juros: parseFloat(String(formData.get("juros") || "1")) || 1,
      multa: parseFloat(String(formData.get("multa") || "2")) || 2,
    });

    if ("error" in resultado) return resultado;
    clienteId = resultado.clienteId;
    asaasCustomerId = resultado.asaasCustomerId;
    asaasSubscriptionId = resultado.asaasSubscriptionId;

    revalidatePath("/clientes");
    revalidatePath("/dashboard");
  }

  // Pagamento da consultoria em si — sempre, com ou sem recorrência.
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

  // Uma tarefa por tema de reunião, datada.
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

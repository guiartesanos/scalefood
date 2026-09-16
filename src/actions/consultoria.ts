"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { gerarDatasCadencia } from "@/lib/reunioes";
import { criarClienteComRecorrencia } from "@/lib/clienteAsaas";
import { criarEventoReuniao, atualizarEventoReuniao } from "@/lib/googleCalendar";
import { CONSULTORIA_TAREFAS_PADRAO } from "@/lib/types";

const DURACAO_REUNIAO_MIN = 45;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quem vende a consultoria normalmente é o comercial — precisa poder
// lançar isso ele mesmo, não só financeiro/onboarding.
function podeLancarConsultoria(role: string) {
  return role === "master" || role === "comercial" || role === "financeiro" || role === "onboarding";
}

// Trim + remove vazios/duplicados + valida formato básico — usado tanto
// no cadastro quanto na edição de e-mails do cliente de consultoria.
function normalizarEmails(emails: string[]): { emails: string[] } | { error: string } {
  const limpos = [...new Set(emails.map((e) => e.trim()).filter(Boolean))];
  const invalido = limpos.find((e) => !EMAIL_RE.test(e));
  if (invalido) return { error: `"${invalido}" não parece um e-mail válido.` };
  return { emails: limpos };
}

export async function lancarConsultoria(formData: FormData) {
  const profile = await requireProfile();
  if (!podeLancarConsultoria(profile.role)) return { error: "Sem permissão." };

  const supabase = await createClient();

  const valorConsultoria = parseFloat(String(formData.get("valorConsultoria") || "0")) || 0;
  const dataFechamento = String(formData.get("dataFechamento") || "");
  const nomeCliente = String(formData.get("nomeCliente") || "").trim();
  const emailCliente = String(formData.get("email") || "").trim();
  const vendeuRecorrencia = formData.get("vendeuRecorrencia") === "on";
  const canal = String(formData.get("canal") || "PIX C6");

  if (!valorConsultoria || !dataFechamento || !nomeCliente) {
    return { error: "Preencha valor da consultoria, data de fechamento e nome do cliente." };
  }

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
      integrarAsaas: String(formData.get("canalRecorrencia") || "") === "Asaas",
      cpfCnpj: String(formData.get("cpfCnpj") || "").trim(),
      email: emailCliente,
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
    canal,
    tipo: "consultoria",
    descricao: `Consultoria — onboarding (${CONSULTORIA_TAREFAS_PADRAO.length} etapas)`,
    pendente: false,
  });

  await supabase.from("receita_eventos").insert({
    cliente_id: clienteId,
    cliente_nome: nomeCliente,
    tipo: "consultoria",
    valor: valorConsultoria,
    data: dataFechamento,
    descricao: `Consultoria: ${nomeCliente}`,
    criado_por: profile.id,
  });

  // Quadro de consultoria: cria o cliente + as 8 tarefas fixas de
  // onboarding. A 1ª fica pendente de agendamento manual (ver
  // agendarPrimeiraReuniao); as demais já nascem com data pela cadência
  // padrão (segunda às 09:00), ajustável depois pelo card
  // (redefinirCadenciaConsultoria).
  const DIA_PADRAO = 1;
  const HORA_PADRAO = "09:00";
  const { data: consultoriaCliente } = await supabase
    .from("consultoria_clientes")
    .insert({
      nome: nomeCliente,
      emails: emailCliente ? [emailCliente] : [],
      cliente_id: clienteId,
      data_fechamento: dataFechamento,
      valor: valorConsultoria,
      dia_semana_recorrente: DIA_PADRAO,
      hora_recorrente: HORA_PADRAO,
      criado_por: profile.id,
    })
    .select("id")
    .single();

  if (consultoriaCliente) {
    const datasSeguintes = gerarDatasCadencia(dataFechamento, DIA_PADRAO, CONSULTORIA_TAREFAS_PADRAO.length - 1);
    await supabase.from("consultoria_tarefas").insert(
      CONSULTORIA_TAREFAS_PADRAO.map((titulo, i) => ({
        consultoria_cliente_id: consultoriaCliente.id,
        titulo,
        ordem: i + 1,
        data_reuniao: i === 0 ? null : datasSeguintes[i - 1],
        hora_reuniao: i === 0 ? null : HORA_PADRAO,
      }))
    );
  }

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/dashboard");
  revalidatePath("/consultoria");

  return {
    success: true,
    asaasCustomerId,
    asaasSubscriptionId,
  };
}

export async function marcarTarefaConsultoria(tarefaId: string, feito: boolean) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("consultoria_tarefas")
    .update({ feito, feito_em: feito ? new Date().toISOString() : null })
    .eq("id", tarefaId);
  if (error) return { error: error.message };
  revalidatePath("/consultoria");
  return { success: true };
}

// Agenda a 1ª reunião (a que fica pendente de alinhamento manual com o
// cliente) — preenche a data/hora e tenta criar o evento no Calendar.
export async function agendarPrimeiraReuniao(tarefaId: string, data: string, hora: string) {
  await requireProfile();
  const supabase = await createClient();

  const { data: tarefa } = await supabase
    .from("consultoria_tarefas")
    .select("*, consultoria_clientes(nome, emails)")
    .eq("id", tarefaId)
    .single();
  if (!tarefa) return { error: "Tarefa não encontrada." };

  let googleEventId: string | null = null;
  let googleEventUrl: string | null = null;
  let googleMeetUrl: string | null = null;
  try {
    const cliente = tarefa.consultoria_clientes as { nome: string; emails: string[] } | null;
    const evento = await criarEventoReuniao({
      titulo: `Consultoria — ${cliente?.nome || ""}: ${tarefa.titulo}`,
      data,
      hora,
      duracaoMin: DURACAO_REUNIAO_MIN,
      emails: cliente?.emails,
    });
    googleEventId = evento?.id || null;
    googleEventUrl = evento?.htmlLink || null;
    googleMeetUrl = evento?.meetUrl || null;
  } catch {
    // Calendar indisponível ou deu erro — a reunião fica agendada no
    // sistema mesmo assim, só sem evento no Google.
  }

  const { error } = await supabase
    .from("consultoria_tarefas")
    .update({ data_reuniao: data, hora_reuniao: hora, google_event_id: googleEventId, google_event_url: googleEventUrl, google_meet_url: googleMeetUrl })
    .eq("id", tarefaId);
  if (error) return { error: error.message };
  revalidatePath("/consultoria");
  return { success: true };
}

// Redefine "toda [dia] às [hora]" pras reuniões 2-8 desse cliente —
// realinha de uma vez as que ainda não aconteceram, movendo o evento já
// criado no Calendar (ou criando, se ainda não existia).
export async function redefinirCadenciaConsultoria(consultoriaClienteId: string, diaSemana: number, hora: string) {
  await requireProfile();
  if (![1, 2, 3, 4, 5].includes(diaSemana)) return { error: "Dia inválido." };
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("consultoria_clientes")
    .select("*")
    .eq("id", consultoriaClienteId)
    .single();
  if (!cliente) return { error: "Cliente não encontrado." };

  await supabase
    .from("consultoria_clientes")
    .update({ dia_semana_recorrente: diaSemana, hora_recorrente: hora })
    .eq("id", consultoriaClienteId);

  const { data: tarefas } = await supabase
    .from("consultoria_tarefas")
    .select("*")
    .eq("consultoria_cliente_id", consultoriaClienteId)
    .eq("feito", false)
    .gt("ordem", 1)
    .order("ordem");
  if (!tarefas?.length) {
    revalidatePath("/consultoria");
    return { success: true };
  }

  const novasDatas = gerarDatasCadencia(cliente.data_fechamento, diaSemana, tarefas.length);

  for (let i = 0; i < tarefas.length; i++) {
    const tarefa = tarefas[i];
    const novaData = novasDatas[i];
    let googleEventId = tarefa.google_event_id as string | null;
    let googleEventUrl = tarefa.google_event_url as string | null;
    let googleMeetUrl = tarefa.google_meet_url as string | null;

    try {
      if (googleEventId) {
        await atualizarEventoReuniao(googleEventId, { data: novaData, hora, duracaoMin: DURACAO_REUNIAO_MIN, emails: cliente.emails });
      } else {
        const evento = await criarEventoReuniao({
          titulo: `Consultoria — ${cliente.nome}: ${tarefa.titulo}`,
          data: novaData,
          hora,
          duracaoMin: DURACAO_REUNIAO_MIN,
          emails: cliente.emails,
        });
        googleEventId = evento?.id || null;
        googleEventUrl = evento?.htmlLink || null;
        googleMeetUrl = evento?.meetUrl || null;
      }
    } catch {
      // segue o baile — o evento fica desatualizado/sem criar no
      // Calendar, mas a data certa já está salva no sistema.
    }

    await supabase
      .from("consultoria_tarefas")
      .update({ data_reuniao: novaData, hora_reuniao: hora, google_event_id: googleEventId, google_event_url: googleEventUrl, google_meet_url: googleMeetUrl })
      .eq("id", tarefa.id);
  }

  revalidatePath("/consultoria");
  return { success: true };
}

export async function concluirClienteConsultoria(consultoriaClienteId: string) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("consultoria_clientes")
    .update({ concluido: true, concluido_em: new Date().toISOString() })
    .eq("id", consultoriaClienteId);
  if (error) return { error: error.message };
  revalidatePath("/consultoria");
  return { success: true };
}

// Caminho manual leve — pra cadastrar no quadro um cliente de consultoria
// que já existia antes dessa tela (não passou pelo formulário de venda).
export async function cadastrarConsultoriaManual(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const dataFechamento = String(formData.get("dataFechamento") || "");
  if (!nome || !email || !dataFechamento) return { error: "Preencha nome, e-mail e data de fechamento." };
  if (!EMAIL_RE.test(email)) return { error: "E-mail inválido." };

  const DIA_PADRAO = 1;
  const HORA_PADRAO = "09:00";
  const { data: consultoriaCliente, error } = await supabase
    .from("consultoria_clientes")
    .insert({
      nome,
      emails: [email],
      data_fechamento: dataFechamento,
      dia_semana_recorrente: DIA_PADRAO,
      hora_recorrente: HORA_PADRAO,
      criado_por: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const datasSeguintes = gerarDatasCadencia(dataFechamento, DIA_PADRAO, CONSULTORIA_TAREFAS_PADRAO.length - 1);
  await supabase.from("consultoria_tarefas").insert(
    CONSULTORIA_TAREFAS_PADRAO.map((titulo, i) => ({
      consultoria_cliente_id: consultoriaCliente.id,
      titulo,
      ordem: i + 1,
      data_reuniao: i === 0 ? null : datasSeguintes[i - 1],
      hora_reuniao: i === 0 ? null : HORA_PADRAO,
    }))
  );

  revalidatePath("/consultoria");
  return { success: true };
}

// Edita o(s) e-mail(s) do cliente de consultoria — se ele estiver linkado
// a um cliente de verdade (cliente_id), grava o mesmo array em
// clientes.emails também, pra não deixar duas cópias divergentes (a maioria
// das consultorias sem recorrência associada não tem esse link, e fica só
// com a cópia local mesmo). Também atualiza os convidados nas reuniões já
// criadas no Calendar, pra quem acabou de ganhar e-mail não ficar de fora
// de reunião que já estava marcada.
export async function atualizarEmailsConsultoria(consultoriaClienteId: string, emailsBrutos: string[]) {
  await requireProfile();
  const normalizado = normalizarEmails(emailsBrutos);
  if ("error" in normalizado) return normalizado;
  const { emails } = normalizado;

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("consultoria_clientes")
    .select("cliente_id")
    .eq("id", consultoriaClienteId)
    .single();
  if (!cliente) return { error: "Cliente não encontrado." };

  const { error } = await supabase.from("consultoria_clientes").update({ emails }).eq("id", consultoriaClienteId);
  if (error) return { error: error.message };

  if (cliente.cliente_id) {
    await supabase.from("clientes").update({ emails }).eq("id", cliente.cliente_id);
  }

  const { data: tarefas } = await supabase
    .from("consultoria_tarefas")
    .select("id, google_event_id")
    .eq("consultoria_cliente_id", consultoriaClienteId)
    .eq("feito", false)
    .not("google_event_id", "is", null);

  for (const tarefa of tarefas || []) {
    try {
      await atualizarEventoReuniao(tarefa.google_event_id as string, { emails });
    } catch {
      // fail-soft — o e-mail já está salvo no sistema mesmo que essa
      // reunião específica não consiga ser atualizada agora.
    }
  }

  revalidatePath("/consultoria");
  if (cliente.cliente_id) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${cliente.cliente_id}`);
  }
  return { success: true };
}

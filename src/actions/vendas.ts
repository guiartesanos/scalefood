"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { gerarDatasCadencia } from "@/lib/reunioes";
import { criarClienteComRecorrencia } from "@/lib/clienteAsaas";
import { buscarClientesAsaasPorNome } from "@/lib/asaas";
import { CONSULTORIA_TAREFAS_PADRAO, CONSULTORIA_TAREFAS_ONBOARDING } from "@/lib/types";

const DIA_PADRAO = 1;
const HORA_PADRAO = "09:00";

// Quem vende normalmente é o comercial — precisa poder lançar ele mesmo,
// não só financeiro/onboarding.
function podeLancarVenda(role: string) {
  return role === "master" || role === "comercial" || role === "financeiro" || role === "onboarding";
}

// Pré-preenche o e-mail em "Nova venda" a partir do cadastro do Asaas —
// dispara ao sair do campo "Nome do cliente" (ver NovaVendaButton.tsx).
// Só devolve e-mail quando a busca por nome bate em exatamente 1 cliente
// com e-mail cadastrado; nome ambíguo (0 ou 2+ resultados) não preenche
// nada sozinho, pra não arriscar puxar o e-mail de outro cliente.
export async function buscarEmailAsaasPorNome(nome: string): Promise<{ email: string | null }> {
  await requireProfile();
  const termo = nome.trim();
  if (termo.length < 3) return { email: null };

  const candidatos = await buscarClientesAsaasPorNome(termo);
  if (candidatos.length !== 1) return { email: null };
  return { email: candidatos[0].email || null };
}

// Monta a lista de títulos de reunião a partir da escolha do formulário —
// "padrão" muda conforme o que foi vendido (8 etapas do método se tem
// Consultoria; só "Onboarding" se for Recorrência e/ou Curso sozinhos),
// "manual" usa os títulos digitados, "nenhuma" não cria reunião nenhuma.
function montarTitulosReuniao(formData: FormData, temConsultoria: boolean): string[] {
  const modo = String(formData.get("modoReunioes") || "padrao");
  if (modo === "nenhuma") return [];
  if (modo === "manual") {
    return formData
      .getAll("reuniaoTitulo")
      .map((v) => String(v).trim())
      .filter(Boolean);
  }
  return temConsultoria ? [...CONSULTORIA_TAREFAS_PADRAO] : [...CONSULTORIA_TAREFAS_ONBOARDING];
}

// Ponto de entrada único de "Nova venda" — Consultoria, Recorrência e
// Curso podem ser combinados livremente na mesma venda (ver
// NovaVendaButton.tsx). Tráfego não tem checkbox próprio: é o único dos
// serviços que sempre acompanha a Recorrência (o repasse já é calculado
// automaticamente a partir do valor da recorrência, ver calcTraf em
// clienteAsaas.ts) — não existe "vender tráfego avulso". Recorrência cria
// o cliente "de verdade" em `clientes` (aparece na aba Recorrentes);
// Consultoria e/ou Curso criam (ou atualizam, se também vendeu
// recorrência) um cliente pontual em `consultoria_clientes` — é o que
// alimenta o quadro de Consultoria e a aba Clientes Pontuais.
export async function lancarVenda(formData: FormData) {
  const profile = await requireProfile();
  if (!podeLancarVenda(profile.role)) return { error: "Sem permissão." };

  const supabase = await createClient();

  const vendeuConsultoria = formData.get("vendeuConsultoria") === "on";
  const vendeuRecorrencia = formData.get("vendeuRecorrencia") === "on";
  const vendeuCurso = formData.get("vendeuCurso") === "on";

  if (!vendeuConsultoria && !vendeuRecorrencia && !vendeuCurso) {
    return { error: "Selecione ao menos um produto: Consultoria, Recorrência ou Curso." };
  }

  const nomeCliente = String(formData.get("nomeCliente") || "").trim();
  const emailCliente = String(formData.get("email") || "").trim();
  const dataFechamento = String(formData.get("dataFechamento") || "");
  if (!nomeCliente || !dataFechamento) {
    return { error: "Preencha nome do cliente e data de fechamento." };
  }

  let clienteId: string | null = null;
  let asaasCustomerId: string | null = null;
  let asaasSubscriptionId: string | null = null;

  if (vendeuRecorrencia) {
    const valorRecorrencia = parseFloat(String(formData.get("valorRecorrencia") || "0")) || 0;
    if (!valorRecorrencia) return { error: "Informe o valor da recorrência." };

    const canalRecorrencia = String(formData.get("canalRecorrencia") || "");
    const resultado = await criarClienteComRecorrencia(supabase, profile.id, {
      nome: nomeCliente,
      nicho: String(formData.get("nicho") || "").trim(),
      fechamento: dataFechamento,
      valorRecorrencia,
      primeiroMesGratis: formData.get("primeiroMesGratis") === "on",
      dataPrimeiroPagamento: String(formData.get("dataPrimeiroPagamento") || "") || null,
      integrarAsaas: canalRecorrencia === "Asaas",
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

    // Já recebeu um 1º pagamento à vista da recorrência (ex: PIX na hora
    // do fechamento, antes da cobrança recorrente começar a valer).
    const jaRecebeuAVista = formData.get("jaRecebeuAVista") === "on";
    const valorAVista = jaRecebeuAVista ? parseFloat(String(formData.get("valorAVista") || "0")) || 0 : 0;
    if (jaRecebeuAVista && valorAVista > 0) {
      await supabase.from("pagamentos").insert({
        data: String(formData.get("dataAVista") || "") || dataFechamento,
        cliente: nomeCliente,
        valor: valorAVista,
        canal: String(formData.get("canalAVista") || "PIX C6"),
        tipo: "recorrencia",
        descricao: `1º pagamento à vista: ${nomeCliente}`,
        pendente: false,
      });
    }

    revalidatePath("/clientes");
    revalidatePath("/dashboard");
  }

  let valorConsultoria = 0;
  if (vendeuConsultoria) {
    valorConsultoria = parseFloat(String(formData.get("valorConsultoria") || "0")) || 0;
    if (!valorConsultoria) return { error: "Informe o valor da consultoria." };
    await supabase.from("pagamentos").insert({
      data: dataFechamento,
      cliente: nomeCliente,
      valor: valorConsultoria,
      canal: String(formData.get("canalConsultoria") || "PIX C6"),
      tipo: "consultoria",
      descricao: `Consultoria: ${nomeCliente}`,
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
  }

  let valorCurso = 0;
  if (vendeuCurso) {
    valorCurso = parseFloat(String(formData.get("valorCurso") || "0")) || 0;
    if (!valorCurso) return { error: "Informe o valor do curso." };
    await supabase.from("pagamentos").insert({
      data: dataFechamento,
      cliente: nomeCliente,
      valor: valorCurso,
      canal: String(formData.get("canalCurso") || "PIX C6"),
      tipo: "curso",
      descricao: `Curso: ${nomeCliente}`,
      pendente: false,
    });
    await supabase.from("receita_eventos").insert({
      cliente_id: clienteId,
      cliente_nome: nomeCliente,
      tipo: "curso",
      valor: valorCurso,
      data: dataFechamento,
      descricao: `Curso: ${nomeCliente}`,
      criado_por: profile.id,
    });
  }

  // Cliente pontual: só existe quando Consultoria e/ou Curso foram
  // vendidos — é o que alimenta o quadro de Consultoria e a aba "Clientes
  // pontuais". Quem comprou só Curso (sem Consultoria) nasce como
  // "curso_comprado" (conclui sozinho em 7 dias — ver
  // /api/cron/curso-status-auto); os demais nascem "aguardando_inicio".
  if (vendeuConsultoria || vendeuCurso) {
    const produtos = [vendeuConsultoria && "consultoria", vendeuCurso && "curso"].filter(Boolean) as string[];
    const apenasCurso = vendeuCurso && !vendeuConsultoria;
    const titulos = montarTitulosReuniao(formData, vendeuConsultoria);

    const { data: consultoriaCliente } = await supabase
      .from("consultoria_clientes")
      .insert({
        nome: nomeCliente,
        emails: emailCliente ? [emailCliente] : [],
        cliente_id: clienteId,
        data_fechamento: dataFechamento,
        valor: valorConsultoria + valorCurso,
        dia_semana_recorrente: DIA_PADRAO,
        hora_recorrente: HORA_PADRAO,
        produtos,
        status: apenasCurso ? "curso_comprado" : "aguardando_inicio",
        criado_por: profile.id,
      })
      .select("id")
      .single();

    if (consultoriaCliente && titulos.length) {
      const datasSeguintes = gerarDatasCadencia(dataFechamento, DIA_PADRAO, titulos.length - 1);
      await supabase.from("consultoria_tarefas").insert(
        titulos.map((titulo, i) => ({
          consultoria_cliente_id: consultoriaCliente.id,
          titulo,
          ordem: i + 1,
          data_reuniao: i === 0 ? null : datasSeguintes[i - 1],
          hora_reuniao: i === 0 ? null : HORA_PADRAO,
        }))
      );
    }

    revalidatePath("/consultoria");
  }

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/dashboard");

  return { success: true, asaasCustomerId, asaasSubscriptionId };
}

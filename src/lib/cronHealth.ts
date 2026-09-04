import { createAdminClient, createClient } from "@/lib/supabase/server";

// Nomes fixos — usados tanto pra registrar (dentro de cada rota de cron)
// quanto pra exibir (na tela de Integrações). Ter isso numa lista central
// evita erro de digitação criando uma linha nova em vez de atualizar a
// existente.
export const CRONS = [
  { chave: "fechamento-mensal", label: "Fechamento mensal" },
  { chave: "tarifas-asaas", label: "Tarifas Asaas" },
  { chave: "imposto-mensal", label: "Imposto mensal" },
  { chave: "radar-noticias", label: "Radar de notícias" },
] as const;

export type CronChave = (typeof CRONS)[number]["chave"];

// Chamado no fim de toda execução de cron (sucesso ou falha) — nunca deve
// ele mesmo derrubar a resposta do cron, por isso o try/catch interno.
// `detalhe` é um resumo curto do resultado (ex: "3 tarifas, R$ 42,10"),
// só pra dar contexto na tela sem precisar abrir log nenhum.
export async function registrarExecucaoCron(
  chave: CronChave,
  resultado: { ok: boolean; erro?: string; detalhe?: string }
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const agora = new Date().toISOString();
    await supabase.from("cron_execucoes").upsert({
      nome: chave,
      ultima_execucao_em: agora,
      ultimo_sucesso: resultado.ok,
      ultimo_erro: resultado.ok ? null : resultado.erro || "Erro desconhecido.",
      ultimo_detalhe: resultado.detalhe ?? null,
      ...(resultado.ok ? { ultimo_ok_em: agora } : {}),
    });
  } catch {
    // Se nem isso funcionar, não é motivo pra derrubar a resposta do cron.
  }
}

export interface SaudeCron {
  chave: CronChave;
  label: string;
  nuncaRodou: boolean;
  ultimaExecucaoEm: string | null;
  ultimoSucesso: boolean;
  ultimoErro: string | null;
  ultimoOkEm: string | null;
  ultimoDetalhe: string | null;
}

// Pra tela de Integrações (master) — usa o client normal (RLS master-only),
// não o admin, mesma cautela das outras leituras dessa tela.
export async function listarSaudeCrons(): Promise<SaudeCron[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cron_execucoes").select("*");
  const porChave = new Map((data || []).map((r) => [r.nome as string, r]));

  return CRONS.map(({ chave, label }) => {
    const row = porChave.get(chave);
    if (!row) {
      return {
        chave,
        label,
        nuncaRodou: true,
        ultimaExecucaoEm: null,
        ultimoSucesso: false,
        ultimoErro: null,
        ultimoOkEm: null,
        ultimoDetalhe: null,
      };
    }
    return {
      chave,
      label,
      nuncaRodou: false,
      ultimaExecucaoEm: row.ultima_execucao_em,
      ultimoSucesso: row.ultimo_sucesso,
      ultimoErro: row.ultimo_erro,
      ultimoOkEm: row.ultimo_ok_em,
      ultimoDetalhe: row.ultimo_detalhe,
    };
  });
}

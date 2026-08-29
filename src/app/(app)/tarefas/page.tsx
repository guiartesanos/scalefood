import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientes, tenureLabel } from "@/lib/data";
import { NovaTarefaForm } from "@/components/NovaTarefaForm";
import { MoverTarefaButtons } from "@/components/MoverTarefaButtons";
import { RemoverTarefaButton } from "@/components/RemoverTarefaButton";
import { SugestaoTarefaButton } from "@/components/SugestaoTarefaButton";
import { NovaAgendaForm } from "@/components/NovaAgendaForm";

const COLS = [
  { key: "a-fazer", label: "A fazer" },
  { key: "em-andamento", label: "Em andamento" },
  { key: "feito", label: "Feito" },
] as const;

const URG_CLS: Record<string, string> = { alta: "critical", media: "warning", baixa: "muted" };

export default async function TarefasPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data: tarefas } = await supabase.from("tarefas").select("*").order("created_at");
  const { data: agendas } = await supabase.from("agendas").select("*").order("nome");
  const clientes = await getClientes();

  const attnClientes = clientes.filter((c) => {
    const t = tenureLabel(c.fechamento);
    return (c.growth_note === "estagnado" && t.days > 60) || c.status === "Pediu pra cancelar" || (c.status === "Onboarding urgente" && t.days > 7);
  });

  return (
    <>
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[21px]">Quadro (kanban)</h2>
        </div>
        <NovaTarefaForm agendas={agendas || []} />
        {!agendas?.length && (
          <p className="text-sm text-muted">
            ⚠ Nenhuma agenda cadastrada ainda — cadastre abaixo quando tiver os e-mails do time.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
          {COLS.map((col) => {
            const list = (tarefas || []).filter((t) => t.coluna === col.key);
            return (
              <div key={col.key} className="bg-paper-2 border border-line rounded-xl p-2.5 flex flex-col gap-2.5 min-h-[120px]">
                <div className="flex justify-between items-center px-1">
                  <h4 className="font-display font-bold text-sm uppercase tracking-wide text-ink-2">{col.label}</h4>
                  <span className="text-[11px] text-muted num">{list.length}</span>
                </div>
                {list.map((t) => {
                  const agenda = agendas?.find((a) => a.id === t.agenda_id);
                  return (
                    <div key={t.id} className="bg-paper border border-line rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
                      <span className="font-semibold text-[13px]">{t.titulo}</span>
                      {t.descricao && <span className="text-xs text-ink-2">{t.descricao}</span>}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span
                          className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ color: `var(--${URG_CLS[t.urgencia]})`, background: `var(--${URG_CLS[t.urgencia]}-wash, var(--paper-2))` }}
                        >
                          {t.urgencia}
                        </span>
                        {t.cliente_nome && <span className="text-[10.5px] bg-paper-2 border border-line rounded-full px-1.5 py-0.5">{t.cliente_nome}</span>}
                      </div>
                      <span className="text-[10.5px] text-muted num">📅 {agenda ? agenda.nome : "sem agenda definida"}</span>
                      <div className="flex justify-between items-center">
                        <MoverTarefaButtons tarefaId={t.id} colunaAtual={t.coluna} />
                        <RemoverTarefaButton tarefaId={t.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Sugestões automáticas</h2>
        <div className="flex flex-col gap-2">
          {attnClientes.length ? (
            attnClientes.map((c) => {
              const jaTem = (tarefas || []).some((t) => t.cliente_nome === c.nome && t.coluna !== "feito");
              return (
                <div key={c.id} className="flex justify-between items-center gap-3 bg-paper border border-line border-l-[3px] rounded-lg px-3 py-2 text-[12.5px]" style={{ borderLeftColor: "var(--serious)" }}>
                  <span>{c.nome} — {c.status}</span>
                  {jaTem ? <span className="text-muted">já tem tarefa aberta</span> : <SugestaoTarefaButton clienteNome={c.nome} />}
                </div>
              );
            })
          ) : (
            <span className="text-sm text-muted">Nenhuma urgência detectada na carteira agora.</span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Agendas</h2>
        <NovaAgendaForm />
        <div className="bg-paper border border-line rounded-xl p-4 flex flex-col gap-2">
          {(agendas || []).map((a) => (
            <div key={a.id} className="flex justify-between text-[13px] border-b border-dashed border-line/50 pb-1">
              <span>{a.nome}</span><span className="text-ink-2">{a.email || "—"}</span>
            </div>
          ))}
          {!agendas?.length && <span className="text-sm text-muted">Nenhuma agenda cadastrada ainda.</span>}
        </div>
      </section>
    </>
  );
}

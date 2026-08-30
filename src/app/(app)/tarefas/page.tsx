import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientes, tenureLabel } from "@/lib/data";
import { NovaTarefaForm } from "@/components/NovaTarefaForm";
import { SugestaoTarefaButton } from "@/components/SugestaoTarefaButton";
import { NovaAgendaForm } from "@/components/NovaAgendaForm";
import { TarefasKanban } from "@/components/TarefasKanban";

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
        <TarefasKanban tarefas={tarefas || []} agendas={agendas || []} />
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

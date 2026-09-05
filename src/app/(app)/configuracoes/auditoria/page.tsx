import { requireMaster } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const TIPO_LABEL: Record<string, string> = {
  custo_fixo: "Custo fixo",
  custo_variavel: "Custo variável",
  pagamento: "Pagamento",
  usuario: "Usuário",
  tarefa: "Tarefa",
};

export default async function AuditoriaPage() {
  // requireMaster já redireciona quem não é master pro /dashboard — e a
  // RLS de exclusoes_log (select só pra auth_role() = 'master') barra o
  // mesmo acesso direto pelo banco, então não é só um link escondido.
  await requireMaster();
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("exclusoes_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <section className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-display font-bold text-[21px]">Configurações &gt; Histórico de exclusões</h2>
        <p className="text-[13px] text-muted">
          Todo registro apagado no sistema (custos, pagamentos, usuários) fica registrado aqui — quem apagou e
          quando. Ninguém consegue editar ou apagar essas linhas, nem o master.
        </p>
      </div>

      <div className="border border-line rounded-lg overflow-auto bg-paper">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-paper-2">
              <Th>Quando</Th>
              <Th>Tipo</Th>
              <Th>O que foi apagado</Th>
              <Th>Quem apagou</Th>
            </tr>
          </thead>
          <tbody>
            {(log || []).map((l) => (
              <tr key={l.id} className="border-t border-line/50">
                <td className="px-3 py-2 whitespace-nowrap text-ink-2">
                  {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-paper-2 border border-line">
                    {TIPO_LABEL[l.tipo] || l.tipo}
                  </span>
                </td>
                <td className="px-3 py-2">{l.descricao}</td>
                <td className="px-3 py-2 font-semibold">{l.removido_por_nome}</td>
              </tr>
            ))}
            {!log?.length && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  Nenhuma exclusão registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10.5px] uppercase tracking-wide text-muted font-semibold">
      {children}
    </th>
  );
}

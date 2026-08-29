import { requireProfile } from "@/lib/auth";
import { getClientes, brl, brlInt, tenureLabel, pctOf } from "@/lib/data";
import { StatusSelect } from "@/components/StatusSelect";
import { ClienteValoresForm } from "@/components/ClienteValoresForm";
import { canEditClienteValores } from "@/lib/permissions";
import type { ClienteStatus } from "@/lib/types";

const COLS: { key: string; label: string; status: ClienteStatus }[] = [
  { key: "onboarding", label: "Onboarding", status: "Onboarding urgente" },
  { key: "rodando-sem", label: "Rodando · sem resultado", status: "Rodando - sem resultado ainda" },
  { key: "rodando-com", label: "Rodando · com resultado", status: "Rodando - com resultado" },
  { key: "cancelando", label: "Cancelando", status: "Pediu pra cancelar" },
];
const STRIPE: Record<string, string> = {
  onboarding: "var(--serious)",
  "rodando-sem": "var(--warning)",
  "rodando-com": "var(--good)",
  cancelando: "var(--critical)",
};

export default async function ClientesPage() {
  const profile = await requireProfile();
  const clientes = await getClientes();
  const podeEditarValores = canEditClienteValores(profile.role);

  const growthSorted = [...clientes].sort((a, b) => {
    const pa = pctOf(a), pb = pctOf(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pb - pa;
  });

  return (
    <>
      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Fluxo do projeto</h2>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {COLS.map((col) => {
            const list = clientes.filter((c) => c.status === col.status);
            return (
              <div key={col.key} className="bg-paper-2 border border-line rounded-xl p-2.5 flex flex-col gap-2">
                <div className="flex justify-between items-center px-1 pb-1" style={{ borderBottom: `2px solid ${STRIPE[col.key]}` }}>
                  <h4 className="font-display font-bold text-[13.5px]" style={{ color: STRIPE[col.key] }}>{col.label}</h4>
                  <span className="text-[11px] text-muted num">{list.length}</span>
                </div>
                {list.map((c) => {
                  const tenure = tenureLabel(c.fechamento);
                  const p = pctOf(c);
                  let attn = false, attnNote = "";
                  if (c.growth_note === "estagnado" && tenure.days > 60) { attn = true; attnNote = `estagnado há ${tenure.text}`; }
                  if (c.status === "Pediu pra cancelar") { attn = true; attnNote = "cancelamento em andamento"; }
                  if (c.status === "Onboarding urgente" && tenure.days > 7) { attn = true; attnNote = `onboarding parado há ${tenure.text}`; }
                  const growthTxt = p !== null ? `${p >= 0 ? "+" : ""}${p.toFixed(0)}%` : c.growth_note === "zero_base" ? "do zero" : "—";
                  return (
                    <div key={c.id} className="bg-paper border border-line rounded-lg p-2.5 flex flex-col gap-1" style={attn ? { borderLeft: "3px solid var(--critical)" } : undefined}>
                      <span className="font-semibold text-[12.5px]">{c.nome}</span>
                      <span className="text-[11px] text-muted">{c.dono} · {c.nicho} · cliente há {tenure.text}</span>
                      <span className="text-[11px] text-ink-2 num">{brl(c.rec)}/mês · crescimento {growthTxt}</span>
                      {attn && <span className="text-[10.5px] text-critical font-semibold">⚠ {attnNote}</span>}
                      <StatusSelect clienteId={c.id} status={c.status} />
                    </div>
                  );
                })}
                {!list.length && <span className="text-xs text-muted p-1.5">vazio</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display font-bold text-[21px]">Faturamento do cliente: entrada vs. hoje</h2>
        <div className="border border-line rounded-xl overflow-auto bg-paper">
          <table className="w-full min-w-[760px] text-[13px] border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <Th>Cliente</Th><Th>Status</Th><Th>Nicho</Th><Th>Cliente desde</Th><Th right>Entrada</Th><Th right>Hoje</Th><Th>Evolução</Th>
                {podeEditarValores && <Th>Valores</Th>}
              </tr>
            </thead>
            <tbody>
              {growthSorted.map((c) => {
                const tenure = tenureLabel(c.fechamento);
                const p = pctOf(c);
                let badge: string;
                if (c.growth_note === "zero_base") badge = `do zero → ${brlInt(c.hoje)}`;
                else if (c.growth_note === "nao_iniciado") badge = "parado — onboarding não iniciado";
                else if (c.growth_note === "estagnado") badge = "0% — estagnado";
                else if (c.growth_note === "sem_dado" || c.entrada == null) badge = "sem dado";
                else badge = `${(p ?? 0) >= 0 ? "+" : ""}${(p ?? 0).toFixed(1).replace(".", ",")}%`;
                return (
                  <tr key={c.id} className="border-t border-line/50">
                    <td className="px-3 py-2"><div className="flex flex-col"><b>{c.nome}</b><span className="text-[11px] text-muted">{c.dono}</span></div></td>
                    <td className="px-3 py-2"><StatusSelect clienteId={c.id} status={c.status} /></td>
                    <td className="px-3 py-2">{c.nicho}</td>
                    <td className="px-3 py-2 num">{tenure.text}</td>
                    <td className="px-3 py-2 text-right num">{c.entrada != null ? brlInt(c.entrada) : "—"}</td>
                    <td className="px-3 py-2 text-right num">{c.hoje != null ? brlInt(c.hoje) : "—"}</td>
                    <td className="px-3 py-2">{badge}</td>
                    {podeEditarValores && (
                      <td className="px-3 py-2">
                        <ClienteValoresForm cliente={c} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-[10.5px] uppercase tracking-wide text-muted font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
}

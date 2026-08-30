import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getClientes, brlInt, tenureLabel, pctOf } from "@/lib/data";
import { StatusSelect } from "@/components/StatusSelect";
import { ClienteValoresForm } from "@/components/ClienteValoresForm";
import { ClientesKanban } from "@/components/ClientesKanban";
import { canEditClienteValores } from "@/lib/permissions";

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
        <ClientesKanban clientes={clientes} />
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
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <Link href={`/clientes/${c.id}`} className="font-bold hover:text-accent-ink hover:underline self-start">
                          {c.nome}
                        </Link>
                        <span className="text-[11px] text-muted">{c.dono}</span>
                      </div>
                    </td>
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

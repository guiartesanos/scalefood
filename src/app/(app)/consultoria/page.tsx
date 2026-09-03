import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calendarConectado } from "@/lib/googleCalendar";
import { ConsultoriaBoard } from "@/components/ConsultoriaBoard";
import type { ConsultoriaCliente, ConsultoriaTarefa } from "@/lib/types";

const MENSAGEM_CALENDAR: Record<string, string> = {
  conectado: "Google Calendar conectado com sucesso.",
  erro: "Não consegui conectar com o Google Calendar. Tenta de novo?",
  "sem-permissao": "Só o master pode conectar o Google Calendar.",
};

export default async function ConsultoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: clientesRaw }, { data: tarefasRaw }, conectado] = await Promise.all([
    supabase.from("consultoria_clientes").select("*").order("data_fechamento", { ascending: false }),
    supabase.from("consultoria_tarefas").select("*").order("ordem"),
    calendarConectado(),
  ]);

  const clientes = (clientesRaw || []) as ConsultoriaCliente[];
  const tarefas = (tarefasRaw || []) as ConsultoriaTarefa[];

  const ativos = clientes.filter((c) => !c.concluido);
  const concluidos = clientes.filter((c) => c.concluido);
  const mensagemCalendar = params.calendar ? MENSAGEM_CALENDAR[params.calendar] : null;

  return (
    <ConsultoriaBoard
      ativos={ativos}
      concluidos={concluidos}
      tarefas={tarefas}
      calendarConectado={conectado}
      mostrarConexaoCalendar={profile.role === "master"}
      mensagemCalendar={mensagemCalendar}
      calendarErro={params.calendar === "erro" || params.calendar === "sem-permissao"}
    />
  );
}

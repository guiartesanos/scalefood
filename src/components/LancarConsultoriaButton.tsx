"use client";

import { useState, useTransition } from "react";
import { lancarConsultoria } from "@/actions/consultoria";

export function LancarConsultoriaButton() {
  const [open, setOpen] = useState(false);
  const [vendeuRecorrencia, setVendeuRecorrencia] = useState(false);
  const [primeiroMesGratis, setPrimeiroMesGratis] = useState(true);
  const [temas, setTemas] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setVendeuRecorrencia(false);
    setPrimeiroMesGratis(true);
    setTemas([""]);
    setError(null);
    setSucesso(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await lancarConsultoria(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        const partes = [`Consultoria lançada.`];
        if (result?.asaasCustomerId) partes.push(`Cliente Asaas: ${result.asaasCustomerId}`);
        if (result?.asaasSubscriptionId) partes.push(`Assinatura Asaas: ${result.asaasSubscriptionId}`);
        setSucesso(partes.join(" "));
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 2500);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-paper-2 hover:bg-paper border border-line text-ink text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors"
      >
        + nova consultoria
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-paper border border-line rounded-xl p-6 max-w-2xl w-full flex flex-col gap-4 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-display font-bold text-xl">Lançar consultoria</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-critical text-xl leading-none">
                ×
              </button>
            </div>

            <form action={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Valor da consultoria (R$)">
                  <input name="valorConsultoria" type="number" step="0.01" min="0" required className="input" />
                </Field>
                <Field label="Data da reunião de fechamento">
                  <input name="dataFechamento" type="date" required className="input" />
                </Field>
                <Field label="Nome do cliente">
                  <input name="nomeCliente" required className="input" />
                </Field>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-muted font-semibold">
                  Reuniões (uma tarefa por tema — datas sugeridas automaticamente)
                </label>
                {temas.map((tema, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      name="tema"
                      value={tema}
                      onChange={(e) => {
                        const next = [...temas];
                        next[i] = e.target.value;
                        setTemas(next);
                      }}
                      placeholder={`Tema da reunião ${i + 1}`}
                      className="input flex-1"
                    />
                    {temas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTemas(temas.filter((_, idx) => idx !== i))}
                        className="btn-ghost"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTemas([...temas, ""])}
                  className="text-xs text-accent-ink hover:underline self-start"
                >
                  + adicionar reunião
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm border-t border-line pt-4">
                <input
                  type="checkbox"
                  name="vendeuRecorrencia"
                  checked={vendeuRecorrencia}
                  onChange={(e) => setVendeuRecorrencia(e.target.checked)}
                />
                Vendeu recorrência (Aceleração) junto — cria cliente no sistema e no Asaas automaticamente
              </label>

              {vendeuRecorrencia && (
                <div className="flex flex-col gap-3 bg-paper-2 border border-dashed border-line rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nicho"><input name="nicho" required className="input" /></Field>
                    <Field label="CPF ou CNPJ"><input name="cpfCnpj" required className="input" /></Field>
                    <Field label="Email"><input name="email" type="email" className="input" /></Field>
                    <Field label="Telefone"><input name="telefone" className="input" /></Field>
                    <Field label="CEP"><input name="cep" required className="input" /></Field>
                    <Field label="Endereço"><input name="endereco" className="input" /></Field>
                    <Field label="Número"><input name="numero" className="input" /></Field>
                    <Field label="Complemento"><input name="complemento" className="input" /></Field>
                    <Field label="Bairro"><input name="bairro" className="input" /></Field>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-ink-2">
                    <input type="checkbox" name="emiteNota" defaultChecked />
                    Vai emitir nota fiscal (confirme sempre — é automático no Asaas ao confirmar pagamento)
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Valor da recorrência (R$)">
                      <input name="valorRecorrencia" type="number" step="0.01" min="0" required className="input" />
                    </Field>
                    <Field label="Data do 1º pagamento da recorrência">
                      <input name="dataPrimeiroPagamento" type="date" required className="input" />
                    </Field>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-ink-2">
                    <input
                      type="checkbox"
                      name="primeiroMesGratis"
                      checked={primeiroMesGratis}
                      onChange={(e) => setPrimeiroMesGratis(e.target.checked)}
                    />
                    1º mês de Aceleração grátis (recebe só a consultoria agora)
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Juros ao mês (%)">
                      <input name="juros" type="number" step="0.1" defaultValue={1} className="input" />
                    </Field>
                    <Field label="Multa (%)">
                      <input name="multa" type="number" step="0.1" defaultValue={2} className="input" />
                    </Field>
                  </div>
                </div>
              )}

              {error && <p className="text-critical text-sm">{error}</p>}
              {sucesso && <p className="text-good text-sm">{sucesso}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn">
                  cancelar
                </button>
                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? "salvando..." : "Lançar consultoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] uppercase tracking-wide text-muted font-semibold">{label}</label>
      {children}
    </div>
  );
}

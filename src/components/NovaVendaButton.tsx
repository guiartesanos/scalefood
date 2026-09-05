"use client";

import { useState, useTransition } from "react";
import { criarVendaRecorrencia } from "@/actions/vendaRecorrencia";
import { lancarConsultoria } from "@/actions/consultoria";
import { STATUS_LIST, CONSULTORIA_TAREFAS_PADRAO } from "@/lib/types";

type Modo = null | "recorrencia" | "consultoria";

export function NovaVendaButton() {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<Modo>(null);

  function fechar() {
    setOpen(false);
    setModo(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-accent hover:bg-accent-ink text-white text-xs font-semibold px-3 py-1.5 rounded whitespace-nowrap transition-colors"
      >
        + nova venda
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[500] flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-paper border border-line rounded-lg p-6 max-w-2xl w-full flex flex-col gap-4 shadow-[var(--shadow)]">
            <div className="flex justify-between items-start">
              <h3 className="font-display font-bold text-xl">Nova venda</h3>
              <button onClick={fechar} className="text-muted hover:text-critical text-xl leading-none">
                ×
              </button>
            </div>

            {modo === null && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-2">É uma recorrência (Aceleração) ou uma consultoria pontual?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModo("recorrencia")}
                    className="bg-paper-2 hover:bg-accent-wash border border-line rounded-lg p-4 flex flex-col gap-1 text-left transition-colors"
                  >
                    <span className="font-display font-bold text-lg">Recorrência</span>
                    <span className="text-xs text-ink-2">Cliente novo de Aceleração — mensalidade recorrente.</span>
                  </button>
                  <button
                    onClick={() => setModo("consultoria")}
                    className="bg-paper-2 hover:bg-accent-wash border border-line rounded-lg p-4 flex flex-col gap-1 text-left transition-colors"
                  >
                    <span className="font-display font-bold text-lg">Consultoria</span>
                    <span className="text-xs text-ink-2">Mentoria pontual, com ou sem recorrência junto.</span>
                  </button>
                </div>
              </div>
            )}

            {modo === "recorrencia" && <FormRecorrencia onVoltar={() => setModo(null)} onSucesso={fechar} />}
            {modo === "consultoria" && <FormConsultoria onVoltar={() => setModo(null)} onSucesso={fechar} />}
          </div>
        </div>
      )}
    </>
  );
}

function CamposAsaas({ prefix = "" }: { prefix?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Nicho"><input name={`${prefix}nicho`} required className="input" /></Field>
      <Field label="CPF ou CNPJ"><input name="cpfCnpj" required className="input" /></Field>
      <Field label="Telefone"><input name="telefone" className="input" /></Field>
      <CamposEndereco />
    </div>
  );
}

function CamposEndereco() {
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  async function buscarCep() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setErroCep("CEP precisa ter 8 dígitos.");
      return;
    }
    setErroCep(null);
    setBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErroCep("CEP não encontrado.");
      } else {
        setEndereco(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
      }
    } catch {
      setErroCep("Não deu pra buscar o CEP agora — preenche manual.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <>
      <Field label="CEP">
        <div className="flex gap-1.5">
          <input
            name="cep"
            required
            className="input flex-1"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscarCep();
              }
            }}
          />
          <button
            type="button"
            onClick={buscarCep}
            disabled={buscando}
            title="Buscar endereço pelo CEP"
            className="btn px-2.5 shrink-0"
          >
            {buscando ? "..." : "🔍"}
          </button>
        </div>
        {erroCep && <span className="text-[11px] text-critical">{erroCep}</span>}
      </Field>
      <Field label="Endereço">
        <input name="endereco" className="input" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      </Field>
      <Field label="Número"><input name="numero" className="input" /></Field>
      <Field label="Complemento"><input name="complemento" className="input" /></Field>
      <Field label="Bairro">
        <input name="bairro" className="input" value={bairro} onChange={(e) => setBairro(e.target.value)} />
      </Field>
      <Field label="Cidade">
        <input name="cidade" className="input" value={cidade} onChange={(e) => setCidade(e.target.value)} />
      </Field>
    </>
  );
}

function FormRecorrencia({ onVoltar, onSucesso }: { onVoltar: () => void; onSucesso: () => void }) {
  const [primeiroMesGratis, setPrimeiroMesGratis] = useState(false);
  const [jaRecebeuAVista, setJaRecebeuAVista] = useState(false);
  const [canal, setCanal] = useState<"Asaas" | "PIX C6">("Asaas");
  const integrarAsaas = canal === "Asaas";
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await criarVendaRecorrencia(formData);
      if ("error" in result) {
        setError(result.error ?? "Erro desconhecido.");
      } else {
        const partes = ["Cliente cadastrado."];
        if (result.asaasCustomerId) partes.push(`Cliente Asaas: ${result.asaasCustomerId}`);
        if (result.asaasSubscriptionId) partes.push(`Assinatura Asaas: ${result.asaasSubscriptionId}`);
        setSucesso(partes.join(" "));
        setTimeout(onSucesso, 2200);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <button type="button" onClick={onVoltar} className="text-xs text-accent-ink hover:underline self-start">
        ← trocar tipo de venda
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome do cliente"><input name="nome" required className="input" /></Field>
        <Field label="Dono(s)"><input name="dono" className="input" /></Field>
        <Field label="Nicho"><input name="nicho" required className="input" /></Field>
        <Field label="Status">
          <select name="status" className="input" defaultValue="Onboarding urgente">
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Data de fechamento"><input name="fechamento" type="date" required className="input" /></Field>
        <Field label="Valor da recorrência (R$)">
          <input name="valorRecorrencia" type="number" step="0.01" min="0" required className="input" />
        </Field>
        <Field label="Faturamento do cliente na entrada (opcional)">
          <input name="entrada" type="number" step="0.01" min="0" className="input" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          name="primeiroMesGratis"
          checked={primeiroMesGratis}
          onChange={(e) => setPrimeiroMesGratis(e.target.checked)}
        />
        1º mês grátis (ex: veio de uma consultoria) — recebe só depois
      </label>
      {primeiroMesGratis && (
        <Field label="Data do 1º pagamento da recorrência">
          <input name="dataPrimeiroPagamento" type="date" required className="input" />
        </Field>
      )}

      <label className="flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          name="jaRecebeuAVista"
          checked={jaRecebeuAVista}
          onChange={(e) => setJaRecebeuAVista(e.target.checked)}
        />
        Já recebi um 1º pagamento à vista (ex: PIX na hora do fechamento, antes da recorrência começar)
      </label>
      {jaRecebeuAVista && (
        <div className="grid grid-cols-3 gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <Field label="Valor recebido (R$)">
            <input name="valorAVista" type="number" step="0.01" min="0" required className="input" />
          </Field>
          <Field label="Canal">
            <select name="canalAVista" className="input" defaultValue="PIX C6">
              <option value="PIX C6">PIX C6</option>
              <option value="Asaas">Asaas</option>
            </select>
          </Field>
          <Field label="Data do recebimento">
            <input name="dataAVista" type="date" className="input" />
          </Field>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <Field label="Canal de cobrança da recorrência">
          <select name="canal" className="input" value={canal} onChange={(e) => setCanal(e.target.value as "Asaas" | "PIX C6")}>
            <option value="Asaas">Asaas — gera assinatura automática</option>
            <option value="PIX C6">PIX C6 — cobrança manual, fora do Asaas</option>
          </select>
        </Field>
      </div>

      {integrarAsaas && (
        <div className="flex flex-col gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <CamposAsaasSemNicho />
          {!primeiroMesGratis && (
            <Field label="Data do 1º pagamento (vencimento no Asaas)">
              <input name="dataPrimeiroPagamento" type="date" required className="input" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Juros ao mês (%)"><input name="juros" type="number" step="0.1" defaultValue={1} className="input" /></Field>
            <Field label="Multa (%)"><input name="multa" type="number" step="0.1" defaultValue={2} className="input" /></Field>
          </div>
        </div>
      )}

      {error && <p className="text-critical text-sm">{error}</p>}
      {sucesso && <p className="text-good text-sm">{sucesso}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onVoltar} className="btn">voltar</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "salvando..." : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}

function CamposAsaasSemNicho() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="CPF ou CNPJ"><input name="cpfCnpj" required className="input" /></Field>
      <Field label="Email"><input name="email" type="email" className="input" /></Field>
      <Field label="Telefone"><input name="telefone" className="input" /></Field>
      <CamposEndereco />
    </div>
  );
}

function FormConsultoria({ onVoltar, onSucesso }: { onVoltar: () => void; onSucesso: () => void }) {
  const [vendeuRecorrencia, setVendeuRecorrencia] = useState(false);
  const [canalRecorrencia, setCanalRecorrencia] = useState<"Asaas" | "PIX C6">("Asaas");
  const [primeiroMesGratis, setPrimeiroMesGratis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await lancarConsultoria(formData);
      if ("error" in result) {
        setError(result.error ?? "Erro desconhecido.");
      } else {
        const partes = ["Consultoria lançada."];
        if (result.asaasCustomerId) partes.push(`Cliente Asaas: ${result.asaasCustomerId}`);
        if (result.asaasSubscriptionId) partes.push(`Assinatura Asaas: ${result.asaasSubscriptionId}`);
        setSucesso(partes.join(" "));
        setTimeout(onSucesso, 2200);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <button type="button" onClick={onVoltar} className="text-xs text-accent-ink hover:underline self-start">
        ← trocar tipo de venda
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor da consultoria (R$)">
          <input name="valorConsultoria" type="number" step="0.01" min="0" required className="input" />
        </Field>
        <Field label="Canal de recebimento">
          <select name="canal" className="input" defaultValue="PIX C6">
            <option value="Asaas">Asaas</option>
            <option value="PIX C6">PIX C6</option>
          </select>
        </Field>
        <Field label="Data da reunião de fechamento">
          <input name="dataFechamento" type="date" required className="input" />
        </Field>
        <Field label="Nome do cliente"><input name="nomeCliente" required className="input" /></Field>
        <Field label="Email do cliente">
          <input name="email" type="email" required className="input" />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5 bg-paper-2 border border-dashed border-line rounded-md p-3">
        <span className="text-xs uppercase tracking-wide text-muted font-semibold">
          Onboarding — cria essas 8 etapas automaticamente
        </span>
        <p className="text-xs text-ink-2 leading-relaxed">
          {CONSULTORIA_TAREFAS_PADRAO.join(" · ")}
        </p>
        <p className="text-[11px] text-muted">
          A 1ª reunião fica pendente pra você agendar direto com o cliente; as demais
          já entram com data — tudo ajustável depois em{" "}
          <span className="font-semibold">Consultoria</span>.
        </p>
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
        <div className="flex flex-col gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <Field label="Canal de cobrança da recorrência">
            <select
              name="canalRecorrencia"
              className="input"
              value={canalRecorrencia}
              onChange={(e) => setCanalRecorrencia(e.target.value as "Asaas" | "PIX C6")}
            >
              <option value="Asaas">Asaas — gera assinatura automática</option>
              <option value="PIX C6">PIX C6 — cobrança manual, fora do Asaas</option>
            </select>
          </Field>

          {canalRecorrencia === "Asaas" ? (
            <CamposAsaas />
          ) : (
            <Field label="Nicho"><input name="nicho" required className="input" /></Field>
          )}

          {canalRecorrencia === "Asaas" && (
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <input type="checkbox" name="emiteNota" defaultChecked />
              Vai emitir nota fiscal (confirme sempre — é automático no Asaas ao confirmar pagamento)
            </label>
          )}

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

          {canalRecorrencia === "Asaas" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Juros ao mês (%)"><input name="juros" type="number" step="0.1" defaultValue={1} className="input" /></Field>
              <Field label="Multa (%)"><input name="multa" type="number" step="0.1" defaultValue={2} className="input" /></Field>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-critical text-sm">{error}</p>}
      {sucesso && <p className="text-good text-sm">{sucesso}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onVoltar} className="btn">voltar</button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "salvando..." : "Lançar consultoria"}
        </button>
      </div>
    </form>
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

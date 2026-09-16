"use client";

import { useState, useTransition } from "react";
import { lancarVenda } from "@/actions/vendas";
import { STATUS_LIST, CONSULTORIA_TAREFAS_PADRAO, CONSULTORIA_TAREFAS_ONBOARDING } from "@/lib/types";

export function NovaVendaButton() {
  const [open, setOpen] = useState(false);

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
              <button onClick={() => setOpen(false)} className="text-muted hover:text-critical text-xl leading-none">
                ×
              </button>
            </div>
            <FormVenda onSucesso={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function CamposAsaasSemNicho() {
  return (
    <div className="grid grid-cols-2 gap-3">
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

// Bloco de reuniões, compartilhado pelos 3 produtos — "padrão" muda de
// texto conforme o que foi marcado (8 etapas do método se tem
// Consultoria, só "Onboarding" se não), "manual" libera uma lista de
// títulos digitados (mesmo número de reuniões da cadência automática),
// "nenhuma" não cria reunião nenhuma (mas o cliente pontual ainda é
// criado, pra acompanhar o status).
function BlocoReunioes({ temConsultoria }: { temConsultoria: boolean }) {
  const [modo, setModo] = useState<"padrao" | "manual" | "nenhuma">("padrao");
  const [titulos, setTitulos] = useState<string[]>(["", ""]);
  const presetPadrao = temConsultoria ? CONSULTORIA_TAREFAS_PADRAO : CONSULTORIA_TAREFAS_ONBOARDING;

  return (
    <div className="flex flex-col gap-2 bg-paper-2 border border-dashed border-line rounded-md p-3">
      <span className="text-xs uppercase tracking-wide text-muted font-semibold">Reuniões</span>
      <div className="flex gap-4 text-sm">
        {(["padrao", "manual", "nenhuma"] as const).map((opcao) => (
          <label key={opcao} className="flex items-center gap-1.5">
            <input type="radio" name="modoReunioes" value={opcao} checked={modo === opcao} onChange={() => setModo(opcao)} />
            {opcao === "padrao" ? "Padrão" : opcao === "manual" ? "Manual" : "Nenhuma"}
          </label>
        ))}
      </div>

      {modo === "padrao" && (
        <p className="text-xs text-ink-2 leading-relaxed">
          {presetPadrao.join(" · ")}
          {temConsultoria && (
            <span className="block text-[11px] text-muted mt-1">
              A 1ª reunião fica pendente pra agendar direto com o cliente; as demais já entram com data — tudo
              ajustável depois em Consultoria.
            </span>
          )}
        </p>
      )}

      {modo === "manual" && (
        <div className="flex flex-col gap-2">
          {titulos.map((titulo, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                name="reuniaoTitulo"
                value={titulo}
                onChange={(e) => setTitulos((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={`Tema da reunião ${i + 1}`}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setTitulos((prev) => prev.filter((_, j) => j !== i))}
                className="btn text-xs px-2.5"
                aria-label="remover reunião"
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setTitulos((prev) => [...prev, ""])} className="text-xs text-accent-ink hover:underline self-start">
            + adicionar reunião
          </button>
          <p className="text-[11px] text-muted">A 1ª fica pendente de agendamento manual, as demais entram na cadência automática.</p>
        </div>
      )}
    </div>
  );
}

function FormVenda({ onSucesso }: { onSucesso: () => void }) {
  const [vendeuConsultoria, setVendeuConsultoria] = useState(false);
  const [vendeuRecorrencia, setVendeuRecorrencia] = useState(false);
  const [vendeuCurso, setVendeuCurso] = useState(false);
  const [canalRecorrencia, setCanalRecorrencia] = useState<"Asaas" | "PIX C6">("Asaas");
  const [primeiroMesGratis, setPrimeiroMesGratis] = useState(false);
  const [jaRecebeuAVista, setJaRecebeuAVista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const temAlgumProduto = vendeuConsultoria || vendeuRecorrencia || vendeuCurso;
  const integrarAsaas = vendeuRecorrencia && canalRecorrencia === "Asaas";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await lancarVenda(formData);
      if ("error" in result) {
        setError(result.error ?? "Erro desconhecido.");
      } else {
        const partes = ["Venda lançada."];
        if (result.asaasCustomerId) partes.push(`Cliente Asaas: ${result.asaasCustomerId}`);
        if (result.asaasSubscriptionId) partes.push(`Assinatura Asaas: ${result.asaasSubscriptionId}`);
        setSucesso(partes.join(" "));
        setTimeout(onSucesso, 2200);
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome do cliente"><input name="nomeCliente" required className="input" /></Field>
        <Field label="Email do cliente"><input name="email" type="email" className="input" /></Field>
        <Field label="Data de fechamento"><input name="dataFechamento" type="date" required className="input" /></Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted font-semibold">Produtos (marque um ou mais)</span>
        <div className="grid grid-cols-3 gap-3">
          <CheckboxProduto name="vendeuConsultoria" label="Consultoria" desc="Mentoria pontual" checked={vendeuConsultoria} onChange={setVendeuConsultoria} />
          <CheckboxProduto name="vendeuRecorrencia" label="Recorrência" desc="Mensalidade Aceleração" checked={vendeuRecorrencia} onChange={setVendeuRecorrencia} />
          <CheckboxProduto name="vendeuCurso" label="Curso" desc="Ticket próprio, pode incluir reuniões" checked={vendeuCurso} onChange={setVendeuCurso} />
        </div>
      </div>

      {vendeuConsultoria && (
        <div className="grid grid-cols-2 gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <Field label="Valor da consultoria (R$)">
            <input name="valorConsultoria" type="number" step="0.01" min="0" required className="input" />
          </Field>
          <Field label="Canal de recebimento">
            <select name="canalConsultoria" className="input" defaultValue="PIX C6">
              <option value="Asaas">Asaas</option>
              <option value="PIX C6">PIX C6</option>
              <option value="Hubla">Hubla</option>
            </select>
          </Field>
        </div>
      )}

      {vendeuCurso && (
        <div className="grid grid-cols-2 gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <Field label="Valor do curso (R$)">
            <input name="valorCurso" type="number" step="0.01" min="0" required className="input" />
          </Field>
          <Field label="Canal de recebimento">
            <select name="canalCurso" className="input" defaultValue="Hubla">
              <option value="Hubla">Hubla</option>
              <option value="Asaas">Asaas</option>
              <option value="PIX C6">PIX C6</option>
            </select>
          </Field>
        </div>
      )}

      {vendeuRecorrencia && (
        <div className="flex flex-col gap-3 bg-paper-2 border border-dashed border-line rounded-md p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dono(s)"><input name="dono" className="input" /></Field>
            <Field label="Nicho"><input name="nicho" required className="input" /></Field>
            <Field label="Status">
              <select name="status" className="input" defaultValue="Onboarding urgente">
                {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Valor da recorrência (R$)">
              <input name="valorRecorrencia" type="number" step="0.01" min="0" required className="input" />
            </Field>
            <Field label="Faturamento do cliente na entrada (opcional)">
              <input name="entrada" type="number" step="0.01" min="0" className="input" />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" name="primeiroMesGratis" checked={primeiroMesGratis} onChange={(e) => setPrimeiroMesGratis(e.target.checked)} />
            1º mês grátis (ex: veio de uma consultoria) — recebe só depois
          </label>
          {primeiroMesGratis && (
            <Field label="Data do 1º pagamento da recorrência">
              <input name="dataPrimeiroPagamento" type="date" required className="input" />
            </Field>
          )}

          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" name="jaRecebeuAVista" checked={jaRecebeuAVista} onChange={(e) => setJaRecebeuAVista(e.target.checked)} />
            Já recebi um 1º pagamento à vista (ex: PIX na hora do fechamento)
          </label>
          {jaRecebeuAVista && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Valor recebido (R$)">
                <input name="valorAVista" type="number" step="0.01" min="0" required className="input" />
              </Field>
              <Field label="Canal">
                <select name="canalAVista" className="input" defaultValue="PIX C6">
                  <option value="PIX C6">PIX C6</option>
                  <option value="Asaas">Asaas</option>
                  <option value="Hubla">Hubla</option>
                </select>
              </Field>
              <Field label="Data do recebimento">
                <input name="dataAVista" type="date" className="input" />
              </Field>
            </div>
          )}

          <Field label="Canal de cobrança da recorrência">
            <select name="canalRecorrencia" className="input" value={canalRecorrencia} onChange={(e) => setCanalRecorrencia(e.target.value as "Asaas" | "PIX C6")}>
              <option value="Asaas">Asaas — gera assinatura automática</option>
              <option value="PIX C6">PIX C6 — cobrança manual, fora do Asaas</option>
            </select>
          </Field>

          {integrarAsaas && (
            <>
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
            </>
          )}
        </div>
      )}

      {temAlgumProduto && <BlocoReunioes temConsultoria={vendeuConsultoria} />}

      {error && <p className="text-critical text-sm">{error}</p>}
      {sucesso && <p className="text-good text-sm">{sucesso}</p>}

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending || !temAlgumProduto} className="btn-primary">
          {pending ? "salvando..." : "Lançar venda"}
        </button>
      </div>
    </form>
  );
}

function CheckboxProduto({
  name,
  label,
  desc,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="border rounded-lg p-3 flex flex-col gap-0.5 cursor-pointer transition-colors"
      style={{ borderColor: checked ? "var(--accent)" : "var(--line)", background: checked ? "var(--accent-wash)" : "var(--paper-2)" }}
    >
      <span className="flex items-center gap-2 font-display font-bold text-[15px]">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </span>
      <span className="text-[11px] text-ink-2">{desc}</span>
    </label>
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

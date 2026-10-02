import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CATEGORIES,
  entryStatus,
  formatBRL,
  formatDateShort,
  loadEntries,
  monthKey,
  monthLabel,
  saveEntries,
  type Entry,
  type EntryType,
} from "@/lib/ledger";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lança — Contas a pagar e a receber" },
      {
        name: "description",
        content: "Controle suas contas a pagar e a receber num livro-caixa simples: vencimentos, status e saldo previsto do mês.",
      },
      { property: "og:title", content: "Lança — Contas a pagar e a receber" },
      {
        property: "og:description",
        content: "Livro-caixa simples para contas a pagar e a receber, com saldo previsto do mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type StatusFilter = "todos" | "pendente" | "vencido" | "pago";

function shiftMonth(key: string, delta: number) {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function Index() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<EntryType>("pagar");
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [status, setStatus] = useState<StatusFilter>("todos");

  useEffect(() => {
    setEntries(loadEntries());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveEntries(entries);
  }, [entries, ready]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.dueDate.startsWith(month)),
    [entries, month],
  );

  const totals = useMemo(() => {
    const open = monthEntries.filter((e) => !e.paid);
    const receber = open.filter((e) => e.type === "receber");
    const pagar = open.filter((e) => e.type === "pagar");
    const sum = (l: Entry[]) => l.reduce((a, e) => a + e.amount, 0);
    const overdue = entries.filter((e) => entryStatus(e) === "vencido");
    return {
      receber: sum(receber),
      receberN: receber.length,
      pagar: sum(pagar),
      pagarN: pagar.length,
      saldo: sum(receber) - sum(pagar),
      vencido: sum(overdue),
      vencidoN: overdue.length,
    };
  }, [monthEntries, entries]);

  const rows = useMemo(
    () =>
      monthEntries
        .filter((e) => e.type === tab)
        .filter((e) => status === "todos" || entryStatus(e) === status)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [monthEntries, tab, status],
  );

  const overdueRows = useMemo(
    () => entries.filter((e) => e.type === tab && entryStatus(e) === "vencido" && !e.dueDate.startsWith(month)),
    [entries, tab, month],
  );

  const togglePaid = (id: string) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)));
  const remove = (id: string) => setEntries((list) => list.filter((e) => e.id !== id));
  const add = (entry: Entry) => {
    setEntries((list) => [...list, entry]);
    setMonth(entry.dueDate.slice(0, 7));
    setTab(entry.type);
  };

  const [y = 0, m = 1] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthName = (monthLabel(month).split(" ")[0] ?? "").toLowerCase();

  return (
    <div className="min-h-screen bg-paper font-display text-[15px] text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="inline-block h-3.5 w-3.5 bg-ink" />
            <span className="text-lg font-extrabold tracking-tight">Lança</span>
            <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50 sm:inline">livro-caixa</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-2 py-1 hover:bg-ink/5" aria-label="Mês anterior">←</button>
            <span className="min-w-[130px] text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-2 py-1 hover:bg-ink/5" aria-label="Próximo mês">→</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-6">
        <section className="flex flex-wrap items-end justify-between gap-8 border-b border-line pb-8 pt-10">
          <div className="max-w-[46ch]">
            <h1 key={month} className="animate-clipin text-balance text-[44px] font-extrabold leading-[0.92] tracking-tight sm:text-[52px]">
              Contas de
              <br />
              {monthName}
            </h1>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
              a receber {totals.receberN} · a pagar {totals.pagarN} · saldo previsto
            </p>
          </div>
          <a href="#novo" className="shrink-0 bg-ink px-5 py-2.5 text-[13px] font-semibold tracking-tight text-paper transition-colors hover:bg-ink/85">
            + Novo lançamento
          </a>
        </section>

        <section className="grid grid-cols-2 gap-px border-x border-b border-line bg-line lg:grid-cols-4">
          <Kpi label="a receber" value={formatBRL(totals.receber)} sub={`${totals.receberN} em aberto`} delay={60} />
          <Kpi label="a pagar" value={formatBRL(totals.pagar)} sub={`${totals.pagarN} em aberto`} delay={120} dark />
          <Kpi label="saldo previsto" value={(totals.saldo >= 0 ? "+" : "") + formatBRL(totals.saldo)} sub={`até ${String(lastDay).padStart(2, "0")}/${String(m).padStart(2, "0")}`} delay={180} />
          <Kpi label="vencido" value={formatBRL(totals.vencido)} sub={`${totals.vencidoN} ${totals.vencidoN === 1 ? "conta" : "contas"}`} delay={240} />
        </section>

        <section className="py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Segmented
              value={tab}
              onChange={(v) => setTab(v as EntryType)}
              options={[
                { value: "pagar", label: "A pagar" },
                { value: "receber", label: "A receber" },
              ]}
            />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink/50">status</span>
              {(["todos", "pendente", "vencido", "pago"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`border border-line px-3 py-1.5 text-[13px] font-medium capitalize ${status === s ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-line">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1fr_120px_80px_120px_110px_150px] items-center gap-4 bg-ink px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper">
                <span>Descrição</span>
                <span className="text-right">Valor</span>
                <span className="text-center">Venc.</span>
                <span>Categoria</span>
                <span className="text-right">Status</span>
                <span className="text-right">Ação</span>
              </div>
              {rows.length === 0 && (
                <div className="border-t border-line px-5 py-10 text-center font-mono text-[12px] uppercase tracking-wider text-ink/50">
                  Nenhum lançamento neste filtro
                </div>
              )}
              {rows.map((e, i) => (
                <Row key={e.id} entry={e} index={i} onToggle={togglePaid} onRemove={remove} />
              ))}
            </div>
          </div>

          {overdueRows.length > 0 && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink/60">
              + {overdueRows.length} {overdueRows.length === 1 ? "conta vencida" : "contas vencidas"} de meses anteriores ·{" "}
              <button className="underline" onClick={() => overdueRows[0] && setMonth(overdueRows[0].dueDate.slice(0, 7))}>ver</button>
            </p>
          )}
        </section>

        <section id="novo" className="mb-16 mt-2 grid gap-px border border-line bg-line lg:grid-cols-[1fr_360px]">
          <NewEntryForm onAdd={add} defaultType={tab} />
          <div className="bg-ink p-6 text-paper">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/60">Fechamento do mês</h2>
            <div className="mt-5 flex items-end justify-between border-b border-paper/20 pb-4">
              <span className="text-[13px]">A receber</span>
              <span className="font-mono text-[18px] font-bold tabular-nums">{formatBRL(totals.receber)}</span>
            </div>
            <div className="mt-4 flex items-end justify-between border-b border-paper/20 pb-4">
              <span className="text-[13px]">A pagar</span>
              <span className="font-mono text-[18px] font-bold tabular-nums">{formatBRL(totals.pagar)}</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-[13px] font-semibold">Saldo previsto</span>
              <span className="font-mono text-[22px] font-bold tabular-nums">
                {(totals.saldo >= 0 ? "+" : "") + formatBRL(totals.saldo)}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, delay, dark }: { label: string; value: string; sub: string; delay: number; dark?: boolean }) {
  return (
    <div className={`animate-rise p-5 ${dark ? "bg-ink text-paper" : "bg-paper"}`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`font-mono text-[10px] uppercase tracking-[0.16em] ${dark ? "text-paper/60" : "text-ink/50"}`}>{label}</div>
      <div className="mt-3 font-mono text-[22px] font-bold tabular-nums tracking-tight sm:text-[26px]">{value}</div>
      <div className={`mt-2 font-mono text-[11px] ${dark ? "text-paper/60" : "text-ink/50"}`}>{sub}</div>
    </div>
  );
}

function Segmented({ value, onChange, options, small }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; small?: boolean }) {
  return (
    <div className="inline-flex border border-line">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`${small ? "px-4 py-1.5 text-[12px]" : "px-5 py-2 text-[13px]"} font-semibold ${value === o.value ? "bg-ink text-paper" : "text-ink/60 hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ entry, index, onToggle, onRemove }: { entry: Entry; index: number; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const st = entryStatus(entry);
  const label = st === "pago" ? (entry.type === "receber" ? "Recebido" : "Pago") : st === "vencido" ? "Vencido" : "Pendente";
  return (
    <div
      className={`grid animate-rise grid-cols-[1fr_120px_80px_120px_110px_150px] items-center gap-4 border-t border-line px-5 py-3.5 transition-colors hover:bg-ink/5 ${st === "pago" ? "text-ink/50" : ""}`}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <span className={`font-medium ${st === "pago" ? "line-through" : ""}`}>{entry.description}</span>
      <span className="text-right font-mono font-semibold tabular-nums">{formatBRL(entry.amount)}</span>
      <span className="text-center font-mono text-[12px]">{formatDateShort(entry.dueDate)}</span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink/60">{entry.category}</span>
      <span className="justify-self-end">
        {st === "vencido" ? (
          <span className="inline-flex items-center bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-paper">{label}</span>
        ) : (
          <span className="inline-flex items-center gap-2 border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide">
            <span className={`inline-block h-2 w-2 ${st === "pago" ? "border border-line" : "bg-ink"}`} />
            {label}
          </span>
        )}
      </span>
      <span className="flex items-center justify-end gap-2">
        <button onClick={() => onToggle(entry.id)} className="border border-line px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-ink hover:text-paper">
          {entry.paid ? "Desfazer" : entry.type === "receber" ? "Receber" : "Pagar"}
        </button>
        <button onClick={() => onRemove(entry.id)} className="px-1.5 py-1 font-mono text-[13px] text-ink/40 hover:text-ink" aria-label="Excluir">
          ×
        </button>
      </span>
    </div>
  );
}

function NewEntryForm({ onAdd, defaultType }: { onAdd: (e: Entry) => void; defaultType: EntryType }) {
  const [type, setType] = useState<EntryType>(defaultType);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [error, setError] = useState("");

  useEffect(() => setType(defaultType), [defaultType]);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(/\./g, "").replace(",", ".")) * 100);
    if (!description.trim()) return setError("Informe a descrição.");
    if (!cents || cents <= 0) return setError("Informe um valor válido.");
    if (!dueDate) return setError("Informe o vencimento.");
    onAdd({
      id: crypto.randomUUID(),
      description: description.trim().slice(0, 120),
      amount: cents,
      dueDate,
      category,
      type,
      paid: false,
    });
    setDescription("");
    setAmount("");
    setError("");
  };

  const field = "border border-line bg-transparent px-3 py-2 text-[13px] outline-none focus:bg-ink/5";
  const lbl = "font-mono text-[10px] uppercase tracking-wide text-ink/50";

  return (
    <form onSubmit={submit} className="bg-paper p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Novo lançamento</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Descrição</span>
          <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Aluguel — galpão" maxLength={120} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Valor (R$)</span>
          <input className={`${field} font-mono tabular-nums`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2.800,00" inputMode="decimal" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Vencimento</span>
          <input type="date" className={`${field} font-mono tabular-nums`} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Categoria</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Segmented
          small
          value={type}
          onChange={(v) => setType(v as EntryType)}
          options={[
            { value: "pagar", label: "Pagar" },
            { value: "receber", label: "Receber" },
          ]}
        />
        {error && <span className="font-mono text-[11px] uppercase tracking-wide">{error}</span>}
        <button type="submit" className="ml-auto bg-ink px-5 py-2 text-[13px] font-semibold text-paper transition-colors hover:bg-ink/85">
          Salvar
        </button>
      </div>
    </form>
  );
}

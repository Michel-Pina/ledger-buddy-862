export type EntryType = "pagar" | "receber";

export interface Entry {
  id: string;
  description: string;
  category: string;
  /** ISO date string yyyy-mm-dd */
  dueDate: string;
  /** value in cents */
  amount: number;
  type: EntryType;
  paid: boolean;
}

export const CATEGORIES = [
  "Imobiliário",
  "Utilidades",
  "Insumos",
  "Serviços",
  "Receita",
  "Pessoal",
  "Impostos",
  "Outros",
] as const;

const STORAGE_KEY = "lanca-ledger-v1";

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function seed(): Entry[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  return [
    { id: "s1", description: "Aluguel — escritório", category: "Imobiliário", dueDate: iso(y, m, 5), amount: 450000, type: "pagar", paid: false },
    { id: "s2", description: "Fornecedor — papelaria central", category: "Insumos", dueDate: iso(prevY, prevM, 18), amount: 145000, type: "pagar", paid: false },
    { id: "s3", description: "Energia elétrica — concessionária", category: "Utilidades", dueDate: iso(y, m, 10), amount: 89000, type: "pagar", paid: false },
    { id: "s4", description: "Água — saneamento municipal", category: "Utilidades", dueDate: iso(y, m, 12), amount: 32000, type: "pagar", paid: false },
    { id: "s5", description: "Internet — fibra", category: "Utilidades", dueDate: iso(y, m, 1), amount: 12000, type: "pagar", paid: true },
    { id: "s6", description: "Contador — assessoria fiscal", category: "Serviços", dueDate: iso(y, m, 20), amount: 118000, type: "pagar", paid: false },
    { id: "s7", description: "Cliente — Studio Maré", category: "Receita", dueDate: iso(y, m, 10), amount: 650000, type: "receber", paid: false },
    { id: "s8", description: "Cliente — Café Lavoura", category: "Receita", dueDate: iso(y, m, 3), amount: 235000, type: "receber", paid: true },
    { id: "s9", description: "Cliente — Almex Distribuidora", category: "Receita", dueDate: iso(y, m, 14), amount: 1840000, type: "receber", paid: false },
    { id: "s10", description: "Cliente — Têxtil Litoral", category: "Receita", dueDate: iso(prevY, prevM, 25), amount: 1275000, type: "receber", paid: false },
    { id: "s11", description: "Mensalidade — manutenção site", category: "Receita", dueDate: iso(y, m, 22), amount: 62000, type: "receber", paid: false },
  ];
}

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Entry[];
  } catch {
    /* ignore */
  }
  const seeded = seed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    /* ignore */
  }
  return seeded;
}

export function saveEntries(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDateShort(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function entryStatus(entry: Entry): "pago" | "pendente" | "vencido" {
  if (entry.paid) return "pago";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(entry.dueDate + "T00:00:00");
  return due < today ? "vencido" : "pendente";
}

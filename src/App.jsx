import { useState, useMemo, useRef } from "react";

const DEFAULT_CATEGORIES = [
  { id: "housing", label: "Housing", icon: "🏠", color: "#6366f1" },
  { id: "food", label: "Food", icon: "🍽️", color: "#f59e0b" },
  { id: "transport", label: "Transport", icon: "🚗", color: "#10b981" },
  { id: "health", label: "Health", icon: "💊", color: "#ef4444" },
  { id: "entertainment", label: "Fun", icon: "🎬", color: "#8b5cf6" },
  { id: "savings", label: "Savings", icon: "💰", color: "#06b6d4" },
  { id: "other", label: "Other", icon: "📦", color: "#6b7280" },
];

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f43f5e","#84cc16","#fb923c","#a78bfa","#34d399","#60a5fa"];
const ICONS = ["🏠","🍽️","🚗","💊","🎬","💰","📦","✈️","👕","🐾","📚","🎮","💼","🏋️","☕","🛒","💡","🎁","🍺","💻"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const CHASE_CAT_MAP = {
  "food & drink": "food", "groceries": "food", "restaurants": "food",
  "gas": "transport", "automotive": "transport", "travel": "transport",
  "health & wellness": "health", "medical": "health",
  "entertainment": "entertainment",
  "bills & utilities": "housing", "home": "housing", "rent": "housing",
  "transfer": "savings",
  "shopping": "other", "personal": "other", "education": "other",
  "fees & adjustments": "other", "gifts & donations": "other", "professional services": "other",
};

function guessCategory(chaseCategory, description, categories) {
  const lower = (chaseCategory || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  const ids = categories.map(c => c.id);
  const has = (id) => ids.includes(id);
  for (const [key, val] of Object.entries(CHASE_CAT_MAP)) {
    if (lower.includes(key) && has(val)) return val;
  }
  if ((desc.includes("rent") || desc.includes("mortgage")) && has("housing")) return "housing";
  if ((desc.includes("grocer") || desc.includes("whole foods") || desc.includes("trader joe")) && has("food")) return "food";
  if ((desc.includes("uber") || desc.includes("lyft") || desc.includes("gas") || desc.includes("shell")) && has("transport")) return "transport";
  if ((desc.includes("netflix") || desc.includes("spotify") || desc.includes("hulu")) && has("entertainment")) return "entertainment";
  if ((desc.includes("gym") || desc.includes("pharmacy") || desc.includes("cvs")) && has("health")) return "health";
  return categories[categories.length - 1]?.id || "other";
}

function parseChaseCSV(text, categories) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) || lines[i].split(",");
    const clean = (s) => (s || "").replace(/^"|"$/g, "").trim();
    const txDate = clean(cols[0]);
    const description = clean(cols[2]);
    const chaseCategory = clean(cols[3]);
    const amountRaw = parseFloat(clean(cols[5]));
    if (isNaN(amountRaw) || amountRaw >= 0) continue;
    const amount = Math.abs(amountRaw);
    const date = new Date(txDate);
    if (isNaN(date.getTime())) continue;
    results.push({
      id: Date.now() + i,
      desc: description,
      amount,
      category: guessCategory(chaseCategory, description, categories),
      month: date.getMonth(),
      date: txDate,
      source: "chase",
    });
  }
  return results;
}

const initialBudgets = { housing: 1500, food: 500, transport: 300, health: 200, entertainment: 200, savings: 400, other: 150 };

export default function BudgetTool() {
  const today = new Date();
  const [activeMonth, setActiveMonth] = useState(today.getMonth());
  const [income, setIncome] = useState(4000);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [transactions, setTransactions] = useState([
    { id: 1, desc: "Rent", amount: 1400, category: "housing", month: today.getMonth() },
    { id: 2, desc: "Groceries", amount: 180, category: "food", month: today.getMonth() },
    { id: 3, desc: "Netflix", amount: 15, category: "entertainment", month: today.getMonth() },
    { id: 4, desc: "Gas", amount: 60, category: "transport", month: today.getMonth() },
    { id: 5, desc: "Gym", amount: 45, category: "health", month: today.getMonth() },
  ]);
  const [newTx, setNewTx] = useState({ desc: "", amount: "", category: "food" });
  const [editingBudget, setEditingBudget] = useState(null);
  const [view, setView] = useState("dashboard");
  const [importState, setImportState] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef();

  // Category management state
  const [editingCat, setEditingCat] = useState(null); // {id, label, icon, color} or "new"
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);

  const monthTx = useMemo(() => transactions.filter((t) => t.month === activeMonth), [transactions, activeMonth]);
  const spentByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = 0));
    monthTx.forEach((t) => (map[t.category] = (map[t.category] || 0) + t.amount));
    return map;
  }, [monthTx, categories]);

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const remaining = income - totalSpent;

  const addTransaction = () => {
    if (!newTx.desc || !newTx.amount) return;
    setTransactions((prev) => [...prev, { id: Date.now(), desc: newTx.desc, amount: parseFloat(newTx.amount), category: newTx.category, month: activeMonth }]);
    setNewTx({ desc: "", amount: "", category: categories[0]?.id || "other" });
  };
  const deleteTx = (id) => setTransactions((prev) => prev.filter((t) => t.id !== id));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseChaseCSV(ev.target.result, categories);
      if (rows.length === 0) { setImportMsg({ type: "error", text: "No transactions found. Make sure it's a Chase CSV export." }); return; }
      setImportState({ pending: rows.map((r) => ({ ...r, _include: true })) });
      setView("import");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    const toAdd = importState.pending.filter((r) => r._include);
    setTransactions((prev) => [...prev, ...toAdd]);
    setImportMsg({ type: "success", text: `✅ Imported ${toAdd.length} transactions from Chase.` });
    setImportState(null);
    setView("transactions");
  };

  // Category CRUD
  const saveCat = (cat) => {
    if (cat.id === "__new__") {
      const newId = "cat_" + Date.now();
      setCategories((prev) => [...prev, { id: newId, label: cat.label, icon: cat.icon, color: cat.color }]);
      setBudgets((prev) => ({ ...prev, [newId]: 0 }));
    } else {
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, label: cat.label, icon: cat.icon, color: cat.color } : c));
    }
    setEditingCat(null);
  };

  const deleteCat = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setBudgets((prev) => { const b = { ...prev }; delete b[id]; return b; });
    // Reassign transactions to last remaining category
    const fallback = categories.find(c => c.id !== id)?.id || "other";
    setTransactions((prev) => prev.map((t) => t.category === id ? { ...t, category: fallback } : t));
    setConfirmDeleteCat(null);
  };

  const cat = (id) => categories.find((c) => c.id === id) || categories[categories.length - 1] || DEFAULT_CATEGORIES[6];
  const inp = { padding: "9px 13px", background: "#0f0f13", border: "1px solid #2a2a3e", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" };

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#0f0f13", minHeight: "100vh", color: "#e8e8f0" }}>

      {/* Category Edit Modal */}
      {editingCat && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, border: "1px solid #2a2a3e" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editingCat.id === "__new__" ? "Add Category" : "Edit Category"}</div>

            {/* Label */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>NAME</div>
              <input value={editingCat.label} onChange={(e) => setEditingCat({ ...editingCat, label: e.target.value })} style={{ ...inp, width: "100%" }} placeholder="Category name" />
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>ICON</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ICONS.map((icon) => (
                  <button key={icon} onClick={() => setEditingCat({ ...editingCat, icon })} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${editingCat.icon === icon ? "#6366f1" : "#2a2a3e"}`, background: editingCat.icon === icon ? "#6366f120" : "#0f0f13", fontSize: 18, cursor: "pointer" }}>{icon}</button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>COLOR</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {COLORS.map((color) => (
                  <button key={color} onClick={() => setEditingCat({ ...editingCat, color })} style={{ width: 28, height: 28, borderRadius: "50%", background: color, border: `3px solid ${editingCat.color === color ? "#fff" : "transparent"}`, cursor: "pointer" }} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => saveCat(editingCat)} disabled={!editingCat.label.trim()} style={{ flex: 1, padding: "11px", background: editingCat.label.trim() ? "#6366f1" : "#2a2a3e", border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {editingCat.id === "__new__" ? "Add Category" : "Save Changes"}
              </button>
              <button onClick={() => setEditingCat(null)} style={{ padding: "11px 16px", background: "#0f0f13", border: "1px solid #2a2a3e", borderRadius: 9, color: "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteCat && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 24, width: "100%", maxWidth: 320, border: "1px solid #2a2a3e" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Delete Category?</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
              All transactions in <strong style={{ color: "#e8e8f0" }}>{cat(confirmDeleteCat).icon} {cat(confirmDeleteCat).label}</strong> will be moved to <strong style={{ color: "#e8e8f0" }}>{categories.find(c => c.id !== confirmDeleteCat)?.label}</strong>.
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => deleteCat(confirmDeleteCat)} style={{ flex: 1, padding: "11px", background: "#ef4444", border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Delete</button>
              <button onClick={() => setConfirmDeleteCat(null)} style={{ padding: "11px 16px", background: "#0f0f13", border: "1px solid #2a2a3e", borderRadius: 9, color: "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderBottom: "1px solid #2a2a3e", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>💸 BudgetFlow</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Personal finance tracker</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["dashboard","transactions","budgets","categories"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 13px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize", background: view === v ? "#6366f1" : "#1e1e2e", color: view === v ? "#fff" : "#9ca3af" }}>{v}</button>
          ))}
          <button onClick={() => fileRef.current.click()} style={{ padding: "6px 13px", borderRadius: 8, border: "1px solid #2a2a3e", background: "#1e1e2e", color: "#f59e0b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🏦 Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
        </div>
      </div>

      {/* Banner */}
      {importMsg && (
        <div onClick={() => setImportMsg(null)} style={{ background: importMsg.type === "success" ? "#10b98118" : "#ef444418", borderBottom: `1px solid ${importMsg.type === "success" ? "#10b981" : "#ef4444"}`, padding: "9px 18px", fontSize: 13, cursor: "pointer", color: importMsg.type === "success" ? "#6ee7b7" : "#fca5a5" }}>
          {importMsg.text} <span style={{ opacity: 0.4 }}>(tap to dismiss)</span>
        </div>
      )}

      {/* Month tabs */}
      <div style={{ display: "flex", gap: 5, padding: "12px 18px 0", overflowX: "auto" }}>
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => setActiveMonth(i)} style={{ padding: "4px 11px", borderRadius: 20, border: "1px solid", borderColor: activeMonth === i ? "#6366f1" : "#2a2a3e", background: activeMonth === i ? "#6366f118" : "transparent", color: activeMonth === i ? "#818cf8" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{m}</button>
        ))}
      </div>

      <div style={{ padding: "16px 18px", maxWidth: 860, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
            {[{ label: "Income", value: fmt(income), color: "#10b981" },
              { label: "Spent", value: fmt(totalSpent), sub: `of ${fmt(totalBudget)} budgeted`, color: totalSpent > totalBudget ? "#ef4444" : "#f59e0b" },
              { label: "Remaining", value: fmt(remaining), color: remaining < 0 ? "#ef4444" : "#6366f1" }
            ].map((card) => (
              <div key={card.label} style={{ background: "#1a1a2e", borderRadius: 13, padding: "15px 16px", border: "1px solid #2a2a3e" }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{card.label}</div>
                <div style={{ fontSize: 23, fontWeight: 700, color: card.color }}>{card.value}</div>
                {card.sub && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{card.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 13 }}>Category Breakdown</div>
            {categories.map((c) => {
              const spent = spentByCategory[c.id] || 0, budget = budgets[c.id] || 0;
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0, over = spent > budget;
              return (
                <div key={c.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}><span>{c.icon}</span><span style={{ fontWeight: 600 }}>{c.label}</span></div>
                    <div style={{ fontSize: 12 }}><span style={{ color: over ? "#ef4444" : "#e8e8f0", fontWeight: 700 }}>{fmt(spent)}</span><span style={{ color: "#4b5563" }}> / {fmt(budget)}</span></div>
                  </div>
                  <div style={{ height: 6, background: "#2a2a3e", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? "#ef4444" : c.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Quick Add Expense</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={newTx.desc} onChange={(e) => setNewTx({ ...newTx, desc: e.target.value })} placeholder="Description" style={{ ...inp, flex: "2 1 130px" }} />
              <input value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} placeholder="$ Amount" type="number" style={{ ...inp, flex: "1 1 90px" }} />
              <select value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })} style={{ ...inp, flex: "1 1 110px" }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button onClick={addTransaction} style={{ padding: "9px 16px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Add</button>
            </div>
          </div>
        </>)}

        {/* TRANSACTIONS */}
        {view === "transactions" && (
          <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Transactions — {MONTHS[activeMonth]}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{monthTx.length} entries · {fmt(totalSpent)}</span>
                <button onClick={() => fileRef.current.click()} style={{ ...inp, padding: "5px 11px", color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏦 Import CSV</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #2a2a3e" }}>
              <input value={newTx.desc} onChange={(e) => setNewTx({ ...newTx, desc: e.target.value })} placeholder="Description" style={{ ...inp, flex: "2 1 130px" }} />
              <input value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} placeholder="$" type="number" style={{ ...inp, flex: "1 1 80px" }} />
              <select value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })} style={{ ...inp, flex: "1 1 110px" }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button onClick={addTransaction} style={{ padding: "9px 14px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Add</button>
            </div>
            {monthTx.length === 0 && <div style={{ textAlign: "center", color: "#4b5563", padding: "36px 0", fontSize: 13 }}>No transactions for {MONTHS[activeMonth]}.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[...monthTx].reverse().map((t) => {
                const c = cat(t.category);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#0f0f13", borderRadius: 9, border: "1px solid #2a2a3e" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 33, height: 33, borderRadius: 8, background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.desc}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{c.label}{t.date ? ` · ${t.date}` : ""}{t.source === "chase" ? " · Chase" : ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(t.amount)}</span>
                      <button onClick={() => deleteTx(t.id)} style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* IMPORT REVIEW */}
        {view === "import" && importState && (
          <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Review Chase Import</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{importState.pending.filter(r => r._include).length} of {importState.pending.length} selected</div>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 13 }}>Uncheck rows to skip. Fix categories if needed.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto", marginBottom: 13 }}>
              {importState.pending.map((r) => {
                const c = cat(r.category);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", background: "#0f0f13", borderRadius: 9, border: "1px solid #2a2a3e", opacity: r._include ? 1 : 0.4 }}>
                    <input type="checkbox" checked={r._include} onChange={() => setImportState((prev) => ({ ...prev, pending: prev.pending.map((x) => x.id === r.id ? { ...x, _include: !x._include } : x) }))} style={{ accentColor: "#6366f1", width: 15, height: 15, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{r.date}</div>
                    </div>
                    <select value={r.category} onChange={(e) => setImportState((prev) => ({ ...prev, pending: prev.pending.map((x) => x.id === r.id ? { ...x, category: e.target.value } : x) }))} style={{ ...inp, fontSize: 12, padding: "5px 8px", flexShrink: 0 }}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                    <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{fmt(r.amount)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={confirmImport} style={{ flex: 1, padding: "11px", background: "#6366f1", border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                ✅ Import {importState.pending.filter(r => r._include).length} Transactions
              </button>
              <button onClick={() => { setImportState(null); setView("transactions"); }} style={{ padding: "11px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 9, color: "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {view === "categories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Manage Categories</div>
              <button onClick={() => setEditingCat({ id: "__new__", label: "", icon: "📦", color: "#6366f1" })} style={{ padding: "7px 14px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Category</button>
            </div>
            {categories.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "#1a1a2e", borderRadius: 12, border: "1px solid #2a2a3e" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                    {transactions.filter(t => t.category === c.id).length} transactions · Budget {fmt(budgets[c.id] || 0)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditingCat({ ...c })} style={{ padding: "6px 12px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 7, color: "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button>
                  <button onClick={() => setConfirmDeleteCat(c.id)} disabled={categories.length <= 1} style={{ padding: "6px 12px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 7, color: categories.length <= 1 ? "#374151" : "#ef4444", fontSize: 12, fontWeight: 600, cursor: categories.length <= 1 ? "not-allowed" : "pointer" }}>🗑️ Delete</button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", paddingTop: 4 }}>
              {categories.length} categories · Deleting moves transactions to the first available category
            </div>
          </div>
        )}

        {/* BUDGETS */}
        {view === "budgets" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 11 }}>Monthly Income</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="number" value={income} onChange={(e) => setIncome(parseFloat(e.target.value) || 0)} style={{ ...inp, flex: 1, border: "1px solid #6366f1", fontSize: 16, fontWeight: 700 }} />
                <div style={{ color: "#6b7280", fontSize: 13 }}>After-tax / month</div>
              </div>
            </div>
            <div style={{ background: "#1a1a2e", borderRadius: 13, padding: 16, border: "1px solid #2a2a3e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Category Budgets</div>
                <div style={{ fontSize: 12, color: totalBudget > income ? "#ef4444" : "#10b981", fontWeight: 600 }}>{fmt(totalBudget)} / {fmt(income)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {categories.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{c.icon}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                    {editingBudget === c.id
                      ? <input autoFocus type="number" defaultValue={budgets[c.id]} onBlur={(e) => { setBudgets({ ...budgets, [c.id]: parseFloat(e.target.value) || 0 }); setEditingBudget(null); }} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} style={{ ...inp, width: 88, border: `1px solid ${c.color}`, textAlign: "right", fontWeight: 700 }} />
                      : <button onClick={() => setEditingBudget(c.id)} style={{ ...inp, cursor: "pointer", fontWeight: 700 }}>{fmt(budgets[c.id] || 0)}</button>}
                    <div style={{ width: 40, fontSize: 11, color: "#6b7280", textAlign: "right" }}>{income > 0 ? `${(((budgets[c.id] || 0) / income) * 100).toFixed(0)}%` : "—"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid #2a2a3e", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Unallocated</span>
                <span style={{ fontWeight: 700, color: income - totalBudget < 0 ? "#ef4444" : "#10b981" }}>{fmt(income - totalBudget)}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{ textAlign: "center", padding: "14px 18px 26px", fontSize: 11, color: "#374151" }}>
        📱 iPhone/iPad: Safari → Share → Add to Home Screen
      </div>
    </div>
  );
}

// Vista tipo Excel del banco Macro. Sube el .xlsx, lo parsea con
// SheetJS y lo guarda en localStorage — persiste entre recargas de
// este navegador pero no se comparte con el equipo. Cuando la forma
// esté definitiva, se migra a Supabase (una tabla por cuenta bancaria).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'bancoMacro:v1';
const HIDDEN_COLS_KEY = 'bancoMacro:hiddenCols:v1';
const SHEET_NAME = 'MACRO';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {
    console.warn('No se pudo guardar en localStorage', e);
  }
}
function loadHiddenCols() {
  try {
    const raw = localStorage.getItem(HIDDEN_COLS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveHiddenCols(set) {
  try { localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...set])); } catch {}
}

// Excel serial dates (1900-based) → JS Date. XLSX ya nos entrega Date
// para celdas con formato de fecha, pero por si acaso alguna quedó como
// número, lo cubrimos.
function excelSerialToDate(n) {
  if (typeof n !== 'number') return null;
  const days = n - 25569; // 25569 = días entre 1970-01-01 y 1900-01-01 ajustado
  return new Date(days * 86400 * 1000);
}
function fmtCell(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toLocaleDateString('es-AR');
  if (typeof v === 'number') {
    // heurística: números grandes con decimales largos → moneda; enteros cortos → tal cual
    if (Math.abs(v) >= 100 || (v % 1 !== 0)) {
      return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    }
    return String(v);
  }
  return String(v);
}

export default function BancoMacroSheet() {
  const [data, setData] = useState(() => loadFromStorage());
  const [hiddenCols, setHiddenCols] = useState(() => loadHiddenCols());
  const [showColPicker, setShowColPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { if (data) saveToStorage(data); }, [data]);
  useEffect(() => { saveHiddenCols(hiddenCols); }, [hiddenCols]);

  const onFile = useCallback(async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // header:1 → array de arrays; primera fila = títulos
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
      if (!aoa.length) throw new Error('Hoja vacía');
      const headers = aoa[0].map((h, i) => (h == null || String(h).trim() === '') ? `Col ${i + 1}` : String(h));
      // Recortar columnas vacías del final
      let lastCol = headers.length;
      while (lastCol > 0) {
        const idx = lastCol - 1;
        const anyData = aoa.slice(1).some(r => r[idx] != null && r[idx] !== '');
        if (anyData || (aoa[0][idx] != null && String(aoa[0][idx]).trim() !== '')) break;
        lastCol--;
      }
      const cols = headers.slice(0, lastCol);
      const rows = aoa.slice(1).map(r => {
        const out = {};
        for (let i = 0; i < cols.length; i++) {
          let v = r[i];
          if (typeof v === 'number' && (cols[i].toUpperCase().includes('EMISION') || cols[i].toUpperCase().includes('VTO') || cols[i].toUpperCase().includes('FECHA'))) {
            const d = excelSerialToDate(v);
            if (d && !isNaN(d)) v = d;
          }
          if (v instanceof Date) v = v.toISOString();
          out[cols[i]] = v == null ? '' : v;
        }
        return out;
      });
      setData({ cols, rows, filename: f.name, importedAt: new Date().toISOString() });
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setBusy(false);
    }
  }, []);

  const displayedRows = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.rows;
    const needle = q.toLowerCase();
    return data.rows.filter(r => data.cols.some(c => String(r[c] ?? '').toLowerCase().includes(needle)));
  }, [data, q]);

  const visibleCols = useMemo(() => data ? data.cols.filter(c => !hiddenCols.has(c)) : [], [data, hiddenCols]);

  const toggleCol = (c) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };
  const showAll = () => setHiddenCols(new Set());

  const editCell = (rowIdx, col, val) => {
    // rowIdx en displayedRows → hay que mapear al índice en data.rows (por si hay filtro)
    setData(prev => {
      if (!prev) return prev;
      // find target row en data.rows por referencia
      const target = displayedRows[rowIdx];
      const realIdx = prev.rows.indexOf(target);
      if (realIdx < 0) return prev;
      const nextRows = prev.rows.slice();
      nextRows[realIdx] = { ...nextRows[realIdx], [col]: val };
      return { ...prev, rows: nextRows };
    });
  };

  const clearAll = () => {
    if (!confirm('Borrar el Excel cargado y todas las ediciones locales?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
  };

  const exportXlsx = () => {
    if (!data) return;
    const aoa = [data.cols, ...data.rows.map(r => data.cols.map(c => {
      const v = r[c];
      // devolver Date real si es ISO date string
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
      return v;
    }))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MACRO');
    XLSX.writeFile(wb, `MACRO_editado_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-6">
          <div className="font-medium text-slate-800 mb-1">Banco Macro</div>
          <div className="text-sm text-slate-500 mb-4">Suba el Excel del banco (por ejemplo <span className="font-mono">8- Banco - MACRO - 2021-2027.xlsx</span>). Los datos y las ediciones se guardan en este navegador; si recarga la página, siguen ahí, pero no los ve el resto del equipo.</div>
          <label className={`block border-2 border-dashed rounded-lg p-8 text-center text-sm cursor-pointer ${busy ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50 text-slate-700'}`}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} disabled={busy} className="hidden" />
            {busy ? 'Procesando...' : 'Arrastre el archivo o toque para elegir'}
          </label>
          {err && <div className="mt-3 text-sm p-2 rounded bg-rose-50 text-rose-800">Error: {err}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-sm">
          <span className="font-medium text-slate-800">{data.filename}</span>
          <span className="text-slate-500 ml-2">· {data.rows.length.toLocaleString('es-AR')} filas · {data.cols.length} columnas</span>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en toda la tabla..." className="ml-auto border rounded px-2 py-1 text-sm w-64" />
        <div className="relative">
          <button onClick={() => setShowColPicker(v => !v)} className="px-3 py-1.5 border rounded text-sm bg-white">
            Columnas ({visibleCols.length}/{data.cols.length})
          </button>
          {showColPicker && (
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 w-64 max-h-96 overflow-y-auto z-20">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <div className="text-xs text-slate-500">Mostrar/ocultar</div>
                <button onClick={showAll} className="text-xs text-blue-600 hover:underline">Mostrar todas</button>
              </div>
              {data.cols.map(c => (
                <label key={c} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={!hiddenCols.has(c)} onChange={() => toggleCol(c)} />
                  <span className="truncate">{c}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button onClick={exportXlsx} className="px-3 py-1.5 border rounded text-sm bg-white">Exportar</button>
        <label className="px-3 py-1.5 border rounded text-sm bg-white cursor-pointer">
          Reemplazar Excel
          <input type="file" accept=".xlsx,.xls" onChange={onFile} disabled={busy} className="hidden" />
        </label>
        <button onClick={clearAll} className="px-3 py-1.5 border rounded text-sm bg-white text-rose-700">Borrar</button>
      </div>
      {err && <div className="text-sm p-2 rounded bg-rose-50 text-rose-800">Error: {err}</div>}

      <div className="bg-white rounded-xl border overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              <th className="px-2 py-1.5 text-left text-slate-500 border-b border-r sticky left-0 bg-slate-100 z-20" style={{ minWidth: '48px' }}>#</th>
              {visibleCols.map(c => (
                <th key={c} className="px-2 py-1.5 text-left font-semibold text-slate-700 border-b border-r whitespace-nowrap" style={{ minWidth: '120px' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-2 py-1 text-slate-400 border-b border-r sticky left-0 bg-white z-10 text-right">{i + 1}</td>
                {visibleCols.map(c => (
                  <EditableCell key={c} value={r[c]} onChange={v => editCell(i, c, v)} />
                ))}
              </tr>
            ))}
            {displayedRows.length === 0 && (
              <tr><td colSpan={visibleCols.length + 1} className="px-3 py-6 text-center text-slate-500">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isNum = typeof value === 'number';
  const display = fmtCell(value);
  if (editing) {
    return (
      <td className="border-b border-r p-0">
        <input
          autoFocus
          defaultValue={value instanceof Date ? value.toISOString().slice(0,10) : (value ?? '')}
          onBlur={(e) => {
            const raw = e.target.value;
            // intento parsear a número si el valor original era número
            let out = raw;
            if (isNum && raw.trim() !== '') {
              const n = Number(raw.replace(/\./g, '').replace(',', '.'));
              if (!isNaN(n)) out = n;
            }
            onChange(out);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setEditing(false); }
          }}
          className={`w-full px-2 py-1 text-xs border border-blue-400 outline-none ${isNum ? 'text-right font-mono' : ''}`}
        />
      </td>
    );
  }
  return (
    <td
      onDoubleClick={() => setEditing(true)}
      className={`px-2 py-1 border-b border-r whitespace-nowrap cursor-cell ${isNum ? 'text-right font-mono' : ''}`}
      title="Doble clic para editar"
    >
      {display}
    </td>
  );
}

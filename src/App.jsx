import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload, FileText, Inbox, CheckCircle2, XCircle, ArrowLeftRight, Settings,
  ClipboardList, Sparkles, User, ChevronRight, Loader2, AlertCircle, Plus,
  Trash2, Send, RotateCcw, Eye, Search, X, Building2, Users, BookOpen,
  History, ImageIcon, Clock, BarChart3, CreditCard, Banknote, LayoutDashboard,
  Landmark, Database
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const ADMINS = ['Valentina Quiencke', 'Alexis Carranza', 'Santiago Tesouro', 'Micaela Seoane'];

const INITIAL_BUYERS = [
  'Gonzalo Palacios', 'Camila Di Meo', 'Agustina Rodriguez', 'Ivan Garay',
  'Ezequiel Bosco', 'Andrea Liendro', 'Valentina Quiencke', 'Santiago Tesouro',
  'Alexis Carranza', 'Leandro Chinni', 'Micaela Seoane'
];

const INITIAL_CARDS = {
  'Visa Macro': [
    'Gustavo Pedretti', 'Micaela Seoane', 'Pablo Spinetto', 'Leandro Seoane',
    'Alexis Carranza', 'Agustina Rodriguez', 'Daiana Martin', 'Ilena Callero',
    'Emilia Alvarez Rossi', 'Ana Bustillos', 'Fabiana Rubio', 'Alejo Zucchelli',
    'Nicolas Mendoza'
  ],
  'Visa Santander': [
    'Gustavo Pedretti', 'Micaela Seoane', 'Pablo Spinetto', 'Leandro Seoane',
    'Victoria Lopez Aybar', 'Ignacio Sanchez Moser', 'Alexis Carranza', 'Hector Bermudez'
  ],
  'Visa Galicia': [
    'Gustavo Pedretti', 'Micaela Seoane', 'Pablo Spinetto', 'Leandro Seoane',
    'Camila Di Meo', 'Gonzalo Palacios', 'Andrea Liendro', 'Ivan Garay', 'Ezequiel Bosco'
  ],
  'Amex': [
    'Gustavo Pedretti', 'Micaela Seoane', 'Pablo Spinetto', 'Leandro Seoane', 'Guillermo Testa'
  ]
};

const INITIAL_COST_CENTERS = [
  { id: 'cc-1',  name: 'STOCK NQN',                     category: 'general' },
  { id: 'cc-2',  name: 'ESTRUCTURA NQN',                category: 'general' },
  { id: 'cc-3',  name: 'CONSUMIBLES',                   category: 'general' },
  { id: 'cc-4',  name: 'ESTRUCTURA',                    category: 'general' },
  { id: 'cc-5',  name: 'EPP',                           category: 'general' },
  { id: 'cc-6',  name: 'PROVEEDORES',                   category: 'general' },
  { id: 'cc-7',  name: 'INVERSION',                     category: 'general' },
  { id: 'cc-8',  name: 'IF4389 PANEDILE',               category: 'obra' },
  { id: 'cc-9',  name: 'IF4430 RE BUILDING TRAILERS II',category: 'obra' },
  { id: 'cc-10', name: 'PL0027 KLOTZ-MINOND',           category: 'obra' },
  { id: 'cc-11', name: 'PL0030 VDP',                    category: 'obra' },
  { id: 'cc-12', name: 'PL0052 ESPINOSA',               category: 'obra' },
  { id: 'cc-13', name: 'PL0058 3 DE FEBRERO',           category: 'obra' },
  { id: 'cc-14', name: 'PL0090 MARIQUEL',               category: 'obra' },
  { id: 'cc-15', name: 'PL0096 ANDY',                   category: 'obra' },
  { id: 'cc-16', name: 'PL0105 LDS CITY',               category: 'obra' },
];

const INVOICE_FIELDS = [
  { key: 'tipoComprobante', label: 'Tipo de comprobante', type: 'select', options: ['A','B','C'], required: true },
  { key: 'nroComprobante',  label: 'Nº de comprobante',   type: 'text',   placeholder: 'A00001-00000000', mono: true, required: true },
  { key: 'razonSocial',     label: 'Razón social proveedor', type: 'text', required: true },
  { key: 'cuit',            label: 'CUIT',                type: 'text',   mono: true, placeholder: '30-12345678-9' },
  { key: 'fechaEmision',    label: 'Fecha de emisión',    type: 'date',   required: true },
  { key: 'moneda',          label: 'Moneda',              type: 'select', options: ['ARS','USD'], required: true },
  { key: 'tipoCambio',      label: 'Tipo de cambio',      type: 'number', hint: 'Requerido si moneda = USD', mono: true },
  { key: 'subtotalGravado', label: 'Subtotal gravado',    type: 'number', mono: true },
  { key: 'noGravado',       label: 'No gravado',          type: 'number', mono: true },
  { key: 'iva',             label: 'IVA',                 type: 'number', mono: true },
  { key: 'percepcionIva',   label: 'Percepción IVA',      type: 'number', mono: true },
  { key: 'iibbBsAs',        label: 'IIBB Prov. Bs As',    type: 'number', mono: true, hint: 'ARBA / Pro Bs As / BS AS' },
  { key: 'iibbCaba',        label: 'IIBB CABA',           type: 'number', mono: true, hint: 'ARCIBA / Capital Federal' },
  { key: 'total',           label: 'Total',               type: 'number', mono: true, required: true, emphasis: true },
  { key: 'cai',             label: 'CAI',                 type: 'text',   mono: true, hint: '14 caracteres' },
  { key: 'cae',             label: 'CAE',                 type: 'text',   mono: true, hint: '14 caracteres' },
];

// Status → color + label
const STATUS = {
  in_intake:       { label: 'En buzón',                  cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  assigned:        { label: 'Con comprador',             cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  admin_verify:    { label: 'Verificando OC',            cls: 'bg-violet-100 text-violet-800 border-violet-300' },
  oc_generated:    { label: 'OC generada — a aprobar',   cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  bounced:         { label: 'Devuelta a compras',        cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  approved:        { label: 'Aprobada',                  cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected:        { label: 'Rechazada (inválida)',      cls: 'bg-rose-100 text-rose-800 border-rose-300' },
};

// ============================================================================
// STORAGE — persistencia entre sesiones
// ============================================================================

const STORAGE_PREFIX = 'etec-inv-';

async function storageGet(key) {
  try {
    const r = await window.storage.get(STORAGE_PREFIX + key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function storageSet(key, value) {
  try {
    await window.storage.set(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) { console.error('storage set failed', key, e); return false; }
}
async function storageDelete(key) {
  try { await window.storage.delete(STORAGE_PREFIX + key); } catch {}
}
async function storageListKeys(prefix = '') {
  try {
    const r = await window.storage.list(STORAGE_PREFIX + prefix);
    return (r?.keys || []).map(k => k.replace(STORAGE_PREFIX, ''));
  } catch { return []; }
}

// ============================================================================
// IMAGE HELPERS — comprimir antes de guardar / mandar al OCR
// ============================================================================

async function processFile(file) {
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mediaType: 'application/pdf', dataUrl, sizeKB: Math.round(base64.length * 0.75 / 1024) });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  if (file.type.startsWith('image/')) {
    const c = await compressImage(file);
    return { ...c, sizeKB: Math.round(c.base64.length * 0.75 / 1024) };
  }
  throw new Error('Formato no soportado');
}

async function compressImage(file, maxSide = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) { height = Math.round(height * maxSide / width); width = maxSide; }
          else { width = Math.round(width * maxSide / height); height = maxSide; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mediaType: 'image/jpeg', dataUrl });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// OCR — llama a la API de Claude para extraer los campos
// ============================================================================

const OCR_PROMPT = `Sos un OCR especializado en facturas argentinas. Analizá esta imagen de factura y extraé los siguientes campos.

Devolvé EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin backticks. Los campos que no puedas identificar dejalos como null. Los montos siempre como número (sin puntos de miles, con punto decimal), no como string.

Estructura exacta esperada:
{
  "tipoComprobante": "A" | "B" | "C" | null,
  "nroComprobante": "Axxxxx-xxxxxxxx" o null (formato con guion),
  "razonSocial": string o null (razón social del PROVEEDOR/EMISOR, no del cliente),
  "cuit": "xx-xxxxxxxx-x" o null (CUIT del proveedor),
  "fechaEmision": "YYYY-MM-DD" o null,
  "moneda": "ARS" | "USD" | null,
  "tipoCambio": number o null (solo si moneda es USD),
  "subtotalGravado": number o null (puede aparecer como "Subtotal gravado", "Total gravado", "Neto gravado"),
  "noGravado": number o null (buscá "No gravado", "Conceptos no gravados"),
  "iva": number o null,
  "percepcionIva": number o null (puede aparecer como "IVA PER", "PER IVA", "Percepción IVA"),
  "iibbBsAs": number o null (puede aparecer como "IIBB BS AS", "IIBB ARBA", "IIBB Pro Bs As", "IIBB Prov Bs As"),
  "iibbCaba": number o null (puede aparecer como "IIBB CABA", "IIBB Capital Federal", "IIBB ARCIBA"),
  "total": number o null,
  "cai": string o null (Código de Autorización de Impresión, 14 caracteres),
  "cae": string o null (Código de Autorización Electrónico, 14 caracteres),
  "conceptosNoClasificados": [
    { "texto": string, "monto": number o null }
  ]
}

En "conceptosNoClasificados" incluí CUALQUIER línea de percepción, impuesto, retención o concepto que no encaje claramente en los campos de arriba (por ejemplo: "Percepción SUSS", "Percepción Ganancias", "IIBB Córdoba", "Impuesto interno", "Sellado", etc.). Esto es MUY importante — no descartes conceptos que no reconozcas, mandalos a esta lista.

Respondé SOLO el JSON.`;

// Aplica el diccionario aprendido sobre los conceptos que devolvió el OCR:
// - 'ignore' → descarta el concepto
// - 'map'    → llena el campo destino con el monto
// - 'new'    → lo suma como campo custom
function applyConceptDict(ocrData, conceptDict) {
  if (!ocrData || !ocrData.conceptosNoClasificados?.length || !conceptDict?.length) return ocrData;
  const dictMap = {};
  conceptDict.forEach(c => { dictMap[c.rawText.toLowerCase().trim()] = c; });
  const remaining = [];
  const customFields = ocrData.customFields ? [...ocrData.customFields] : [];
  const out = { ...ocrData };
  ocrData.conceptosNoClasificados.forEach(concept => {
    const key = (concept.texto || '').toLowerCase().trim();
    const learned = dictMap[key];
    if (!learned) { remaining.push(concept); return; }
    if (learned.action === 'ignore') return;
    if (learned.action === 'map' && learned.mappedTo) {
      out[learned.mappedTo] = concept.monto;
      return;
    }
    if (learned.action === 'new' && learned.mappedTo) {
      customFields.push({ name: learned.mappedTo, amount: concept.monto });
      return;
    }
    remaining.push(concept);
  });
  out.conceptosNoClasificados = remaining;
  out.customFields = customFields;
  return out;
}

async function runOCR(base64, mediaType) {
  const url = 'https://vuhjqjdpqievjdbacoge.supabase.co/functions/v1/ocr-factura';
  const key = 'sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ imageBase64: base64, mimeType: mediaType }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OCR HTTP ${response.status}: ${errText}`);
  }
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.data;
}

// ============================================================================
// UTILS
// ============================================================================

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
};
const fmtDateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
};
const fmtMoney = (n, currency = 'ARS') => {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('es-AR', { style:'currency', currency, minimumFractionDigits: 2 }).format(num);
};
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ============================================================================
// PDF VIEWER — usa Blob URL + iframe (los data URLs con application/pdf
// están bloqueados por Chrome y por los sandboxes de artefactos).
// ============================================================================

function PdfViewer({ base64, minHeight = 500 }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!base64) return;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF blob creation failed', e);
    }
  }, [base64]);

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center p-8 w-full">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <iframe
        src={blobUrl}
        title="PDF"
        className="flex-1 border-0 w-full bg-white"
        style={{ minHeight }}
      />
      <div className="bg-white border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <span>¿No se ve el PDF?</span>
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-900 underline hover:text-slate-700"
        >Abrir en pestaña nueva ↗</a>
      </div>
    </div>
  );
}


// ============================================================================
// APP
// ============================================================================

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState('cargador');
  const [currentUser, setCurrentUser] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [buyers, setBuyers] = useState(INITIAL_BUYERS);
  const [costCenters, setCostCenters] = useState(INITIAL_COST_CENTERS);
  const [conceptDict, setConceptDict] = useState([]); // {rawText, mappedTo, addedBy, addedAt}
  const [cards, setCards] = useState(INITIAL_CARDS); // { 'Visa Macro': [holders...], ... }
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [toast, setToast] = useState(null);

  // ---------- Cargar de storage al montar ----------
  useEffect(() => {
    (async () => {
      const [config, invIndex] = await Promise.all([
        storageGet('config'),
        storageGet('invoice-index'),
      ]);
      if (config) {
        setBuyers(config.buyers || INITIAL_BUYERS);
        setCostCenters(config.costCenters || INITIAL_COST_CENTERS);
        setConceptDict(config.conceptDict || []);
        setCards(config.cards || INITIAL_CARDS);
      }
      if (invIndex && invIndex.length) {
        const invs = await Promise.all(invIndex.map(id => storageGet(`invoice-${id}`)));
        setInvoices(invs.filter(Boolean));
      }
      // usuario default
      setCurrentUser('Alexis Carranza');
      setLoaded(true);
    })();
  }, []);

  // ---------- Persistir config ----------
  useEffect(() => {
    if (!loaded) return;
    storageSet('config', { buyers, costCenters, conceptDict, cards });
  }, [buyers, costCenters, conceptDict, cards, loaded]);

  // ---------- Persistir cada factura + index ----------
  const persistInvoice = async (inv) => {
    await storageSet(`invoice-${inv.id}`, inv);
    const ids = invoices.map(i => i.id);
    if (!ids.includes(inv.id)) {
      await storageSet('invoice-index', [inv.id, ...ids]);
    }
  };
  const deleteInvoice = async (id) => {
    await storageDelete(`invoice-${id}`);
    const ids = invoices.filter(i => i.id !== id).map(i => i.id);
    await storageSet('invoice-index', ids);
    setInvoices(invs => invs.filter(i => i.id !== id));
    if (selectedInvoiceId === id) setSelectedInvoiceId(null);
  };

  const upsertInvoice = async (inv) => {
    await persistInvoice(inv);
    setInvoices(invs => {
      const idx = invs.findIndex(i => i.id === inv.id);
      if (idx === -1) return [inv, ...invs];
      const next = [...invs]; next[idx] = inv; return next;
    });
  };

  const showToast = (msg, kind='info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId) || null;

  // ---------- Render ----------
  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <TopBar
        role={role} setRole={(r) => { setRole(r); setSelectedInvoiceId(null); }}
        currentUser={currentUser} setCurrentUser={setCurrentUser}
        buyers={buyers}
      />

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {role === 'cargador' && (
          <CargadorView
            currentUser={currentUser}
            costCenters={costCenters}
            conceptDict={conceptDict}
            cards={cards}
            onUploaded={(inv) => { upsertInvoice(inv); showToast('Factura subida al buzón de ingreso', 'ok'); }}
            showToast={showToast}
          />
        )}

        {role === 'comprador' && (
          selectedInvoice ? (
            <InvoiceDetail
              invoice={selectedInvoice}
              role="comprador"
              currentUser={currentUser}
              buyers={buyers}
              costCenters={costCenters}
              conceptDict={conceptDict}
              onBack={() => setSelectedInvoiceId(null)}
              onSave={upsertInvoice}
              showToast={showToast}
            />
          ) : (
            <CompradorView
              currentUser={currentUser}
              invoices={invoices}
              onOpen={setSelectedInvoiceId}
            />
          )
        )}

        {role === 'admin' && (
          selectedInvoice ? (
            <InvoiceDetail
              invoice={selectedInvoice}
              role="admin"
              currentUser={currentUser}
              buyers={buyers}
              costCenters={costCenters}
              conceptDict={conceptDict}
              setConceptDict={setConceptDict}
              onBack={() => setSelectedInvoiceId(null)}
              onSave={upsertInvoice}
              onDelete={deleteInvoice}
              showToast={showToast}
            />
          ) : (
            <AdminView
              currentUser={currentUser}
              invoices={invoices}
              buyers={buyers} setBuyers={setBuyers}
              costCenters={costCenters} setCostCenters={setCostCenters}
              conceptDict={conceptDict} setConceptDict={setConceptDict}
              cards={cards} setCards={setCards}
              onOpen={setSelectedInvoiceId}
              onUpdateInvoice={upsertInvoice}
              onDelete={deleteInvoice}
              showToast={showToast}
            />
          )
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg border text-sm z-50 ${
          toast.kind === 'ok' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          toast.kind === 'err' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          'bg-slate-800 border-slate-700 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOP BAR — selector de rol y usuario
// ============================================================================

function TopBar({ role, setRole, currentUser, setCurrentUser, buyers }) {
  const roles = [
    { id: 'cargador',  label: 'Cargador',      icon: Upload },
    { id: 'comprador', label: 'Comprador',     icon: ClipboardList },
    { id: 'admin',     label: 'Administración',icon: Settings },
  ];
  const userOptions =
    role === 'admin' ? ADMINS :
    role === 'comprador' ? buyers :
    [...new Set([...buyers, ...ADMINS])];

  useEffect(() => {
    if (!userOptions.includes(currentUser)) {
      setCurrentUser(userOptions[0] || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="font-semibold tracking-tight">Recepción de Facturas</div>
          <div className="text-xs text-slate-400 hidden sm:block">— ETEC</div>
        </div>

        <nav className="ml-6 flex items-center gap-1">
          {roles.map(r => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`px-3 h-9 rounded-md text-sm font-medium flex items-center gap-2 transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{r.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs text-slate-500 hidden md:block">Viendo como</div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-md px-2 h-9">
            <User className="w-4 h-4 text-slate-500" />
            <select
              value={currentUser}
              onChange={e => setCurrentUser(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none pr-6 py-1"
            >
              {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// CARGADOR — subir factura
// ============================================================================

function CargadorView({ currentUser, costCenters, conceptDict, cards, onUploaded, showToast }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [costCenter, setCostCenter] = useState('');
  const [hasOC, setHasOC] = useState(false);
  const [ocNumber, setOcNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // '' | 'cash' | 'credit_card'
  const [cardBank, setCardBank] = useState(''); // 'Visa Macro' | ...
  const [cardHolder, setCardHolder] = useState('');
  const [cardAmountDiffers, setCardAmountDiffers] = useState(null); // null | true | false
  const [cardDebitAmount, setCardDebitAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const inputRef = useRef(null);

  const availableCards = Object.keys(cards || {});
  const availableHolders = (cardBank && cards?.[cardBank]) || [];

  // Reglas de asignación de tarjeta:
  // - Admin (cargador o no) puede cargar en nombre de cualquier titular.
  // - Usuario normal solo puede cargar en su nombre (cardHolder = currentUser).
  // - Si tiene solo 1 tarjeta, se auto-selecciona; si tiene 2+, elige entre las suyas.
  const isAdmin = ADMINS.includes(currentUser);
  const userCards = availableCards.filter(c => (cards?.[c] || []).includes(currentUser));
  const userCardsKey = userCards.join('|');
  const showCardPicker = isAdmin || userCards.length >= 2;
  const cardOptions = isAdmin ? availableCards : userCards;

  // Al cambiar de usuario, resetear todo lo relacionado a tarjeta
  useEffect(() => {
    setCardBank('');
    setCardHolder('');
    setCardAmountDiffers(null);
    setCardDebitAmount('');
  }, [currentUser]);

  // Autocompletado según reglas
  useEffect(() => {
    if (paymentMethod !== 'credit_card') return;
    if (isAdmin) {
      // Admin: si eligió una tarjeta y es titular, precargar su nombre como default
      if (cardBank && !cardHolder && (cards?.[cardBank] || []).includes(currentUser)) {
        setCardHolder(currentUser);
      }
      return;
    }
    // No-admin: titular = currentUser siempre
    setCardHolder(currentUser);
    // Si tiene una sola tarjeta, la seleccionamos
    if (userCards.length === 1) {
      setCardBank(userCards[0]);
    } else if (cardBank && !userCards.includes(cardBank)) {
      // Limpia si la tarjeta elegida no es suya
      setCardBank('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, isAdmin, currentUser, cardBank, userCardsKey]);

  const canSubmit = preview && costCenter && paymentMethod &&
    (!hasOC || ocNumber.trim().length > 0) &&
    (paymentMethod !== 'credit_card' || (
      cardBank && cardHolder &&
      (cardAmountDiffers === false ||
        (cardAmountDiffers === true && cardDebitAmount.trim().length > 0))
    ));

  const handleFile = async (f) => {
    if (!f) return;
    const isImg = f.type.startsWith('image/');
    const isPdf = f.type === 'application/pdf';
    if (!isImg && !isPdf) {
      showToast('Subí una imagen (JPG/PNG) o un PDF', 'err'); return;
    }
    setFile(f);
    try {
      const processed = await processFile(f);
      if (processed.sizeKB > 4500) {
        showToast(`El archivo pesa ${processed.sizeKB} KB — puede fallar el guardado. Ideal < 4.5 MB.`, 'err');
      }
      setPreview(processed);
    } catch (e) {
      showToast('No se pudo procesar el archivo: ' + e.message, 'err');
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    setProgress('Extrayendo campos con OCR...');
    let ocrData = null;
    let ocrError = null;
    try {
      ocrData = await runOCR(preview.base64, preview.mediaType);
      // Aplicar el diccionario aprendido antes de guardar
      ocrData = applyConceptDict(ocrData, conceptDict);
    } catch (e) {
      console.error(e);
      ocrError = e.message || 'Error de OCR';
    }

    const now = new Date().toISOString();
    const debit = (paymentMethod === 'credit_card' && cardAmountDiffers === true)
      ? Number(cardDebitAmount) : null;
    const inv = {
      id: uid(),
      uploadedBy: currentUser,
      uploadedAt: now,
      photoBase64: preview.base64,
      photoMediaType: preview.mediaType,
      costCenter,
      hasReferencedOC: hasOC,
      referencedOCNumber: hasOC ? ocNumber.trim() : null,
      paymentMethod, // 'cash' | 'credit_card'
      cardBank: paymentMethod === 'credit_card' ? cardBank : null,
      cardHolder: paymentMethod === 'credit_card' ? cardHolder : null,
      cardDebitAmount: debit,
      ocrData: ocrData || {},
      ocrError,
      fieldsEdited: {},
      customFields: ocrData?.customFields || [],
      unclassifiedConcepts: ocrData?.conceptosNoClasificados || [],
      status: hasOC ? 'admin_verify' : 'in_intake',
      assignedTo: null,
      purchaseOrder: null,
      bounceReason: '',
      rejectionReason: '',
      history: [{
        action: hasOC ? 'Cargada con OC referenciada — a verificar por admin' : 'Cargada al buzón de ingreso',
        actor: currentUser, timestamp: now,
        note: `Centro de costo: ${costCenter} · Pago: ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia u otro' : `${cardBank} (${cardHolder})`}${debit ? ` — débito $${debit}` : ''}${hasOC ? ` · OC ref: ${ocNumber}` : ''}${ocrError ? ` · OCR falló: ${ocrError}` : ''}`
      }]
    };

    await onUploaded(inv);
    setFile(null); setPreview(null); setCostCenter(''); setHasOC(false); setOcNumber('');
    setPaymentMethod(''); setCardBank(''); setCardHolder('');
    setCardAmountDiffers(null); setCardDebitAmount('');
    if (inputRef.current) inputRef.current.value = '';
    setProcessing(false); setProgress('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Subir factura</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sacá foto de la factura, elegí el centro de costo y enviala al buzón. El sistema va a leer los campos automáticamente.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        {/* Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Foto de la factura</label>
          {!preview ? (
            <label className="block cursor-pointer">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 hover:bg-slate-50 transition">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <div className="text-sm font-medium">Tocá para tomar foto, elegir imagen o PDF</div>
                <div className="text-xs text-slate-500 mt-1">JPG, PNG o PDF</div>
              </div>
            </label>
          ) : (
            <div className="relative">
              {preview.mediaType === 'application/pdf' ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <div className="h-96">
                    <PdfViewer base64={preview.base64} minHeight={380} />
                  </div>
                  <div className="px-3 py-2 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> PDF · {preview.sizeKB} KB
                  </div>
                </div>
              ) : (
                <img src={preview.dataUrl} alt="Preview" className="w-full rounded-lg border border-slate-200" />
              )}
              <button
                onClick={() => { setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Centro de costo */}
        <div>
          <label className="block text-sm font-medium mb-2">Centro de costo <span className="text-rose-600">*</span></label>
          <select
            value={costCenter}
            onChange={e => setCostCenter(e.target.value)}
            className="w-full h-11 px-3 border border-slate-300 rounded-md bg-white text-sm"
          >
            <option value="">Seleccioná un centro de costo...</option>
            <optgroup label="Generales">
              {costCenters.filter(c => c.category === 'general').map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Obras / Proyectos">
              {costCenters.filter(c => c.category === 'obra').map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Forma de pago */}
        <div className="border-t border-slate-200 pt-5">
          <label className="block text-sm font-medium mb-3">Forma de pago <span className="text-rose-600">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setPaymentMethod('cash'); setCardBank(''); setCardHolder(''); setCardAmountDiffers(null); setCardDebitAmount(''); }}
              className={`h-12 border rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${
                paymentMethod === 'cash'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4" /> Efectivo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit_card')}
              className={`h-12 border rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${
                paymentMethod === 'credit_card'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Tarjeta
            </button>
            <button
              type="button"
              onClick={() => { setPaymentMethod('transfer'); setCardBank(''); setCardHolder(''); setCardAmountDiffers(null); setCardDebitAmount(''); }}
              className={`h-12 border rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${
                paymentMethod === 'transfer'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <Landmark className="w-4 h-4" /> Transf. u otro
            </button>
          </div>

          {paymentMethod === 'credit_card' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md space-y-4">

              {/* No-admin sin tarjetas asignadas */}
              {!isAdmin && userCards.length === 0 && (
                <div className="text-sm text-rose-800 p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>{currentUser}</strong> no está cargado como titular de ninguna tarjeta.
                    Pedile a admin que te agregue, o elegí "Efectivo".
                  </div>
                </div>
              )}

              {/* Aviso: no-admin carga siempre a su nombre */}
              {!isAdmin && userCards.length >= 1 && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Se cargará a nombre de <strong>{currentUser}</strong>
                </div>
              )}

              {/* Aviso: admin puede cargar a nombre de cualquiera */}
              {isAdmin && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Settings className="w-3 h-3" />
                  Cargando como admin — podés elegir la tarjeta y el titular libremente
                </div>
              )}

              {/* Selector de tarjeta: se muestra si es admin o el user tiene 2+ tarjetas */}
              {showCardPicker && cardOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tarjeta <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {cardOptions.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCardBank(c);
                          // Admin: si el titular actual no es titular de la nueva tarjeta, limpiarlo
                          if (isAdmin && cardHolder && !(cards?.[c] || []).includes(cardHolder)) {
                            setCardHolder('');
                          }
                        }}
                        className={`h-10 border rounded-md text-sm font-medium ${
                          cardBank === c
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >{c}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmación visual cuando la tarjeta se autoseleccionó */}
              {!showCardPicker && cardBank && !isAdmin && (
                <div className="text-sm p-2.5 bg-white border border-slate-300 rounded flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span>Tarjeta: <strong>{cardBank}</strong></span>
                </div>
              )}

              {/* Selector de titular: solo admin */}
              {isAdmin && cardBank && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Titular de la tarjeta <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm"
                  >
                    <option value="">Elegir titular...</option>
                    {(cards?.[cardBank] || []).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {(cards?.[cardBank] || []).length === 0 && (
                    <div className="text-xs text-rose-700 mt-1">
                      Esta tarjeta no tiene titulares cargados.
                    </div>
                  )}
                </div>
              )}

              {/* Débito */}
              {cardBank && cardHolder && (
                <div className="pt-3 border-t border-amber-300">
                  <div className="text-sm font-medium mb-3">
                    ¿El importe final de la factura es el que se debitará de la tarjeta?
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => { setCardAmountDiffers(false); setCardDebitAmount(''); }}
                      className={`h-10 border rounded-md text-sm font-medium ${
                        cardAmountDiffers === false ? 'border-slate-900 bg-white' : 'border-slate-300 bg-white text-slate-500'
                      }`}
                    >Sí, es el mismo</button>
                    <button
                      type="button"
                      onClick={() => setCardAmountDiffers(true)}
                      className={`h-10 border rounded-md text-sm font-medium ${
                        cardAmountDiffers === true ? 'border-slate-900 bg-white' : 'border-slate-300 bg-white text-slate-500'
                      }`}
                    >No, es otro</button>
                  </div>
                  {cardAmountDiffers === true && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Importe que se debitará <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={cardDebitAmount}
                        onChange={e => setCardDebitAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-10 px-3 border border-slate-300 rounded text-sm font-mono bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* OC referenciada */}
        <div className="border-t border-slate-200 pt-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={hasOC} onChange={e => setHasOC(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300" />
            <div>
              <div className="text-sm font-medium">La factura ya tiene una OC asociada</div>
              <div className="text-xs text-slate-500">Va a ir directo a administración para verificar que la OC corresponda.</div>
            </div>
          </label>
          {hasOC && (
            <input
              type="text"
              value={ocNumber}
              onChange={e => setOcNumber(e.target.value)}
              placeholder="Número de OC"
              className="mt-3 w-full h-11 px-3 border border-slate-300 rounded-md text-sm font-mono"
            />
          )}
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit || processing}
          className="w-full h-11 bg-slate-900 text-white rounded-md font-medium text-sm hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (<><Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Procesando...'}</>) : (<><Send className="w-4 h-4" /> Enviar factura</>)}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPRADOR — bandeja de facturas asignadas
// ============================================================================

function CompradorView({ currentUser, invoices, onOpen }) {
  const mine = invoices.filter(i =>
    i.assignedTo === currentUser && ['assigned', 'bounced'].includes(i.status)
  );
  const generated = invoices.filter(i => i.assignedTo === currentUser && ['oc_generated','approved','rejected'].includes(i.status));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mis facturas asignadas</h1>
        <p className="text-slate-500 text-sm mt-1">Facturas que administración derivó a vos para generar la OC.</p>
      </div>

      <Section title="Pendientes" count={mine.length} icon={Inbox}>
        {mine.length === 0 ? (
          <EmptyState msg="No tenés facturas pendientes." />
        ) : (
          <InvoiceTable invoices={mine} onOpen={onOpen} showBounceReason />
        )}
      </Section>

      <Section title="Historial" count={generated.length} icon={History} collapsedByDefault>
        {generated.length === 0 ? (
          <EmptyState msg="Todavía no procesaste ninguna factura." />
        ) : (
          <InvoiceTable invoices={generated} onOpen={onOpen} />
        )}
      </Section>
    </div>
  );
}

// ============================================================================
// ADMIN — con tabs de navegación lateral
// ============================================================================

function AdminView({ currentUser, invoices, buyers, setBuyers, costCenters, setCostCenters, conceptDict, setConceptDict, cards, setCards, onOpen, onUpdateInvoice, onDelete, showToast }) {
  const [tab, setTab] = useState('tablero');

  const buzonIngreso  = invoices.filter(i => i.status === 'in_intake');
  const verificarOC   = invoices.filter(i => i.status === 'admin_verify');
  const aAprobar      = invoices.filter(i => i.status === 'oc_generated');
  const rechazadas    = invoices.filter(i => i.status === 'rejected');
  const incidentesAbiertos = invoices.filter(i => ['in_intake','assigned','admin_verify','oc_generated','bounced'].includes(i.status));
  const incidentesResueltos = invoices.filter(i => i.status === 'approved');
  const unclassified = invoices.flatMap(i => (i.unclassifiedConcepts || []).map(c => ({ ...c, invoiceId: i.id, invoiceNumber: i.ocrData?.nroComprobante })));

  // Buzones de carga en sistema — aprobadas y todavía no cargadas
  const pendientesCargaTCEF = invoices.filter(i =>
    i.status === 'approved' && !i.loadedInSystem &&
    (i.paymentMethod === 'cash' || i.paymentMethod === 'credit_card')
  );
  const pendientesCargaResto = invoices.filter(i =>
    i.status === 'approved' && !i.loadedInSystem &&
    i.paymentMethod !== 'cash' && i.paymentMethod !== 'credit_card'
  );

  const tabs = [
    { id: 'tablero',       label: 'Tablero',             icon: LayoutDashboard },
    { id: 'ingreso',       label: 'Buzón de ingreso',    icon: Inbox,         badge: buzonIngreso.length },
    { id: 'verificar',     label: 'Verificar OC ref.',   icon: Eye,           badge: verificarOC.length },
    { id: 'aprobar',       label: 'Aprobar OCs',         icon: CheckCircle2,  badge: aAprobar.length },
    { id: 'incidentes',    label: 'Incidentes',          icon: ClipboardList, badge: incidentesAbiertos.length },
    { id: 'pagos',         label: 'Pagos',               icon: CreditCard },
    { id: 'cargar-tcef',   label: 'Cargar sist. TC/Ef',  icon: Database,      badge: pendientesCargaTCEF.length },
    { id: 'cargar-resto',  label: 'Cargar sist. Resto',  icon: Database,      badge: pendientesCargaResto.length },
    { id: 'aprender',      label: 'A clasificar',        icon: Sparkles,      badge: unclassified.length },
    { id: 'config',        label: 'Configuración',       icon: Settings },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      {/* Sidebar */}
      <aside>
        <nav className="bg-white border border-slate-200 rounded-lg p-2 sticky top-20">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md text-sm text-left transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </span>
                {t.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div>
        {tab === 'tablero' && (
          <TableroPanel invoices={invoices} />
        )}
        {tab === 'ingreso' && (
          <TabWrap title="Buzón de ingreso" subtitle="Facturas sin OC recién cargadas. Derivalas al comprador correspondiente.">
            {buzonIngreso.length === 0 ? <EmptyState msg="No hay facturas para derivar." /> :
              <InvoiceTable invoices={buzonIngreso} onOpen={onOpen} />}
          </TabWrap>
        )}
        {tab === 'verificar' && (
          <TabWrap title="Verificar OC referenciada" subtitle="Facturas que llegaron con OC. Verificá que la OC corresponda y los valores coincidan.">
            {verificarOC.length === 0 ? <EmptyState msg="No hay facturas con OC pendientes de verificar." /> :
              <InvoiceTable invoices={verificarOC} onOpen={onOpen} showOCRef />}
          </TabWrap>
        )}
        {tab === 'aprobar' && (
          <TabWrap title="OCs generadas — a aprobar" subtitle="Compradores devolvieron facturas con OC generada. Revisalas y aprobá o devolvé.">
            {aAprobar.length === 0 ? <EmptyState msg="No hay OCs esperando aprobación." /> :
              <InvoiceTable invoices={aAprobar} onOpen={onOpen} showOC />}
          </TabWrap>
        )}
        {tab === 'incidentes' && (
          <IncidentesPanel
            abiertos={incidentesAbiertos}
            resueltos={incidentesResueltos}
            rechazadas={rechazadas}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        )}
        {tab === 'aprender' && (
          <AprendizajePanel
            unclassified={unclassified}
            conceptDict={conceptDict}
            setConceptDict={setConceptDict}
            onOpen={onOpen}
            currentUser={currentUser}
            invoices={invoices}
            onUpdateInvoice={onUpdateInvoice}
          />
        )}
        {tab === 'pagos' && (
          <PagosPanel
            invoices={invoices}
            cards={cards}
            onOpen={onOpen}
          />
        )}
        {tab === 'cargar-tcef' && (
          <CargaEnSistemaPanel
            titulo="Cargar en sistema — Tarjeta / Efectivo"
            subtitulo="Facturas aprobadas pendientes de cargar en Tango."
            responsable="Santiago Tesouro"
            invoices={pendientesCargaTCEF}
            onOpen={onOpen}
          />
        )}
        {tab === 'cargar-resto' && (
          <CargaEnSistemaPanel
            titulo="Cargar en sistema — Resto"
            subtitulo="Facturas aprobadas por transferencia u otro medio, pendientes de cargar."
            responsable="Valentina Quiencke"
            invoices={pendientesCargaResto}
            onOpen={onOpen}
          />
        )}
        {tab === 'config' && (
          <ConfigPanel
            buyers={buyers} setBuyers={setBuyers}
            costCenters={costCenters} setCostCenters={setCostCenters}
            cards={cards} setCards={setCards}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

function TabWrap({ title, subtitle, children }) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, count, icon: Icon, children, collapsedByDefault = false }) {
  const [open, setOpen] = useState(!collapsedByDefault);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700"
      >
        <Icon className="w-4 h-4" />
        <span>{title}</span>
        <span className="text-slate-400">({count})</span>
      </button>
      {open && children}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-10 text-center text-sm text-slate-500 bg-white">
      {msg}
    </div>
  );
}

// ============================================================================
// TABLA DE FACTURAS
// ============================================================================

function InvoiceTable({ invoices, onOpen, showOC, showOCRef, showBounceReason }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left text-xs uppercase text-slate-500 tracking-wide">
            <th className="px-4 py-2.5 font-medium">Proveedor</th>
            <th className="px-4 py-2.5 font-medium">Nº</th>
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5 font-medium text-right">Total</th>
            <th className="px-4 py-2.5 font-medium">Centro costo</th>
            <th className="px-4 py-2.5 font-medium">Estado</th>
            <th className="px-4 py-2.5 font-medium">Asignada a</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map(inv => {
            const d = inv.ocrData || {};
            return (
              <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(inv.id)}>
                <td className="px-4 py-3">
                  <div className="font-medium">{d.razonSocial || <span className="text-slate-400 italic">Sin identificar</span>}</div>
                  <div className="text-xs text-slate-500 font-mono">{d.cuit || ''}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {d.tipoComprobante && <span className="inline-block bg-slate-200 px-1.5 rounded mr-1">{d.tipoComprobante}</span>}
                  {d.nroComprobante || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{fmtDateShort(d.fechaEmision)}</td>
                <td className="px-4 py-3 font-mono text-right">{fmtMoney(d.total, d.moneda || 'ARS')}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{inv.costCenter}</td>
                <td className="px-4 py-3">
                  <StatusPill status={inv.status} />
                  {showOCRef && inv.referencedOCNumber && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">OC: {inv.referencedOCNumber}</div>
                  )}
                  {showOC && inv.purchaseOrder?.number && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">OC: {inv.purchaseOrder.number}</div>
                  )}
                  {showBounceReason && inv.bounceReason && (
                    <div className="text-xs text-orange-700 mt-1 max-w-xs">↪ {inv.bounceReason}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{inv.assignedTo || '—'}</td>
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-300' };
  return <span className={`inline-block text-xs px-2 py-0.5 border rounded ${s.cls}`}>{s.label}</span>;
}

// ============================================================================
// INVOICE DETAIL — vista split (foto | campos)
// ============================================================================

function InvoiceDetail({ invoice, role, currentUser, buyers, costCenters, conceptDict, setConceptDict, onBack, onSave, onDelete, showToast }) {
  const [inv, setInv] = useState(invoice);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setInv(invoice); }, [invoice]);

  const updateField = (key, value) => {
    setInv(prev => ({
      ...prev,
      ocrData: { ...prev.ocrData, [key]: value },
      fieldsEdited: { ...prev.fieldsEdited, [key]: true }
    }));
  };

  const addHistory = (invObj, action, note = '') => ({
    ...invObj,
    history: [...(invObj.history || []), { action, actor: currentUser, timestamp: new Date().toISOString(), note }]
  });

  const saveFieldsOnly = async () => {
    await onSave(inv);
    showToast('Cambios guardados', 'ok');
  };

  // Acciones según rol y estado
  const canDerive = role === 'admin' && inv.status === 'in_intake';
  const canVerifyOCref = role === 'admin' && inv.status === 'admin_verify';
  const canReviewOC = role === 'admin' && inv.status === 'oc_generated';
  const canBuyerAct = role === 'comprador' && ['assigned','bounced'].includes(inv.status) && inv.assignedTo === currentUser;
  const canLoadSystem = role === 'admin' && inv.status === 'approved' && !inv.loadedInSystem;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeftRight className="w-4 h-4 rotate-180" /> Volver
        </button>
        <div className="flex items-center gap-2">
          <StatusPill status={inv.status} />
          {role === 'admin' && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-400 hover:text-rose-600 p-1"
              title="Eliminar"
            ><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:gap-6">
        {/* FOTO / PDF — siempre a la izquierda, ajustada al viewport */}
        <div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden sticky top-[4.5rem] flex flex-col h-[calc(100vh-6rem)]">
            <div className="px-4 py-2.5 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 flex items-center justify-between flex-shrink-0">
              <span>{inv.photoMediaType === 'application/pdf' ? 'PDF' : 'Foto'} de la factura</span>
              <span className="text-slate-400 truncate ml-2 normal-case">{inv.uploadedBy}</span>
            </div>
            <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto min-h-0">
              {inv.photoMediaType === 'application/pdf' ? (
                <PdfViewer base64={inv.photoBase64} />
              ) : (
                <img
                  src={`data:${inv.photoMediaType};base64,${inv.photoBase64}`}
                  alt="Factura"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>

        {/* DATOS */}
        <div>
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="px-4 py-2.5 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 flex items-center justify-between">
              <span>Campos extraídos</span>
              <span className="text-emerald-700">● OCR extraído   <span className="text-amber-700 ml-2">● Editado a mano</span></span>
            </div>

            {inv.ocrError && (
              <div className="mx-4 mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>El OCR falló: {inv.ocrError}. Cargá los campos manualmente.</div>
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Centro de costo</div>
                  <div className="text-sm font-medium">{inv.costCenter}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Forma de pago</div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {inv.paymentMethod === 'credit_card' ? (
                      <><CreditCard className="w-3.5 h-3.5" /> {inv.cardBank || 'Tarjeta de crédito'}</>
                    ) : inv.paymentMethod === 'cash' ? (
                      <><Banknote className="w-3.5 h-3.5" /> Efectivo</>
                    ) : inv.paymentMethod === 'transfer' ? (
                      <><Landmark className="w-3.5 h-3.5" /> Transferencia u otro</>
                    ) : <span className="text-slate-400">—</span>}
                  </div>
                  {inv.cardHolder && (
                    <div className="text-xs text-slate-600 mt-0.5">Titular: {inv.cardHolder}</div>
                  )}
                  {inv.cardDebitAmount != null && (
                    <div className="text-xs text-amber-700 mt-0.5">
                      Se debita: <span className="font-mono">{fmtMoney(inv.cardDebitAmount, inv.ocrData?.moneda || 'ARS')}</span>
                    </div>
                  )}
                </div>
                {inv.referencedOCNumber && (
                  <div>
                    <div className="text-xs text-slate-500">OC referenciada</div>
                    <div className="text-sm font-mono font-medium">{inv.referencedOCNumber}</div>
                  </div>
                )}
              </div>

              {INVOICE_FIELDS.map(f => (
                <FieldEditor key={f.key} field={f} value={inv.ocrData?.[f.key]} edited={inv.fieldsEdited?.[f.key]} onChange={(v) => updateField(f.key, v)} />
              ))}

              {/* Campos adicionales aprendidos */}
              {inv.customFields?.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Campos adicionales
                  </div>
                  <div className="space-y-1.5">
                    {inv.customFields.map((f, i) => (
                      <div key={i} className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 flex justify-between">
                        <span>{f.name}</span>
                        <span className="font-mono">{fmtMoney(f.amount, inv.ocrData?.moneda || 'ARS')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conceptos sin clasificar */}
              {inv.unclassifiedConcepts?.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Conceptos sin clasificar
                  </div>
                  <div className="space-y-1.5">
                    {inv.unclassifiedConcepts.map((c, i) => (
                      <div key={i} className="text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2 flex justify-between">
                        <span>{c.texto}</span>
                        <span className="font-mono">{fmtMoney(c.monto, inv.ocrData?.moneda || 'ARS')}</span>
                      </div>
                    ))}
                  </div>
                  {role === 'admin' && (
                    <div className="text-xs text-slate-500 mt-2">
                      → Podés parametrizarlos desde la pestaña "A clasificar".
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={saveFieldsOnly}
                className="h-9 px-4 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50"
              >Guardar campos</button>
            </div>
          </div>

          {/* Historial */}
          <HistoryBox history={inv.history} />

          {/* Comentario de rechazo del comprador, visible siempre */}
          {inv.rejectionReason && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-rose-700 mb-1">Motivo de rechazo del comprador</div>
              <div className="text-sm text-rose-900 whitespace-pre-wrap">{inv.rejectionReason}</div>
            </div>
          )}
          {inv.bounceReason && ['bounced','oc_generated'].includes(inv.status) && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-orange-700 mb-1">Devuelta a compras por</div>
              <div className="text-sm text-orange-900 whitespace-pre-wrap">{inv.bounceReason}</div>
            </div>
          )}
        </div>
      </div>

      {/* ACTION BAR — flotante abajo */}
      <ActionBar
        inv={inv} setInv={setInv} onSave={onSave} onBack={onBack}
        role={role} currentUser={currentUser} buyers={buyers}
        addHistory={addHistory}
        showToast={showToast}
        canDerive={canDerive}
        canVerifyOCref={canVerifyOCref}
        canReviewOC={canReviewOC}
        canBuyerAct={canBuyerAct}
        canLoadSystem={canLoadSystem}
      />

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar factura?"
          message="Se borra la factura, su historial y todo lo asociado. Esta acción no se puede deshacer."
          onConfirm={() => onDelete(inv.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// FIELD EDITOR — con marca visual OCR vs editado
// ============================================================================

function FieldEditor({ field, value, edited, onChange }) {
  const hasOcr = value !== null && value !== undefined && value !== '';
  const dotClass = edited ? 'bg-amber-500' : (hasOcr ? 'bg-emerald-500' : 'bg-slate-300');

  return (
    <div className="grid grid-cols-[16px_1fr] gap-2 items-start">
      <div className={`w-2 h-2 rounded-full mt-3 ${dotClass}`} title={edited ? 'Editado a mano' : hasOcr ? 'Extraído por OCR' : 'Sin dato'} />
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {field.label} {field.required && <span className="text-rose-500">*</span>}
          {field.hint && <span className="text-slate-400 font-normal ml-1">— {field.hint}</span>}
        </label>
        {field.type === 'select' ? (
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            className={`w-full h-9 px-2 border border-slate-300 rounded text-sm bg-white ${field.emphasis ? 'font-semibold' : ''}`}
          >
            <option value="">—</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : field.type === 'number' ? (
          <input
            type="number" step="0.01"
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className={`w-full h-9 px-2 border border-slate-300 rounded text-sm ${field.mono ? 'font-mono' : ''} ${field.emphasis ? 'font-semibold text-base' : ''}`}
            placeholder="0.00"
          />
        ) : field.type === 'date' ? (
          <input
            type="date"
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            className="w-full h-9 px-2 border border-slate-300 rounded text-sm"
          />
        ) : (
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            placeholder={field.placeholder}
            className={`w-full h-9 px-2 border border-slate-300 rounded text-sm ${field.mono ? 'font-mono' : ''}`}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY
// ============================================================================

function HistoryBox({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-2.5 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> Historial
      </div>
      <div className="p-4 space-y-3">
        {[...history].reverse().map((h, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{h.action}</div>
              {h.note && <div className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{h.note}</div>}
              <div className="text-xs text-slate-400 mt-0.5">{h.actor} · {fmtDate(h.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ACTION BAR — botones flotantes según rol / estado
// ============================================================================

function ActionBar({ inv, setInv, onSave, onBack, role, currentUser, buyers, addHistory, showToast, canDerive, canVerifyOCref, canReviewOC, canBuyerAct, canLoadSystem }) {
  const [modal, setModal] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [text, setText] = useState('');
  const [ocNumber, setOcNumber] = useState(inv.purchaseOrder?.number || '');
  const [ocNotes, setOcNotes] = useState(inv.purchaseOrder?.notes || '');

  const commit = async (updater, toastMsg) => {
    const nextInv = updater(inv);
    setInv(nextInv);
    await onSave(nextInv);
    if (toastMsg) showToast(toastMsg, 'ok');
    setModal(null); setText(''); setSelectedBuyer('');
    onBack();
  };

  const anyAction = canDerive || canVerifyOCref || canReviewOC || canBuyerAct || canLoadSystem;
  if (!anyAction) return null;

  return (
    <>
      <div className="sticky bottom-0 -mx-4 mt-6 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-[1600px] mx-auto flex flex-wrap gap-2 justify-end">

          {canDerive && (
            <button onClick={() => setModal('derive')} className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
              <Send className="w-4 h-4" /> Derivar a comprador
            </button>
          )}

          {canVerifyOCref && (
            <>
              <button onClick={() => setModal('bounceToBuyer')} className="h-10 px-4 border border-orange-300 text-orange-700 rounded-md text-sm font-medium hover:bg-orange-50">
                Enviar a comprador para revisión
              </button>
              <button
                onClick={() => commit(
                  i => addHistory({ ...i, status: 'approved' }, 'Aprobada (OC ref. verificada por admin)'),
                  'Factura aprobada'
                )}
                className="h-10 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprobar
              </button>
            </>
          )}

          {canReviewOC && (
            <>
              <button onClick={() => setModal('bounce')} className="h-10 px-4 border border-orange-300 text-orange-700 rounded-md text-sm font-medium hover:bg-orange-50 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Devolver a compras
              </button>
              <button
                onClick={() => commit(
                  i => addHistory({ ...i, status: 'approved' }, 'OC aprobada por admin', `OC: ${i.purchaseOrder?.number || '—'}`),
                  'OC aprobada — incidente cerrado'
                )}
                className="h-10 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprobar OC
              </button>
            </>
          )}

          {canBuyerAct && (
            <>
              <button onClick={() => setModal('reject')} className="h-10 px-4 border border-rose-300 text-rose-700 rounded-md text-sm font-medium hover:bg-rose-50 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Rechazar factura
              </button>
              <button onClick={() => setModal('createOC')} className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4" /> {inv.status === 'bounced' ? 'Corregir OC' : 'Generar OC'}
              </button>
            </>
          )}

          {canLoadSystem && (
            <button onClick={() => setModal('loadSystem')} className="h-10 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
              <Database className="w-4 h-4" /> Marcar como cargada en sistema
            </button>
          )}
        </div>
      </div>

      {/* Modales */}
      {modal === 'derive' && (
        <Modal title="Derivar factura a comprador" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium mb-2">Comprador</label>
          <select value={selectedBuyer} onChange={e => setSelectedBuyer(e.target.value)} className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm mb-4">
            <option value="">Elegir...</option>
            {buyers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label className="block text-sm font-medium mb-2">Nota (opcional)</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4" placeholder="Instrucciones para el comprador..." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!selectedBuyer}
              onClick={() => commit(
                i => addHistory({ ...i, status: 'assigned', assignedTo: selectedBuyer }, `Derivada a ${selectedBuyer}`, text),
                `Factura derivada a ${selectedBuyer}`
              )}
              className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Derivar</button>
          </div>
        </Modal>
      )}

      {modal === 'bounceToBuyer' && (
        <Modal title="Enviar a comprador para revisar OC referenciada" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium mb-2">Comprador</label>
          <select value={selectedBuyer} onChange={e => setSelectedBuyer(e.target.value)} className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm mb-4">
            <option value="">Elegir...</option>
            {buyers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label className="block text-sm font-medium mb-2">Motivo / consulta</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4" placeholder="Ej: la OC A-123 no coincide con los valores de la factura, revisar..." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!selectedBuyer || !text.trim()}
              onClick={() => commit(
                i => addHistory({ ...i, status: 'bounced', assignedTo: selectedBuyer, bounceReason: text }, `Enviada a ${selectedBuyer} para revisión`, text),
                'Enviada a comprador'
              )}
              className="h-10 px-4 bg-orange-600 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Enviar</button>
          </div>
        </Modal>
      )}

      {modal === 'bounce' && (
        <Modal title="Devolver a compras" onClose={() => setModal(null)}>
          <label className="block text-sm font-medium mb-2">Motivo</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4" placeholder="Explicá por qué devolvés esta OC..." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!text.trim()}
              onClick={() => commit(
                i => addHistory({ ...i, status: 'bounced', bounceReason: text }, `Devuelta a ${i.assignedTo}`, text),
                'Devuelta a compras'
              )}
              className="h-10 px-4 bg-orange-600 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Devolver</button>
          </div>
        </Modal>
      )}

      {modal === 'createOC' && (
        <Modal title={inv.status === 'bounced' ? 'Corregir OC' : 'Generar OC'} onClose={() => setModal(null)}>
          <label className="block text-sm font-medium mb-2">Número de OC</label>
          <input value={ocNumber} onChange={e => setOcNumber(e.target.value)} placeholder="OC-2026-00123" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm font-mono mb-4" />
          <label className="block text-sm font-medium mb-2">Notas / detalle (opcional)</label>
          <textarea value={ocNotes} onChange={e => setOcNotes(e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4" placeholder="Detalle de ítems, condiciones, etc." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!ocNumber.trim()}
              onClick={() => commit(
                i => addHistory({
                  ...i, status: 'oc_generated',
                  purchaseOrder: { number: ocNumber.trim(), notes: ocNotes, createdBy: currentUser, createdAt: new Date().toISOString() },
                  bounceReason: ''
                }, i.status === 'bounced' ? 'OC corregida y reenviada' : 'OC generada', `OC ${ocNumber.trim()}`),
                'OC enviada a admin para aprobar'
              )}
              className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Enviar a admin</button>
          </div>
        </Modal>
      )}

      {modal === 'reject' && (
        <Modal title="Rechazar factura" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Este rechazo va a quedar registrado y visible para administración/finanzas. Explicá por qué la factura no es válida.
          </p>
          <label className="block text-sm font-medium mb-2">Motivo del rechazo</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4" placeholder="Ej: el proveedor no está registrado, los ítems no corresponden a esta obra, valores no coinciden con lo pactado..." />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!text.trim()}
              onClick={() => commit(
                i => addHistory({ ...i, status: 'rejected', rejectionReason: text }, 'Factura rechazada por comprador', text),
                'Factura rechazada'
              )}
              className="h-10 px-4 bg-rose-600 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Rechazar factura</button>
          </div>
        </Modal>
      )}

      {modal === 'loadSystem' && (
        <Modal title="Marcar como cargada en sistema" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Confirmá que esta factura ya fue cargada en Tango (u otro sistema).
            Podés dejar una referencia opcional (número de asiento, comprobante, etc.).
          </p>
          <label className="block text-sm font-medium mb-2">Referencia (opcional)</label>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Ej: Asiento 4587, o Comp. TG-2026-3421" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              onClick={() => commit(
                i => addHistory({
                  ...i,
                  loadedInSystem: true,
                  loadedBy: currentUser,
                  loadedAt: new Date().toISOString(),
                  systemLoadRef: text.trim() || null
                }, 'Cargada en sistema', text.trim() ? `Ref: ${text.trim()}` : ''),
                'Factura marcada como cargada'
              )}
              className="h-10 px-4 bg-emerald-600 text-white rounded-md text-sm font-medium"
            >Confirmar carga</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = 'Eliminar', danger = true, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-700 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 text-sm">Cancelar</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`h-10 px-4 text-white rounded-md text-sm font-medium ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >{confirmLabel}</button>
      </div>
    </Modal>
  );
}

// ============================================================================
// INCIDENTES PANEL
// ============================================================================

function IncidentesPanel({ abiertos, resueltos, rechazadas, onOpen, onDelete }) {
  const [tab, setTab] = useState('abiertos');
  const data = tab === 'abiertos' ? abiertos : tab === 'resueltos' ? resueltos : rechazadas;

  const stats = [
    { label: 'Abiertos', value: abiertos.length, cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    { label: 'Resueltos', value: resueltos.length, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { label: 'Rechazados', value: rechazadas.length, cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  ];

  return (
    <TabWrap title="Panel de incidentes" subtitle="Registro completo de facturas y su ciclo de vida.">
      <div className="grid grid-cols-3 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className={`border rounded-lg p-4 ${s.cls}`}>
            <div className="text-xs uppercase tracking-wide font-medium">{s.label}</div>
            <div className="text-3xl font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {[
          { id: 'abiertos', label: `Abiertos (${abiertos.length})` },
          { id: 'resueltos', label: `Resueltos (${resueltos.length})` },
          { id: 'rechazados', label: `Rechazados (${rechazadas.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 h-9 text-sm font-medium border-b-2 -mb-px ${
            tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>{t.label}</button>
        ))}
      </div>

      {data.length === 0
        ? <EmptyState msg="No hay incidentes en esta categoría." />
        : <InvoiceTable invoices={data} onOpen={onOpen} showOC showBounceReason />
      }
    </TabWrap>
  );
}

// ============================================================================
// APRENDIZAJE PANEL — buzón de conceptos a clasificar
// ============================================================================

function AprendizajePanel({ unclassified, conceptDict, setConceptDict, onOpen, currentUser, invoices, onUpdateInvoice }) {

  const handleClassify = async (concept, action) => {
    // 1. Sumar al diccionario aprendido (para futuras facturas)
    setConceptDict(dict => [...dict, {
      rawText: concept.texto,
      mappedTo: action.mappedTo,
      action: action.type,
      addedBy: currentUser,
      addedAt: new Date().toISOString()
    }]);

    // 2. Actualizar la factura actual: quitar el concepto y aplicar la acción
    const invoice = invoices.find(i => i.id === concept.invoiceId);
    if (!invoice) return;

    const remaining = (invoice.unclassifiedConcepts || []).filter(c =>
      !(c.texto === concept.texto && c.monto === concept.monto)
    );

    let updated = { ...invoice, unclassifiedConcepts: remaining };

    if (action.type === 'map' && action.mappedTo) {
      updated = {
        ...updated,
        ocrData: { ...updated.ocrData, [action.mappedTo]: concept.monto },
        fieldsEdited: { ...updated.fieldsEdited, [action.mappedTo]: true }
      };
    } else if (action.type === 'new' && action.mappedTo) {
      updated.customFields = [
        ...(updated.customFields || []),
        { name: action.mappedTo, amount: concept.monto }
      ];
    }
    // 'ignore' → solo se quitó de la lista, listo

    updated.history = [...(updated.history || []), {
      action: action.type === 'ignore'
        ? `Concepto "${concept.texto}" ignorado`
        : action.type === 'map'
          ? `Concepto "${concept.texto}" mapeado`
          : `Concepto "${concept.texto}" registrado como campo nuevo`,
      actor: currentUser,
      timestamp: new Date().toISOString(),
      note: action.mappedTo ? `→ ${action.mappedTo}` : ''
    }];

    await onUpdateInvoice(updated);
  };

  return (
    <TabWrap
      title="Conceptos a clasificar"
      subtitle="El OCR encontró estos conceptos en las facturas y no supo dónde encajarlos. Enseñale al sistema cómo tratarlos — se aplica a esta factura y a las que vengan."
    >
      {unclassified.length === 0
        ? <EmptyState msg="No hay conceptos pendientes de clasificar." />
        : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {unclassified.map((c, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.texto}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Monto: <span className="font-mono">{fmtMoney(c.monto)}</span> ·
                    Factura: <button onClick={() => onOpen(c.invoiceId)} className="underline hover:text-slate-900">{c.invoiceNumber || c.invoiceId.slice(0,6)}</button>
                  </div>
                </div>
                <ConceptActions
                  concept={c}
                  onSave={(action) => handleClassify(c, action)}
                />
              </div>
            ))}
          </div>
        )
      }

      {conceptDict.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Diccionario aprendido ({conceptDict.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Concepto detectado</th>
                  <th className="px-4 py-2 font-medium">Acción</th>
                  <th className="px-4 py-2 font-medium">Campo destino</th>
                  <th className="px-4 py-2 font-medium">Aprendido por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conceptDict.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{c.rawText}</td>
                    <td className="px-4 py-2 text-xs">
                      {c.action === 'map' && <span className="text-emerald-700">Mapear a campo</span>}
                      {c.action === 'new' && <span className="text-sky-700">Campo nuevo</span>}
                      {c.action === 'ignore' && <span className="text-slate-500">Ignorar</span>}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{c.mappedTo || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{c.addedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TabWrap>
  );
}

function ConceptActions({ concept, onSave }) {
  const [modal, setModal] = useState(null);
  const [selectedField, setSelectedField] = useState('');
  const [newFieldName, setNewFieldName] = useState('');

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => setModal('map')} className="h-8 px-3 border border-slate-300 rounded text-xs font-medium hover:bg-slate-50">Mapear</button>
        <button onClick={() => setModal('new')} className="h-8 px-3 border border-slate-300 rounded text-xs font-medium hover:bg-slate-50">Campo nuevo</button>
        <button onClick={() => onSave({ type: 'ignore', mappedTo: null })} className="h-8 px-3 text-xs font-medium text-slate-500 hover:text-slate-700">Ignorar</button>
      </div>

      {modal === 'map' && (
        <Modal title="Mapear a campo existente" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">Concepto: <strong>{concept.texto}</strong></p>
          <select value={selectedField} onChange={e => setSelectedField(e.target.value)} className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm mb-4">
            <option value="">Elegir campo...</option>
            {INVOICE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!selectedField}
              onClick={() => { onSave({ type: 'map', mappedTo: selectedField }); setModal(null); }}
              className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Guardar</button>
          </div>
        </Modal>
      )}

      {modal === 'new' && (
        <Modal title="Crear campo nuevo" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-3">Concepto: <strong>{concept.texto}</strong></p>
          <label className="block text-sm font-medium mb-2">Nombre del campo nuevo</label>
          <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Ej: Percepción SUSS" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm mb-4" />
          <p className="text-xs text-slate-500 mb-4">El campo se va a agregar al diccionario. En futuras facturas el OCR lo va a reconocer automáticamente.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="h-10 px-4 text-sm">Cancelar</button>
            <button
              disabled={!newFieldName.trim()}
              onClick={() => { onSave({ type: 'new', mappedTo: newFieldName.trim() }); setModal(null); }}
              className="h-10 px-4 bg-slate-900 text-white rounded-md text-sm font-medium disabled:bg-slate-300"
            >Crear campo</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// CONFIG PANEL — ABM de compradores y centros de costo
// ============================================================================

function ConfigPanel({ buyers, setBuyers, costCenters, setCostCenters, cards, setCards, showToast }) {
  const [newBuyer, setNewBuyer] = useState('');
  const [newCC, setNewCC] = useState('');
  const [newCCcat, setNewCCcat] = useState('general');
  const [newCard, setNewCard] = useState('');
  const [selectedCard, setSelectedCard] = useState(Object.keys(cards || {})[0] || '');
  const [newHolder, setNewHolder] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(null); // { title, message, onConfirm }

  const cardNames = Object.keys(cards || {});

  return (
    <TabWrap title="Configuración" subtitle="Gestionar compradores, centros de costo y tarjetas.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compradores */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm">Compradores ({buyers.length})</span>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-3">
              <input value={newBuyer} onChange={e => setNewBuyer(e.target.value)} placeholder="Nombre del comprador" className="flex-1 h-9 px-3 border border-slate-300 rounded text-sm" />
              <button
                onClick={() => {
                  if (newBuyer.trim()) {
                    setBuyers([...buyers, newBuyer.trim()]);
                    setNewBuyer('');
                    showToast('Comprador agregado', 'ok');
                  }
                }}
                className="h-9 px-3 bg-slate-900 text-white rounded text-sm font-medium flex items-center gap-1"
              ><Plus className="w-4 h-4" /> Agregar</button>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {buyers.map(b => (
                <div key={b} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                  <span>{b}</span>
                  <button
                    onClick={() => setPendingConfirm({
                      title: '¿Eliminar comprador?',
                      message: `Se va a eliminar a ${b} de la lista de compradores.`,
                      onConfirm: () => setBuyers(buyers.filter(x => x !== b))
                    })}
                    className="text-slate-400 hover:text-rose-600"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centros de costo */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm">Centros de costo ({costCenters.length})</span>
          </div>
          <div className="p-4">
            <div className="flex gap-2 mb-3">
              <input value={newCC} onChange={e => setNewCC(e.target.value)} placeholder="Nombre / código" className="flex-1 h-9 px-3 border border-slate-300 rounded text-sm" />
              <select value={newCCcat} onChange={e => setNewCCcat(e.target.value)} className="h-9 px-2 border border-slate-300 rounded text-sm bg-white">
                <option value="general">General</option>
                <option value="obra">Obra</option>
              </select>
              <button
                onClick={() => {
                  if (newCC.trim()) {
                    setCostCenters([...costCenters, { id: uid(), name: newCC.trim(), category: newCCcat }]);
                    setNewCC('');
                    showToast('Centro de costo agregado', 'ok');
                  }
                }}
                className="h-9 px-3 bg-slate-900 text-white rounded text-sm font-medium flex items-center gap-1"
              ><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {['general','obra'].map(cat => (
                <div key={cat}>
                  <div className="text-xs uppercase text-slate-400 tracking-wide mt-3 mb-1 first:mt-0">{cat === 'general' ? 'Generales' : 'Obras / Proyectos'}</div>
                  {costCenters.filter(c => c.category === cat).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                      <span>{c.name}</span>
                      <button
                        onClick={() => setPendingConfirm({
                          title: '¿Eliminar centro de costo?',
                          message: `Se va a eliminar el centro de costo "${c.name}".`,
                          onConfirm: () => setCostCenters(costCenters.filter(x => x.id !== c.id))
                        })}
                        className="text-slate-400 hover:text-rose-600"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjetas y titulares */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm">Tarjetas y titulares</span>
          </div>
          <div className="p-4">
            {/* Agregar tarjeta nueva */}
            <div className="flex gap-2 mb-4 pb-4 border-b border-slate-100">
              <input
                value={newCard}
                onChange={e => setNewCard(e.target.value)}
                placeholder="Nueva tarjeta (ej: Visa Nación)"
                className="flex-1 h-9 px-3 border border-slate-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  const name = newCard.trim();
                  if (!name) return;
                  if (cards[name]) { showToast('Esa tarjeta ya existe', 'err'); return; }
                  setCards({ ...cards, [name]: [] });
                  setSelectedCard(name);
                  setNewCard('');
                  showToast('Tarjeta agregada', 'ok');
                }}
                className="h-9 px-3 bg-slate-900 text-white rounded text-sm font-medium flex items-center gap-1"
              ><Plus className="w-4 h-4" /></button>
            </div>

            {/* Tabs de tarjetas */}
            <div className="flex flex-wrap gap-1 mb-3">
              {cardNames.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCard(c)}
                  className={`px-2.5 h-8 rounded text-xs font-medium border ${
                    selectedCard === c
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >{c}</button>
              ))}
            </div>

            {selectedCard && cards[selectedCard] && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-500">
                    {cards[selectedCard].length} titular{cards[selectedCard].length !== 1 ? 'es' : ''}
                  </div>
                  <button
                    onClick={() => setPendingConfirm({
                      title: '¿Eliminar tarjeta?',
                      message: `Se va a eliminar la tarjeta ${selectedCard} y sus ${cards[selectedCard].length} titular${cards[selectedCard].length !== 1 ? 'es' : ''}.`,
                      onConfirm: () => {
                        const { [selectedCard]: _, ...rest } = cards;
                        setCards(rest);
                        setSelectedCard(Object.keys(rest)[0] || '');
                      }
                    })}
                    className="text-xs text-rose-600 hover:underline"
                  >Eliminar tarjeta</button>
                </div>

                {/* Agregar titular */}
                <div className="flex gap-2 mb-2">
                  <input
                    value={newHolder}
                    onChange={e => setNewHolder(e.target.value)}
                    placeholder="Nombre del titular"
                    className="flex-1 h-9 px-3 border border-slate-300 rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      const name = newHolder.trim();
                      if (!name) return;
                      if (cards[selectedCard].includes(name)) { showToast('Ese titular ya está', 'err'); return; }
                      setCards({ ...cards, [selectedCard]: [...cards[selectedCard], name] });
                      setNewHolder('');
                    }}
                    className="h-9 px-3 bg-slate-900 text-white rounded text-sm font-medium flex items-center gap-1"
                  ><Plus className="w-4 h-4" /></button>
                </div>

                {/* Lista de titulares */}
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {cards[selectedCard].map(h => (
                    <div key={h} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50">
                      <span>{h}</span>
                      <button
                        onClick={() => setPendingConfirm({
                          title: '¿Sacar titular?',
                          message: `${h} dejará de ser titular de ${selectedCard}.`,
                          confirmLabel: 'Sacar titular',
                          onConfirm: () => setCards({ ...cards, [selectedCard]: cards[selectedCard].filter(x => x !== h) })
                        })}
                        className="text-slate-400 hover:text-rose-600"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingConfirm && (
        <ConfirmModal
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          confirmLabel={pendingConfirm.confirmLabel || 'Eliminar'}
          onConfirm={pendingConfirm.onConfirm}
          onClose={() => setPendingConfirm(null)}
        />
      )}
    </TabWrap>
  );
}

function formatDuration(hours) {
  if (!isFinite(hours) || hours < 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hs`;
  const days = hours / 24;
  return `${days.toFixed(1)} días`;
}

// Calcula tiempo promedio de respuesta por comprador
// (desde que la factura le fue asignada hasta que generó la OC)
function computeBuyerResponseTimes(invoices) {
  const times = {};
  invoices.forEach(inv => {
    const history = inv.history || [];
    if (!inv.assignedTo) return;
    // Buscar la última asignación al comprador
    const assignedEntry = [...history].reverse().find(h =>
      (h.action?.startsWith('Derivada') || h.action?.startsWith('Enviada a')) && h.note !== undefined
    );
    // Buscar la generación de OC posterior
    const generatedEntry = [...history].reverse().find(h =>
      h.action?.includes('OC generada') || h.action?.includes('OC corregida')
    );
    if (assignedEntry && generatedEntry) {
      const t1 = new Date(assignedEntry.timestamp).getTime();
      const t2 = new Date(generatedEntry.timestamp).getTime();
      if (t2 > t1) {
        const hours = (t2 - t1) / (1000 * 60 * 60);
        if (!times[inv.assignedTo]) times[inv.assignedTo] = [];
        times[inv.assignedTo].push(hours);
      }
    }
  });
  return Object.entries(times).map(([buyer, hoursList]) => ({
    buyer,
    count: hoursList.length,
    avgHours: hoursList.reduce((a, b) => a + b, 0) / hoursList.length,
    maxHours: Math.max(...hoursList)
  })).sort((a, b) => a.avgHours - b.avgHours);
}

function TableroPanel({ invoices }) {
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  // --- Cálculos ---
  const openStates = ['in_intake', 'assigned', 'admin_verify', 'oc_generated', 'bounced'];
  const abiertos = invoices.filter(i => openStates.includes(i.status));
  const resueltosMes = invoices.filter(i => {
    if (i.status !== 'approved') return false;
    const last = i.history?.slice(-1)[0];
    return last && new Date(last.timestamp) >= monthStart;
  });
  const rechazados = invoices.filter(i => i.status === 'rejected');

  // Tiempo promedio de resolución (desde carga hasta aprobación)
  const approvedInvoices = invoices.filter(i => i.status === 'approved');
  const resolutionHours = approvedInvoices.map(i => {
    const upload = new Date(i.uploadedAt).getTime();
    const closed = new Date(i.history?.slice(-1)[0]?.timestamp || i.uploadedAt).getTime();
    return (closed - upload) / (1000 * 60 * 60);
  });
  const avgResolution = resolutionHours.length
    ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
    : 0;

  // Monto total procesado (aprobado)
  const totalAprobadoARS = approvedInvoices
    .filter(i => (i.ocrData?.moneda || 'ARS') === 'ARS')
    .reduce((sum, i) => sum + (Number(i.ocrData?.total) || 0), 0);
  const totalAprobadoUSD = approvedInvoices
    .filter(i => i.ocrData?.moneda === 'USD')
    .reduce((sum, i) => sum + (Number(i.ocrData?.total) || 0), 0);

  // Tiempo por comprador
  const buyerTimes = computeBuyerResponseTimes(invoices);

  // Distribución por centro de costo
  const byCostCenter = {};
  invoices.forEach(i => {
    if (!i.costCenter) return;
    byCostCenter[i.costCenter] = (byCostCenter[i.costCenter] || 0) + 1;
  });
  const costCenterList = Object.entries(byCostCenter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const ccMax = costCenterList[0]?.[1] || 1;

  // Aging: facturas abiertas hace más de 3 días
  const aging = abiertos
    .map(i => ({
      ...i,
      daysOpen: Math.floor((now - new Date(i.uploadedAt).getTime()) / (1000 * 60 * 60 * 24))
    }))
    .filter(i => i.daysOpen > 3)
    .sort((a, b) => b.daysOpen - a.daysOpen)
    .slice(0, 10);

  // Distribución por estado
  const byStatus = {};
  invoices.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });

  // Tarjeta de crédito
  const conTarjeta = invoices.filter(i => i.paymentMethod === 'credit_card');
  const conTarjetaDebitoDistinto = conTarjeta.filter(i => i.cardDebitAmount != null);
  const pendientesCarga = invoices.filter(i => i.status === 'approved' && !i.loadedInSystem);
  const pendientesCargaTCEF_t = pendientesCarga.filter(i => i.paymentMethod === 'cash' || i.paymentMethod === 'credit_card').length;
  const pendientesCargaResto_t = pendientesCarga.length - pendientesCargaTCEF_t;

  return (
    <TabWrap title="Tablero de control" subtitle="Indicadores para hacer seguimiento del proceso.">

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Casos abiertos" value={abiertos.length} icon={Inbox} accent="amber" />
        <KpiCard label="Resueltos este mes" value={resueltosMes.length} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="Rechazados (total)" value={rechazados.length} icon={XCircle} accent="rose" />
        <KpiCard label="Tiempo prom. resolución" value={approvedInvoices.length ? formatDuration(avgResolution) : '—'} icon={Clock} accent="slate" />
      </div>

      {/* Segunda fila: montos + tarjeta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Monto aprobado (ARS)</div>
          <div className="text-2xl font-semibold mt-2 font-mono">{fmtMoney(totalAprobadoARS, 'ARS')}</div>
          <div className="text-xs text-slate-500 mt-1">{approvedInvoices.filter(i => (i.ocrData?.moneda||'ARS')==='ARS').length} facturas</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Monto aprobado (USD)</div>
          <div className="text-2xl font-semibold mt-2 font-mono">{fmtMoney(totalAprobadoUSD, 'USD')}</div>
          <div className="text-xs text-slate-500 mt-1">{approvedInvoices.filter(i => i.ocrData?.moneda==='USD').length} facturas</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Pagos con tarjeta
          </div>
          <div className="text-2xl font-semibold mt-2">{conTarjeta.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {conTarjetaDebitoDistinto.length} con débito distinto al importe de la factura
          </div>
        </div>
      </div>

      {/* Fila: pendientes de carga en sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Pendientes de carga — TC/Ef
          </div>
          <div className="text-2xl font-semibold mt-2">{pendientesCargaTCEF_t}</div>
          <div className="text-xs text-slate-500 mt-1">Responsable: Santiago Tesouro</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Pendientes de carga — Resto
          </div>
          <div className="text-2xl font-semibold mt-2">{pendientesCargaResto_t}</div>
          <div className="text-xs text-slate-500 mt-1">Responsable: Valentina Quiencke</div>
        </div>
      </div>

      {/* Tiempo por comprador + distribución por CC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Tiempo de respuesta por comprador
          </div>
          <div className="p-4">
            {buyerTimes.length === 0 ? (
              <div className="text-sm text-slate-500">Sin datos aún — nadie generó una OC todavía.</div>
            ) : (
              <div className="space-y-3">
                {buyerTimes.map(b => (
                  <div key={b.buyer} className="flex justify-between items-baseline text-sm">
                    <div>
                      <div className="font-medium">{b.buyer}</div>
                      <div className="text-xs text-slate-500">
                        {b.count} OC{b.count !== 1 ? 's' : ''} generada{b.count !== 1 ? 's' : ''} · máx {formatDuration(b.maxHours)}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{formatDuration(b.avgHours)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Facturas por centro de costo
          </div>
          <div className="p-4">
            {costCenterList.length === 0 ? (
              <div className="text-sm text-slate-500">Sin facturas cargadas.</div>
            ) : (
              <div className="space-y-2">
                {costCenterList.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate mr-2">{name}</span>
                      <span className="font-mono text-xs text-slate-500 flex-shrink-0">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: `${(count/ccMax)*100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aging */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Facturas abiertas hace más de 3 días
        </div>
        <div className="p-0">
          {aging.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No hay facturas atrasadas.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Días</th>
                  <th className="px-4 py-2 font-medium">Proveedor</th>
                  <th className="px-4 py-2 font-medium">Nº</th>
                  <th className="px-4 py-2 font-medium">Centro costo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Con</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aging.map(i => (
                  <tr key={i.id}>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                        i.daysOpen > 7 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>{i.daysOpen}d</span>
                    </td>
                    <td className="px-4 py-2 truncate max-w-xs">{i.ocrData?.razonSocial || <span className="text-slate-400 italic">Sin identificar</span>}</td>
                    <td className="px-4 py-2 font-mono text-xs">{i.ocrData?.nroComprobante || '—'}</td>
                    <td className="px-4 py-2 text-xs">{i.costCenter}</td>
                    <td className="px-4 py-2"><StatusPill status={i.status} /></td>
                    <td className="px-4 py-2 text-xs">{i.assignedTo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </TabWrap>
  );
}

function KpiCard({ label, value, icon: Icon, accent }) {
  const iconColor = {
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    slate: 'text-slate-500',
  }[accent] || 'text-slate-500';
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-3xl font-semibold mt-2 tracking-tight">{value}</div>
    </div>
  );
}

// ============================================================================
// PAGOS PANEL — repositorio por canal (efectivo / tarjeta), con conciliación
// ============================================================================

function PagosPanel({ invoices, cards, onOpen }) {
  const cardNames = Object.keys(cards || {});
  const [channel, setChannel] = useState('cash'); // 'cash' | <cardName>
  const [holderFilter, setHolderFilter] = useState('all');

  // Contadores por canal
  const cashCount = invoices.filter(i => i.paymentMethod === 'cash').length;
  const cardCounts = {};
  cardNames.forEach(c => {
    cardCounts[c] = invoices.filter(i => i.paymentMethod === 'credit_card' && i.cardBank === c).length;
  });

  // Filtrar por canal
  const filtered = invoices.filter(i => {
    if (channel === 'cash') return i.paymentMethod === 'cash';
    return i.paymentMethod === 'credit_card' && i.cardBank === channel;
  });

  // Titulares únicos del canal actual
  const holdersInChannel = channel === 'cash'
    ? []
    : [...new Set(filtered.map(i => i.cardHolder).filter(Boolean))].sort();

  // Aplicar filtro de titular
  const visible = filtered.filter(i => {
    if (channel === 'cash') return true;
    if (holderFilter === 'all') return true;
    return i.cardHolder === holderFilter;
  });

  // Totales por titular para conciliar con resumen
  const totalsByHolder = {};
  if (channel !== 'cash') {
    filtered.forEach(i => {
      const holder = i.cardHolder || 'Sin titular';
      const currency = i.ocrData?.moneda || 'ARS';
      const key = `${holder}|${currency}`;
      const amount = i.cardDebitAmount != null ? i.cardDebitAmount : (Number(i.ocrData?.total) || 0);
      if (!totalsByHolder[key]) totalsByHolder[key] = { holder, currency, total: 0, count: 0 };
      totalsByHolder[key].total += amount;
      totalsByHolder[key].count += 1;
    });
  }
  const holderTotals = Object.values(totalsByHolder).sort((a, b) => b.total - a.total);

  // Total general del canal (visible)
  const visibleTotal = visible.reduce((sum, i) => {
    const amount = i.cardDebitAmount != null ? i.cardDebitAmount : (Number(i.ocrData?.total) || 0);
    return sum + amount;
  }, 0);
  const mainCurrency = visible[0]?.ocrData?.moneda || 'ARS';

  return (
    <TabWrap
      title="Pagos"
      subtitle="Repositorio de facturas por canal de pago. Filtrá por tarjeta y titular para conciliar contra los resúmenes."
    >

      {/* Selector de canal */}
      <div className="flex flex-wrap gap-2 mb-5">
        <ChannelButton
          active={channel === 'cash'}
          onClick={() => { setChannel('cash'); setHolderFilter('all'); }}
          icon={Banknote}
          label="Efectivo"
          count={cashCount}
        />
        {cardNames.map(c => (
          <ChannelButton
            key={c}
            active={channel === c}
            onClick={() => { setChannel(c); setHolderFilter('all'); }}
            icon={CreditCard}
            label={c}
            count={cardCounts[c]}
          />
        ))}
      </div>

      {/* Totales por titular (solo para tarjeta) */}
      {channel !== 'cash' && holderTotals.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg mb-5">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Totales por titular en {channel}
            <span className="text-xs font-normal text-slate-500 ml-2">
              (para conciliar contra el resumen)
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Titular</th>
                <th className="px-4 py-2 font-medium text-right">Facturas</th>
                <th className="px-4 py-2 font-medium text-right">Total a debitar</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holderTotals.map(t => (
                <tr key={`${t.holder}-${t.currency}`}
                    className={`hover:bg-slate-50 cursor-pointer ${holderFilter === t.holder ? 'bg-slate-50' : ''}`}
                    onClick={() => setHolderFilter(holderFilter === t.holder ? 'all' : t.holder)}>
                  <td className="px-4 py-2 font-medium">{t.holder}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{t.count}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{fmtMoney(t.total, t.currency)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {holderFilter === t.holder ? '✓ filtrado' : 'ver solo'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtro extra por titular si están viendo todos */}
      {channel !== 'cash' && holdersInChannel.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-slate-600">Filtro por titular:</label>
          <select
            value={holderFilter}
            onChange={e => setHolderFilter(e.target.value)}
            className="h-9 px-3 border border-slate-300 rounded-md bg-white text-sm"
          >
            <option value="all">Todos ({filtered.length})</option>
            {holdersInChannel.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          {holderFilter !== 'all' && (
            <button onClick={() => setHolderFilter('all')} className="text-xs text-slate-500 hover:text-slate-700 underline">
              limpiar
            </button>
          )}
        </div>
      )}

      {/* Lista de facturas */}
      {visible.length === 0 ? (
        <EmptyState msg={`No hay facturas en este canal${holderFilter !== 'all' ? ' para este titular' : ''}.`} />
      ) : (
        <div>
          <div className="mb-2 text-sm text-slate-600 flex justify-between">
            <span>{visible.length} factura{visible.length !== 1 ? 's' : ''}</span>
            <span>Total: <span className="font-mono font-semibold text-slate-900">{fmtMoney(visibleTotal, mainCurrency)}</span></span>
          </div>
          <InvoiceTable invoices={visible} onOpen={onOpen} showOC />
        </div>
      )}

    </TabWrap>
  );
}

function ChannelButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white border-slate-300 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
      }`}>{count}</span>
    </button>
  );
}

// ============================================================================
// CARGA EN SISTEMA PANEL — buzón para responsables (Santiago / Valentina)
// ============================================================================

function CargaEnSistemaPanel({ titulo, subtitulo, responsable, invoices, onOpen }) {
  const totalARS = invoices
    .filter(i => (i.ocrData?.moneda || 'ARS') === 'ARS')
    .reduce((s, i) => s + (Number(i.ocrData?.total) || 0), 0);
  const totalUSD = invoices
    .filter(i => i.ocrData?.moneda === 'USD')
    .reduce((s, i) => s + (Number(i.ocrData?.total) || 0), 0);

  return (
    <TabWrap title={titulo} subtitle={subtitulo}>
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 mb-5 flex items-center gap-3">
        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="text-sm">
          <span className="text-slate-600">Responsable de esta bandeja: </span>
          <span className="font-semibold">{responsable}</span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState msg="No hay facturas pendientes de cargar en sistema." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Pendientes</div>
              <div className="text-2xl font-semibold mt-1">{invoices.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total (ARS)</div>
              <div className="text-2xl font-semibold mt-1 font-mono">{fmtMoney(totalARS, 'ARS')}</div>
            </div>
            {totalUSD > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Total (USD)</div>
                <div className="text-2xl font-semibold mt-1 font-mono">{fmtMoney(totalUSD, 'USD')}</div>
              </div>
            )}
          </div>
          <InvoiceTable invoices={invoices} onOpen={onOpen} />
        </>
      )}
    </TabWrap>
  );
}

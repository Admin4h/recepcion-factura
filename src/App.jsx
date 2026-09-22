import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useSession, useProfile } from './lib/auth';
import { useInvoices, useCostCenters, useProfiles, uploadInvoicePhoto, fileToBase64, runOCR, logEvent } from './lib/db';
import { Login } from './components/Login';
import { InvoiceForm, money } from './components/InvoiceForm';

function Loading() {
  return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
}

export default function App() {
  const { session, loading: sl } = useSession();
  const { profile, roles, loading: pl } = useProfile(session);
  if (sl) return <Loading />;
  if (!session) return <Login />;
  if (pl || !profile) return <Loading />;
  return <MainApp profile={profile} roles={roles} />;
}

function MainApp({ profile, roles }) {
  const isAdmin = roles.includes('administracion');
  const isBuyer = roles.includes('comprador');
  const isCargador = roles.includes('cargador');
  const tabs = [];
  if (isCargador) tabs.push({ id: 'cargador', label: 'Cargador' });
  if (isBuyer || isAdmin) tabs.push({ id: 'comprador', label: 'Comprador' });
  if (isAdmin) tabs.push({ id: 'admin', label: 'Administracion' });
  const [tab, setTab] = useState(tabs[0]?.id || 'cargador');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-3 flex-wrap">
          <div className="font-bold text-slate-900">Recepcion de Facturas <span className="text-slate-400 font-normal text-sm">- ETEC</span></div>
          <nav className="flex gap-1 flex-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
            ))}
          </nav>
          <div className="text-sm text-slate-600">{profile.nombre}</div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-500 hover:text-slate-900">Salir</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        {tab === 'cargador' && <CargadorPane profile={profile} roles={roles} />}
        {tab === 'comprador' && <CompradorPane profile={profile} roles={roles} />}
        {tab === 'admin' && <AdminPane profile={profile} roles={roles} />}
      </main>
    </div>
  );
}

function CargadorPane({ profile, roles }) {
  const { rows: costCenters } = useCostCenters();
  const { rows: myInvoices, reload } = useInvoices({ uploader_id: profile.id });
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador') || (b.user_roles || []).some(r => r.role === 'administracion'));
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      <UploadForm profile={profile} costCenters={costCenters} onDone={reload} />
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Mis facturas</h2>
        <InvoiceList rows={myInvoices} onOpen={setSelected} />
      </section>
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={profile} roles={roles} onSave={() => { reload(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CompradorPane({ profile, roles }) {
  const { rows: costCenters } = useCostCenters();
  const { rows: assigned, reload: reloadAssigned } = useInvoices({ buyer_id: profile.id });
  const { rows: buzon, reload: reloadBuzon } = useInvoices({ state: 'en_buzon' });
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador') || (b.user_roles || []).some(r => r.role === 'administracion'));
  const [selected, setSelected] = useState(null);

  const reloadAll = () => { reloadAssigned(); reloadBuzon(); };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Buzon general</h2>
        <InvoiceList rows={buzon} onOpen={setSelected} />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Asignadas a mi</h2>
        <InvoiceList rows={assigned.filter(i => i.state === 'con_comprador')} onOpen={setSelected} />
      </section>
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={profile} roles={roles} onSave={() => { reloadAll(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AdminPane({ profile, roles }) {
  const [sub, setSub] = useState('facturas');
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['facturas','Facturas'],['usuarios','Usuarios'],['centros','Centros de costo']].map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sub === k ? 'bg-slate-900 text-white' : 'bg-white border text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {sub === 'facturas' && <AdminFacturas profile={profile} roles={roles} />}
      {sub === 'usuarios' && <AdminUsuarios profile={profile} />}
      {sub === 'centros' && <AdminCentros />}
    </div>
  );
}

function AdminFacturas({ profile, roles }) {
  const { rows: costCenters } = useCostCenters();
  const { rows: all, reload } = useInvoices();
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador') || (b.user_roles || []).some(r => r.role === 'administracion'));
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('todas');
  const filtered = filter === 'todas' ? all : all.filter(i => i.state === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[['todas','Todas'],['en_buzon','En buzon'],['con_comprador','Con comprador'],['con_admin','Con admin'],['aprobada','Aprobadas'],['rechazada','Rechazadas']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded text-xs ${filter === k ? 'bg-slate-800 text-white' : 'bg-white border'}`}>{l}</button>
        ))}
      </div>
      <InvoiceList rows={filtered} onOpen={setSelected} showState />
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={profile} roles={roles} onSave={() => { reload(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AdminUsuarios({ profile }) {
  const { rows: users, reload } = useProfiles();
  const ALL_ROLES = ['cargador', 'comprador', 'administracion'];

  async function toggleRole(userId, role, currentlyHas) {
    if (currentlyHas) {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role });
    }
    reload();
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Nombre</th><th className="text-left px-4 py-2">Email</th><th className="px-4 py-2">Cargador</th><th className="px-4 py-2">Comprador</th><th className="px-4 py-2">Admin</th></tr></thead>
        <tbody>
          {users.map(u => {
            const rs = (u.user_roles || []).map(r => r.role);
            return (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.nombre}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                {ALL_ROLES.map(role => (
                  <td key={role} className="px-4 py-2 text-center">
                    <input type="checkbox" checked={rs.includes(role)} onChange={() => toggleRole(u.id, role, rs.includes(role))} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdminCentros() {
  const { rows, reload } = useCostCenters();
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  async function add(e) {
    e.preventDefault();
    await supabase.from('cost_centers').insert({ codigo, nombre });
    setCodigo(''); setNombre(''); reload();
  }
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="bg-white rounded-xl border p-4 flex gap-2 items-end">
        <div><label className="text-xs text-slate-500">Codigo</label><input value={codigo} onChange={e => setCodigo(e.target.value)} required className="block border rounded px-2 py-1" /></div>
        <div className="flex-1"><label className="text-xs text-slate-500">Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} required className="block w-full border rounded px-2 py-1" /></div>
        <button className="px-4 py-1.5 bg-slate-900 text-white rounded">Agregar</button>
      </form>
      <div className="bg-white rounded-xl border">
        {rows.map(cc => <div key={cc.id} className="px-4 py-2 border-t first:border-t-0 flex justify-between"><span><b>{cc.codigo}</b> - {cc.nombre}</span></div>)}
      </div>
    </div>
  );
}

function InvoiceList({ rows, onOpen, showState }) {
  if (!rows.length) return <div className="bg-white rounded-xl border p-6 text-center text-slate-400 text-sm">Sin facturas</div>;
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-left">Comprobante</th><th className="px-3 py-2 text-right">Total</th>{showState && <th className="px-3 py-2">Estado</th>}<th className="px-3 py-2"></th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t hover:bg-slate-50">
              <td className="px-3 py-2 text-slate-600">{r.fecha_emision || r.fecha_gasto || '-'}</td>
              <td className="px-3 py-2 font-medium">{r.razon_social || r.concepto || '-'}</td>
              <td className="px-3 py-2 text-slate-600">{r.tipo_comprobante ? r.tipo_comprobante + ' ' : ''}{r.nro_comprobante || '-'}</td>
              <td className="px-3 py-2 text-right font-mono">{money(r.total, r.moneda)}</td>
              {showState && <td className="px-3 py-2 text-xs text-center"><StateBadge state={r.state} /></td>}
              <td className="px-3 py-2 text-right"><button onClick={() => onOpen(r)} className="text-indigo-600 hover:underline text-xs">Abrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateBadge({ state }) {
  const colors = {
    en_buzon: 'bg-amber-100 text-amber-800',
    con_comprador: 'bg-indigo-100 text-indigo-800',
    con_admin: 'bg-blue-100 text-blue-800',
    aprobada: 'bg-emerald-100 text-emerald-800',
    rechazada: 'bg-rose-100 text-rose-800',
  };
  return <span className={`px-2 py-0.5 rounded ${colors[state] || 'bg-slate-100'}`}>{state}</span>;
}

function UploadForm({ profile, costCenters, onDone }) {
  const [file, setFile] = useState(null);
  const [ccId, setCcId] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [tipoCarga, setTipoCarga] = useState('factura');
  const [concepto, setConcepto] = useState('');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file && tipoCarga === 'factura') { alert('Sube una foto de la factura'); return; }
    if (!ccId) { alert('Elegi centro de costo'); return; }
    setBusy(true);
    try {
      let photo_path = null;
      let ocrFields = {};
      if (file) {
        setStatus('Subiendo foto...');
        photo_path = await uploadInvoicePhoto(file, profile.id);
        if (tipoCarga === 'factura') {
          setStatus('Leyendo con OCR...');
          const b64 = await fileToBase64(file);
          try {
            const d = await runOCR(b64, file.type || 'image/jpeg');
            ocrFields = {
              tipo_comprobante: d.tipoComprobante || null,
              nro_comprobante: d.nroComprobante || null,
              razon_social: d.razonSocial || null,
              cuit: d.cuit || null,
              fecha_emision: d.fechaEmision || null,
              moneda: d.moneda || 'ARS',
              tipo_cambio: d.tipoCambio || null,
              subtotal_gravado: d.subtotalGravado || null,
              no_gravado: d.noGravado || null,
              iva: d.iva || null,
              percepcion_iva: d.percepcionIva || null,
              iibb_bsas: d.iibbBsAs || null,
              iibb_caba: d.iibbCaba || null,
              total: d.total || null,
              cae: d.cae || null,
              cai: d.cai || null,
            };
          } catch (err) { console.warn('OCR fail', err); }
        }
      }
      setStatus('Guardando...');
      const payload = {
        tipo_carga: tipoCarga,
        cost_center_id: ccId,
        forma_pago: formaPago,
        photo_path,
        uploader_id: profile.id,
        state: 'en_buzon',
        ...ocrFields,
      };
      if (tipoCarga === 'gasto_sin_factura') {
        payload.concepto = concepto;
        payload.total = total || null;
        payload.fecha_gasto = new Date().toISOString().slice(0,10);
      }
      const { data, error } = await supabase.from('invoices').insert(payload).select().single();
      if (error) throw error;
      await logEvent(data.id, profile.id, 'uploaded', null);
      setStatus('Listo!');
      setFile(null); setConcepto(''); setTotal(''); setCcId('');
      onDone();
      setTimeout(() => setStatus(''), 2000);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Subir factura</h2>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTipoCarga('factura')} className={`px-3 py-1.5 rounded text-sm ${tipoCarga === 'factura' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Con factura A/C</button>
        <button type="button" onClick={() => setTipoCarga('gasto_sin_factura')} className={`px-3 py-1.5 rounded text-sm ${tipoCarga === 'gasto_sin_factura' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>Sin factura</button>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Foto {tipoCarga === 'gasto_sin_factura' && '(opcional)'}</label>
        <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0])} className="block w-full text-sm" />
      </div>
      {tipoCarga === 'gasto_sin_factura' && (
        <>
          <div><label className="block text-sm font-medium mb-1">Concepto</label><input required value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Ej: Suscripcion Adobe" /></div>
          <div><label className="block text-sm font-medium mb-1">Monto</label><input type="number" step="0.01" value={total} onChange={e => setTotal(e.target.value)} className="w-full border rounded px-2 py-1" /></div>
        </>
      )}
      <div><label className="block text-sm font-medium mb-1">Centro de costo</label><select required value={ccId} onChange={e => setCcId(e.target.value)} className="w-full border rounded px-2 py-1"><option value="">Elegi...</option>{costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</option>)}</select></div>
      <div><label className="block text-sm font-medium mb-1">Forma de pago</label>
        <div className="flex gap-2">{['efectivo','tarjeta','transferencia'].map(fp => <button type="button" key={fp} onClick={() => setFormaPago(fp)} className={`px-3 py-1.5 rounded text-sm capitalize ${formaPago === fp ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{fp}</button>)}</div>
      </div>
      {status && <div className="text-sm text-slate-600">{status}</div>}
      <button disabled={busy} className="px-4 py-2 bg-slate-900 text-white rounded font-medium disabled:opacity-50">{busy ? 'Procesando...' : 'Enviar al buzon'}</button>
    </form>
  );
}

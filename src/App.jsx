import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useSession, useProfile } from './lib/auth';
import { useInvoices, useCostCenters, useProfiles, uploadInvoicePhoto, fileToBase64, runOCR, logEvent, adminCreateUser, adminResetPassword, adminDeleteUser , adminTangoImport, useCashFlowRows, useImportBatches } from './lib/db';
import { Login } from './components/Login';
import { InvoiceForm, money } from './components/InvoiceForm';

function Loading() { return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>; }

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
          <nav className="flex gap-1 flex-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>)}</nav>
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
  const { rows: allProfiles } = useProfiles();
  const { rows: myInvoices, reload } = useInvoices({ uploader_id: profile.id });
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador' || r.role === 'administracion'));
  const [selected, setSelected] = useState(null);
  const tarjetaInvoices = useMemo(() => myInvoices.filter(i => i.forma_pago === 'tarjeta'), [myInvoices]);
  const byMonth = useMemo(() => {
    const g = {};
    for (const inv of tarjetaInvoices) {
      const d = inv.fecha_emision || inv.fecha_gasto || inv.created_at?.slice(0, 10);
      const key = d ? d.slice(0, 7) : 'sin-fecha';
      if (!g[key]) g[key] = [];
      g[key].push(inv);
    }
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [tarjetaInvoices]);
  const monthLabel = (yyyymm) => {
    if (yyyymm === 'sin-fecha') return 'Sin fecha';
    const [y, m] = yyyymm.split('-');
    const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${M[Number(m)-1]} ${y}`;
  };
  return (
    <div className="space-y-6">
      <UploadForm profile={profile} roles={roles} costCenters={costCenters} allProfiles={allProfiles} onDone={reload} />
      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Mis facturas</h2><InvoiceList rows={myInvoices} onOpen={setSelected} showState /></section>
      {tarjetaInvoices.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Mi rendicion (tarjeta)</h2>
          <div className="space-y-4">{byMonth.map(([k, list]) => { const total = list.reduce((s, i) => s + (Number(i.total)||0), 0); return (
            <div key={k} className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 flex justify-between items-center"><div className="font-medium">{monthLabel(k)}</div><div className="text-sm text-slate-600">Total: <span className="font-mono font-semibold">{money(total)}</span></div></div>
              <InvoiceList rows={list} onOpen={setSelected} showState compact />
            </div>
          );})}</div>
        </section>
      )}
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={profile} roles={roles} viewAs="cargador" onSave={() => { reload(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CompradorPane({ profile, roles }) {
  const isAdmin = roles.includes('administracion');
  const { rows: costCenters } = useCostCenters();
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador' || r.role === 'administracion'));
  const soloCompradores = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador'));
  const [actingId, setActingId] = useState(profile.id);
  const acting = actingId === profile.id ? profile : (buyers.find(b => b.id === actingId) || profile);
  const actingRoles = actingId === profile.id ? roles : Array.from(new Set([...(acting.user_roles || []).map(r => r.role), 'comprador']));
  const enNombreDe = actingId !== profile.id;
  const { rows: assigned, reload: reloadAssigned } = useInvoices({ buyer_id: actingId });
  const { rows: buzon, reload: reloadBuzon } = useInvoices({ state: 'en_buzon' });
  const [selected, setSelected] = useState(null);
  const reloadAll = () => { reloadAssigned(); reloadBuzon(); };
  const activas = assigned.filter(i => i.state === 'con_comprador');
  const historial = assigned.filter(i => i.state !== 'con_comprador');
  const titulo = enNombreDe ? `Asignadas a ${acting.nombre}` : 'Asignadas a mi';
  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${enNombreDe ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
          <span className="text-sm font-medium text-slate-700">Ver y actuar como comprador:</span>
          <select value={actingId} onChange={e => { setActingId(e.target.value); setSelected(null); }} className="border rounded px-2 py-1 text-sm">
            <option value={profile.id}>{profile.nombre} (yo)</option>
            {soloCompradores.filter(b => b.id !== profile.id).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          {enNombreDe && <span className="text-sm text-amber-800">Todo lo que haga queda registrado a su nombre, en nombre de {acting.nombre}.</span>}
        </div>
      )}
      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Buzon general <span className="text-slate-400 font-normal text-sm">({buzon.filter(i => !i.con_oc).length})</span></h2><InvoiceList rows={buzon.filter(i => !i.con_oc)} onOpen={setSelected} /></section>
      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">{titulo} <span className="text-slate-400 font-normal text-sm">({activas.length})</span></h2><InvoiceList rows={activas} onOpen={setSelected} /></section>
      <section><h2 className="text-lg font-semibold text-slate-900 mb-3">Historial <span className="text-slate-400 font-normal text-sm">({historial.length})</span></h2><InvoiceList rows={historial} onOpen={setSelected} showState /></section>
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={acting} realProfile={profile} roles={actingRoles} viewAs="comprador" onSave={() => { reloadAll(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AdminPane({ profile, roles }) {
  const [sub, setSub] = useState('tablero');
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['tablero','Tablero'],['facturas','Facturas'],['conceptos','Conceptos'],['usuarios','Usuarios'],['centros','Centros de costo'],['cashflow','Cash Flow']].map(([k, l]) => <button key={k} onClick={() => setSub(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sub === k ? 'bg-slate-900 text-white' : 'bg-white border text-slate-700'}`}>{l}</button>)}
      </div>
      {sub === 'tablero' && <AdminTablero />}
      {sub === 'facturas' && <AdminFacturas profile={profile} roles={roles} />}
      {sub === 'conceptos' && <AdminConceptos />}
      {sub === 'usuarios' && <AdminUsuarios />}
      {sub === 'centros' && <AdminCentros />}
      {sub === 'cashflow' && <AdminCashFlow />}
    </div>
  );
}

function AdminTablero() {
  const { rows: all } = useInvoices();
  const stats = useMemo(() => {
    const c = { en_buzon: 0, con_comprador: 0, con_admin: 0, aprobada: 0, rechazada: 0 };
    let totalMes = 0; let cantMes = 0;
    const now = new Date();
    const yyyymm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    for (const i of all) {
      c[i.state] = (c[i.state] || 0) + 1;
      const d = i.fecha_emision || i.fecha_gasto || i.created_at?.slice(0,10);
      if (d && d.startsWith(yyyymm) && i.state === 'aprobada') { totalMes += Number(i.total) || 0; cantMes++; }
    }
    return { c, totalMes, cantMes, yyyymm };
  }, [all]);
  const StatCard = ({ label, value, color = 'slate' }) => (
    <div className="bg-white rounded-xl border p-4"><div className="text-xs uppercase text-slate-500 tracking-wide">{label}</div><div className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</div></div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="En buzon" value={stats.c.en_buzon || 0} color="amber" />
        <StatCard label="Con comprador" value={stats.c.con_comprador || 0} color="indigo" />
        <StatCard label="Con admin" value={stats.c.con_admin || 0} color="blue" />
        <StatCard label="Aprobadas" value={stats.c.aprobada || 0} color="emerald" />
        <StatCard label="Rechazadas" value={stats.c.rechazada || 0} color="rose" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs uppercase text-slate-500 tracking-wide">Aprobadas este mes ({stats.yyyymm})</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.cantMes}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs uppercase text-slate-500 tracking-wide">Total facturado del mes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{money(stats.totalMes)}</div>
        </div>
      </div>
    </div>
  );
}

function AdminFacturas({ profile, roles }) {
  const { rows: costCenters } = useCostCenters();
  const { rows: all, reload } = useInvoices();
  const { rows: buyers } = useProfiles();
  const buyersList = buyers.filter(b => (b.user_roles || []).some(r => r.role === 'comprador' || r.role === 'administracion'));
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('todas');
  const filtered = filter === 'todas' ? all : all.filter(i => i.state === filter);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">{[['todas','Todas'],['en_buzon','En buzon'],['con_comprador','Con comprador'],['con_admin','Con admin'],['aprobada','Aprobadas'],['rechazada','Rechazadas']].map(([k,l]) => <button key={k} onClick={() => setFilter(k)} className={`px-2 py-1 rounded text-xs ${filter === k ? 'bg-slate-800 text-white' : 'bg-white border'}`}>{l}</button>)}</div>
      <InvoiceList rows={filtered} onOpen={setSelected} showState />
      {selected && <InvoiceForm invoice={selected} costCenters={costCenters} buyers={buyersList} currentProfile={profile} roles={roles} viewAs="admin" onSave={() => { reload(); setSelected(null); }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AdminConceptos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('learning_inbox').select('*, invoice:invoice_id(razon_social, nro_comprobante)').eq('status', 'new').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const groups = useMemo(() => {
    const g = {};
    for (const it of items) {
      const k = (it.concepto_texto || '').trim().toLowerCase();
      if (!g[k]) g[k] = { texto: it.concepto_texto, items: [] };
      g[k].items.push(it);
    }
    return Object.values(g);
  }, [items]);
  const FIELDS = [['iva','IVA'],['percepcion_iva','Percepcion IVA'],['iibb_bsas','IIBB Bs As'],['iibb_caba','IIBB CABA'],['no_gravado','No gravado'],['subtotal_gravado','Subtotal gravado']];

  async function ignorar(group) {
    await supabase.from('learned_concepts').upsert({ concepto_texto: group.texto, action: 'ignore', field_key: null }, { onConflict: 'concepto_texto' });
    await supabase.from('learning_inbox').update({ status: 'ignored' }).in('id', group.items.map(i => i.id));
    reload();
  }
  async function mapear(group, fieldKey) {
    if (!fieldKey) return;
    await supabase.from('learned_concepts').upsert({ concepto_texto: group.texto, action: 'map', field_key: fieldKey }, { onConflict: 'concepto_texto' });
    await supabase.from('learning_inbox').update({ status: 'mapped', mapped_to_field: fieldKey }).in('id', group.items.map(i => i.id));
    reload();
  }

  if (loading) return <div className="text-slate-500">Cargando conceptos...</div>;
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">El OCR encontro estos conceptos en las facturas y no supo donde encajarlos. Ensenale al sistema como tratarlos - se aplica a las que vengan.</div>
      {groups.length === 0 ? <div className="bg-white rounded-xl border p-6 text-center text-slate-400 text-sm">No hay conceptos pendientes de clasificar</div> : groups.map((g, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium text-slate-900">{g.texto}</div>
            <div className="text-xs text-slate-500">{g.items.length} aparicion{g.items.length !== 1 ? 'es' : ''} - montos: {g.items.slice(0,3).map(x => money(x.monto)).join(', ')}{g.items.length > 3 ? '...' : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <select onChange={e => mapear(g, e.target.value)} className="border rounded px-2 py-1 text-sm"><option value="">Mapear a campo...</option>{FIELDS.map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button onClick={() => ignorar(g)} className="px-3 py-1 bg-slate-200 rounded text-sm">Ignorar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminUsuarios() {
  const { rows: users, reload } = useProfiles();
  const ALL_ROLES = ['cargador', 'comprador', 'administracion'];
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRoles, setNewRoles] = useState(['cargador']);
  const [newTarjeta, setNewTarjeta] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function toggleRole(userId, role, currentlyHas) {
    if (currentlyHas) await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    else await supabase.from('user_roles').insert({ user_id: userId, role });
    reload();
  }
  function toggleNewRole(r) {
    setNewRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  }
  async function crear(e) {
    e.preventDefault();
    if (!newNombre || !newEmail || !newPass) return;
    if (newPass.length < 8) { setMsg('La contrasenia debe tener al menos 8 caracteres.'); return; }
    setBusy(true); setMsg('');
    try {
      await adminCreateUser({ email: newEmail.trim(), password: newPass, nombre: newNombre.trim(), roles: newRoles, tarjeta: newTarjeta || null });
      setMsg(`Usuario ${newEmail} creado. Anota la contrasenia: ${newPass}`);
      setNewNombre(''); setNewEmail(''); setNewPass(''); setNewRoles(['cargador']); setNewTarjeta('');
      reload();
    } catch (err) { setMsg('Error: ' + err.message); }
    finally { setBusy(false); }
  }
  async function resetear(u) {
    const nueva = window.prompt(`Nueva contrasenia para ${u.nombre} (${u.email})\n\nMinimo 8 caracteres. Anota esta contrasenia y pasasela.`);
    if (!nueva) return;
    if (nueva.length < 8) { alert('Minimo 8 caracteres.'); return; }
    try {
      await adminResetPassword(u.id, nueva);
      alert(`Listo. La nueva contrasenia de ${u.nombre} es:\n\n${nueva}\n\nPasasela y que la cambie despues si quiere.`);
    } catch (err) { alert('Error: ' + err.message); }
  }
  async function borrar(u) {
    if (!window.confirm(`Borrar definitivamente al usuario ${u.nombre} (${u.email})?\nEsto no se puede deshacer.`)) return;
    try {
      await adminDeleteUser(u.id);
      reload();
    } catch (err) { alert('Error: ' + err.message); }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={crear} className="bg-white rounded-xl border p-4 space-y-3">
        <div className="font-semibold text-slate-900">Nuevo usuario</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="text-xs text-slate-500 block mb-1">Nombre</label><input value={newNombre} onChange={e => setNewNombre(e.target.value)} required className="w-full border rounded px-2 py-1" placeholder="Nombre y apellido" /></div>
          <div><label className="text-xs text-slate-500 block mb-1">Email</label><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="w-full border rounded px-2 py-1" placeholder="usuario@dominio.com" /></div>
          <div><label className="text-xs text-slate-500 block mb-1">Contrasenia inicial</label><input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={8} className="w-full border rounded px-2 py-1 font-mono" placeholder="minimo 8 caracteres" /></div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-slate-500">Tarjeta asignada:</span>
          <select value={newTarjeta} onChange={e => setNewTarjeta(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">Sin tarjeta</option>
            {TARJETAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-slate-500">Roles iniciales:</span>
          {ALL_ROLES.map(r => <label key={r} className="text-sm flex items-center gap-1"><input type="checkbox" checked={newRoles.includes(r)} onChange={() => toggleNewRole(r)} /> {r}</label>)}
          <button disabled={busy} className="ml-auto px-4 py-1.5 bg-slate-900 text-white rounded disabled:opacity-50">{busy ? 'Creando...' : 'Crear usuario'}</button>
        </div>
        {msg && <div className={`text-sm p-2 rounded ${msg.startsWith('Error') ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{msg}</div>}
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Nombre</th><th className="text-left px-4 py-2">Email</th><th className="px-2 py-2">Tarjeta</th><th className="px-2 py-2">Cargador</th><th className="px-2 py-2">Comprador</th><th className="px-2 py-2">Admin</th><th className="px-2 py-2">Acciones</th></tr></thead>
          <tbody>{users.map(u => { const rs = (u.user_roles || []).map(r => r.role); return (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2">{u.nombre}</td>
              <td className="px-4 py-2 text-slate-500">{u.email}</td>
              <td className="px-2 py-2">
                <select value={u.tarjeta || ''} onChange={async e => { await supabase.from('profiles').update({ tarjeta: e.target.value || null }).eq('id', u.id); reload(); }} className="border rounded px-1 py-0.5 text-xs">
                  <option value="">-</option>
                  {TARJETAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              {ALL_ROLES.map(role => <td key={role} className="px-2 py-2 text-center"><input type="checkbox" checked={rs.includes(role)} onChange={() => toggleRole(u.id, role, rs.includes(role))} /></td>)}
              <td className="px-2 py-2 whitespace-nowrap">
                <button onClick={() => resetear(u)} className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50">Cambiar contrasenia</button>
                <button onClick={() => borrar(u)} className="text-xs px-2 py-1 ml-1 border border-rose-300 text-rose-700 rounded hover:bg-rose-50">Borrar</button>
              </td>
            </tr>
          );})}</tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500">Por seguridad, Supabase no permite ver las contrasenias existentes. Si un usuario la olvida, uses "Cambiar contrasenia" para definirle una nueva y pasarsela.</div>
    </div>
  );
}

function AdminCentros() {
  const { rows, reload } = useCostCenters();
  const [codigo, setCodigo] = useState(''); const [nombre, setNombre] = useState('');
  async function add(e) { e.preventDefault(); await supabase.from('cost_centers').insert({ codigo, nombre }); setCodigo(''); setNombre(''); reload(); }
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="bg-white rounded-xl border p-4 flex gap-2 items-end">
        <div><label className="text-xs text-slate-500">Codigo</label><input value={codigo} onChange={e => setCodigo(e.target.value)} required className="block border rounded px-2 py-1" /></div>
        <div className="flex-1"><label className="text-xs text-slate-500">Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} required className="block w-full border rounded px-2 py-1" /></div>
        <button className="px-4 py-1.5 bg-slate-900 text-white rounded">Agregar</button>
      </form>
      <div className="bg-white rounded-xl border">{rows.map(cc => <div key={cc.id} className="px-4 py-2 border-t first:border-t-0"><b>{cc.codigo}</b> - {cc.nombre}</div>)}</div>
    </div>
  );
}

function InvoiceList({ rows, onOpen, showState, compact }) {
  if (!rows.length) return <div className="bg-white rounded-xl border p-6 text-center text-slate-400 text-sm">Sin facturas</div>;
  return (
    <div className={`bg-white ${compact ? '' : 'rounded-xl border'} overflow-hidden`}>
      <table className="w-full text-sm">
        {!compact && <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Proveedor</th><th className="px-3 py-2 text-left">Comprobante</th><th className="px-3 py-2 text-right">Total</th>{showState && <th className="px-3 py-2">Estado</th>}<th className="px-3 py-2"></th></tr></thead>}
        <tbody>{rows.map(r => (
          <tr key={r.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(r)}>
            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.fecha_emision || r.fecha_gasto || '-'}</td>
            <td className="px-3 py-2 font-medium">{r.razon_social || r.concepto || '-'} {r.con_oc && <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">OC</span>}</td>
            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.tipo_comprobante ? r.tipo_comprobante + ' ' : ''}{r.nro_comprobante || '-'}</td>
            <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{money(r.total, r.moneda)}</td>
            {showState && <td className="px-3 py-2 text-xs text-center"><StateBadge state={r.state} /></td>}
            <td className="px-3 py-2 text-right"><span className="text-indigo-600 hover:underline text-xs">Abrir</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function StateBadge({ state }) {
  const c = { en_buzon: 'bg-amber-100 text-amber-800', con_comprador: 'bg-indigo-100 text-indigo-800', con_admin: 'bg-blue-100 text-blue-800', aprobada: 'bg-emerald-100 text-emerald-800', rechazada: 'bg-rose-100 text-rose-800' };
  return <span className={`px-2 py-0.5 rounded whitespace-nowrap ${c[state] || 'bg-slate-100'}`}>{state}</span>;
}

const TARJETAS = ['Visa Macro', 'Visa Santander', 'Visa Galicia', 'Amex'];

function UploadForm({ profile, roles, costCenters, allProfiles = [], onDone }) {
  const isAdmin = (roles || []).includes('administracion');
  const cargadores = (allProfiles || []).filter(p => (p.user_roles || []).some(r => r.role === 'cargador'));
  const [file, setFile] = useState(null);
  const [ccId, setCcId] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [tipoCarga, setTipoCarga] = useState('factura');
  const [concepto, setConcepto] = useState('');
  const [total, setTotal] = useState('');
  const [cuotas, setCuotas] = useState(1);
  const [conOc, setConOc] = useState(false);
  const [ocNumero, setOcNumero] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [tarjeta, setTarjeta] = useState(profile.tarjeta || '');
  const [titularId, setTitularId] = useState(profile.id);
  const [actAsId, setActAsId] = useState(profile.id);
  // Auto-set tarjeta cuando cambia el usuario "en nombre de" (admin)
  useEffect(() => {
    if (!isAdmin) return;
    const acting = (allProfiles || []).find(p => p.id === actAsId);
    setTarjeta(acting?.tarjeta || '');
    setTitularId(actAsId);
  }, [actAsId, isAdmin]);
  const enNombreDe = isAdmin && actAsId !== profile.id;

  async function submit(e) {
    e.preventDefault();
    if (!file && tipoCarga === 'factura') { alert('Sube una foto de la factura'); return; }
    if (!ccId) { alert('Elegi centro de costo'); return; }
    if (conOc && !ocNumero.trim()) { alert('Cargar el numero de OC'); return; }
    setBusy(true);
    try {
      let photo_path = null;
      let ocrFields = {};
      let conceptosNoClasif = [];
      if (file) {
        setStatus('Subiendo foto...');
        photo_path = await uploadInvoicePhoto(file, profile.id);
        if (tipoCarga === 'factura') {
          setStatus('Leyendo con OCR...');
          const b64 = await fileToBase64(file);
          try {
            const d = await runOCR(b64, file.type || 'image/jpeg');
            ocrFields = {
              tipo_comprobante: d.tipoComprobante || null, nro_comprobante: d.nroComprobante || null,
              razon_social: d.razonSocial || null, cuit: d.cuit || null, fecha_emision: d.fechaEmision || null,
              moneda: d.moneda || 'ARS', tipo_cambio: d.tipoCambio || null,
              subtotal_gravado: d.subtotalGravado || null, no_gravado: d.noGravado || null,
              iva: d.iva || null, percepcion_iva: d.percepcionIva || null,
              iibb_bsas: d.iibbBsAs || null, iibb_caba: d.iibbCaba || null,
              total: d.total || null, cae: d.cae || null, cai: d.cai || null,
            };
            conceptosNoClasif = Array.isArray(d.conceptosNoClasificados) ? d.conceptosNoClasificados : [];
            // Aplicar reglas aprendidas
            if (conceptosNoClasif.length) {
              const textos = conceptosNoClasif.map(c => (c.texto||'').trim()).filter(Boolean);
              const { data: learned } = await supabase.from('learned_concepts').select('*').in('concepto_texto', textos);
              const remaining = [];
              for (const c of conceptosNoClasif) {
                const rule = (learned || []).find(l => l.concepto_texto === (c.texto||'').trim());
                if (!rule) { remaining.push(c); continue; }
                if (rule.action === 'ignore') continue;
                if (rule.action === 'map' && rule.field_key) {
                  ocrFields[rule.field_key] = (Number(ocrFields[rule.field_key])||0) + (Number(c.monto)||0);
                }
              }
              conceptosNoClasif = remaining;
            }
          } catch (err) { console.warn('OCR fail', err); }
        }
      }
      setStatus('Guardando...');
      const initialState = conOc ? 'con_admin' : 'en_buzon';
      const uploaderId = isAdmin ? actAsId : profile.id;
      const payload = {
        tipo_carga: tipoCarga, cost_center_id: ccId, forma_pago: formaPago, photo_path,
        uploader_id: uploaderId, state: initialState, con_oc: conOc,
        oc_numero: conOc ? ocNumero.trim() : null,
        cuotas: formaPago === 'tarjeta' ? Number(cuotas)||1 : 1,
        tarjeta: formaPago === 'tarjeta' ? (tarjeta || null) : null,
        titular_id: formaPago === 'tarjeta' ? (titularId || uploaderId) : null,
        ...ocrFields,
      };
      if (tipoCarga === 'gasto_sin_factura') {
        payload.concepto = concepto; payload.total = total || null;
        payload.fecha_gasto = new Date().toISOString().slice(0,10);
      }
      let { data, error } = await supabase.from('invoices').insert(payload).select().single();
      if (error && /(tarjeta|titular_id)/i.test(error.message || '')) {
        // Fallback si las columnas nuevas todavia no existen en la DB
        const { tarjeta: _t, titular_id: _ti, ...safe } = payload;
        ({ data, error } = await supabase.from('invoices').insert(safe).select().single());
      }
      if (error) throw error;
      await logEvent(data.id, profile.id, 'uploaded', enNombreDe ? `en nombre de ${(cargadores.find(c => c.id === actAsId) || {}).nombre || ''}` : null);
      // Guardar conceptos no clasificados restantes
      if (conceptosNoClasif.length) {
        await supabase.from('learning_inbox').insert(conceptosNoClasif.map(c => ({
          concepto_texto: (c.texto || '').trim(), monto: Number(c.monto) || null, invoice_id: data.id, status: 'new',
        })));
      }
      setStatus('Listo! ' + (conOc ? 'Fue directo a Administracion.' : 'Espera derivacion.'));
      setFile(null); setConcepto(''); setTotal(''); setCcId(''); setConOc(false); setOcNumero(''); setCuotas(1); setTarjeta(''); setTitularId(profile.id); setActAsId(profile.id);
      onDone();
      setTimeout(() => setStatus(''), 4000);
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
      <div><label className="block text-sm font-medium mb-1">Foto {tipoCarga === 'gasto_sin_factura' && '(opcional)'}</label><input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0])} className="block w-full text-sm" /></div>
      {tipoCarga === 'gasto_sin_factura' && <>
        <div><label className="block text-sm font-medium mb-1">Concepto</label><input required value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Ej: Suscripcion Adobe" /></div>
        <div><label className="block text-sm font-medium mb-1">Monto</label><input type="number" step="0.01" value={total} onChange={e => setTotal(e.target.value)} className="w-full border rounded px-2 py-1" /></div>
      </>}
      <div><label className="block text-sm font-medium mb-1">Centro de costo</label><select required value={ccId} onChange={e => setCcId(e.target.value)} className="w-full border rounded px-2 py-1"><option value="">Elegi...</option>{costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</option>)}</select></div>
      <div><label className="block text-sm font-medium mb-1">Forma de pago <span className="text-rose-500">*</span></label><div className="flex gap-2">{[['efectivo','Efectivo'],['tarjeta','Tarjeta'],['transferencia','Transf. u otro']].map(([fp,label]) => <button type="button" key={fp} onClick={() => setFormaPago(fp)} className={`flex-1 px-3 py-2 rounded text-sm border ${formaPago === fp ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>{label}</button>)}</div></div>
      {formaPago === 'tarjeta' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
          {isAdmin && <div className="text-xs text-slate-700">⚙️ Cargando como admin - puede elegir la tarjeta y el titular libremente.</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Tarjeta <span className="text-rose-500">*</span></label>
            {(!isAdmin && profile.tarjeta)
              ? <div className="px-3 py-2 bg-white rounded border text-sm">{profile.tarjeta} <span className="text-xs text-slate-500">(tu tarjeta asignada)</span></div>
              : <div className="grid grid-cols-2 gap-2">{TARJETAS.map(t => <button type="button" key={t} onClick={() => setTarjeta(t)} className={`px-3 py-2 rounded text-sm border ${tarjeta === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>{t}</button>)}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Titular de la tarjeta <span className="text-rose-500">*</span></label>
            {isAdmin
              ? <select value={titularId} onChange={e => setTitularId(e.target.value)} className="w-full border rounded px-2 py-1"><option value="">Elegir titular...</option>{cargadores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
              : <div className="px-2 py-1 bg-white rounded border text-sm">{profile.nombre}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cantidad de cuotas</label>
            <input type="number" min="1" max="24" value={cuotas} onChange={e => setCuotas(e.target.value)} className="w-24 border rounded px-2 py-1" />
          </div>
        </div>
      )}
      {isAdmin && (
        <div className={`rounded-lg border p-3 ${enNombreDe ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
          <label className="block text-sm font-medium mb-1">Cargar en nombre de <span className="text-xs text-slate-500 font-normal">(solo admin)</span></label>
          <select value={actAsId} onChange={e => setActAsId(e.target.value)} className="w-full border rounded px-2 py-1">
            <option value={profile.id}>{profile.nombre} (yo)</option>
            {cargadores.filter(c => c.id !== profile.id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {enNombreDe && <div className="text-xs text-amber-800 mt-1">La factura queda registrada como cargada por {(cargadores.find(c => c.id === actAsId) || {}).nombre}, y el historial anota que la subiste vos en su nombre.</div>}
        </div>
      )}
      <div className="border-t pt-4">
        <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" checked={conOc} onChange={e => setConOc(e.target.checked)} className="mt-1" /><div><div className="font-medium text-sm">La factura ya tiene una OC asociada</div><div className="text-xs text-slate-500">Va directo a Administracion (saltea comprador).</div></div></label>
        {conOc && <div className="mt-2"><label className="block text-xs text-slate-500 mb-1">Numero de OC</label><input value={ocNumero} onChange={e => setOcNumero(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Ej: OC-2026-0123" /></div>}
      </div>
      {status && <div className="text-sm p-3 rounded bg-emerald-50 text-emerald-800">{status}</div>}
      <button disabled={busy} className="px-4 py-2 bg-slate-900 text-white rounded font-medium disabled:opacity-50">{busy ? 'Procesando...' : 'Enviar'}</button>
    </form>
  );
}

// ============ CASH FLOW ============
function AdminCashFlow() {
  const [subtab, setSubtab] = useState('subir');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[['subir','Subir reportes'],['flujo','Cash Flow'],['batches','Historial de subidas']].map(([k,l]) => (
          <button key={k} onClick={() => setSubtab(k)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${subtab === k ? 'bg-slate-900 text-white' : 'bg-white border text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {subtab === 'subir'   && <TangoUploader />}
      {subtab === 'flujo'   && <CashFlowTable />}
      {subtab === 'batches' && <ImportBatchList />}
    </div>
  );
}

function TangoUploader() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <TangoDropZone tipo="pagos"       label="Pagos a realizar"        hint="Reporte de Tango con las OP a emitir. Se cargan como G-Pago a Proveedores." />
      <TangoDropZone tipo="pendientes"  label="Pendientes de facturar"  hint="OCs pendientes de facturar. Se proyectan como H-Pago a Prov Proyectados a 30/60 dias segun condicion de compra." />
    </div>
  );
}

function TangoDropZone({ tipo, label, hint }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setMsg(null); setErr(null);
    try {
      const b64 = await fileToBase64(f);
      const b64clean = String(b64).split(',').pop();
      const r = await adminTangoImport({ tipo, filename: f.name, file_b64: b64clean });
      const w = (r.warnings || []).length;
      setMsg(`OK · ${r.rows_created} filas cargadas · ${r.rows_skipped} descartadas${w ? ` · ${w} advertencias` : ''}`);
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bg-white rounded-xl border p-4 space-y-2">
      <div className="font-medium text-slate-800">{label}</div>
      <div className="text-xs text-slate-500">{hint}</div>
      <label className={`block border-2 border-dashed rounded-lg p-6 text-center text-sm cursor-pointer ${busy ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50 text-slate-700'}`}>
        <input type="file" accept=".xlsx,.xls" onChange={onFile} disabled={busy} className="hidden" />
        {busy ? 'Procesando...' : 'Arrastre el archivo o toque para elegir'}
      </label>
      {msg && <div className="text-sm p-2 rounded bg-emerald-50 text-emerald-800">{msg}</div>}
      {err && <div className="text-sm p-2 rounded bg-rose-50 text-rose-800">Error: {err}</div>}
    </div>
  );
}

function CashFlowTable() {
  const [concepto, setConcepto] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const filters = useMemo(() => {
    const f = {};
    if (concepto) f.concepto = concepto;
    if (desde) f.desde = desde;
    if (hasta) f.hasta = hasta;
    return f;
  }, [concepto, desde, hasta]);
  const { rows, loading, reload } = useCashFlowRows(filters);
  const conceptos = ['G-Pago a Proveedores', 'H-Pago a Prov Proyectados', 'I-Pago a Prov SIN OC', 'A-Ds por Ventas', 'D-Ing Fin', 'L-Impuestos', 'P-Otros Egr', 'Q-Trans e/ Cuentas'];
  const total = rows.reduce((a, r) => a + Number(r.importe || 0), 0);
  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border p-3 flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-slate-500">Concepto</label>
          <select value={concepto} onChange={e => setConcepto(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">Todos</option>
            {conceptos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500">Desde VTO</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Hasta VTO</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <button onClick={reload} className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm">Actualizar</button>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Total ({rows.length} filas)</div>
          <div className="text-lg font-bold text-slate-800">{fmt(total)}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        {loading ? <div className="p-6 text-center text-slate-500">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">VTO</th>
                <th className="text-left px-3 py-2">Comprob</th>
                <th className="text-left px-3 py-2">Razon social</th>
                <th className="text-left px-3 py-2">Concepto</th>
                <th className="text-left px-3 py-2">IF/CC</th>
                <th className="text-left px-3 py-2">Prov</th>
                <th className="text-right px-3 py-2">Importe</th>
                <th className="text-left px-3 py-2">Origen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.fecha_vto || '-'}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.nro_comprobante || '-'}</td>
                  <td className="px-3 py-1.5">{r.razon_social}</td>
                  <td className="px-3 py-1.5 text-xs">{r.concepto}</td>
                  <td className="px-3 py-1.5 text-xs">{r.if_cc || '-'}</td>
                  <td className="px-3 py-1.5 text-xs">{r.provincia || '-'}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">{fmt(Number(r.importe))}</td>
                  <td className="px-3 py-1.5 text-xs text-slate-500">{r.origen}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Sin filas</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ImportBatchList() {
  const { rows, reload } = useImportBatches();
  return (
    <div className="bg-white rounded-xl border">
      <div className="p-3 border-b flex justify-between items-center">
        <div className="font-medium">Ultimas subidas</div>
        <button onClick={reload} className="text-sm text-slate-600 hover:text-slate-900">Actualizar</button>
      </div>
      {rows.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">Sin subidas registradas.</div>}
      {rows.map(b => (
        <div key={b.id} className="px-4 py-3 border-t flex gap-4 items-center text-sm">
          <div className="flex-1">
            <div className="font-medium">{b.filename || '(sin nombre)'}</div>
            <div className="text-xs text-slate-500">{b.tipo} · {new Date(b.created_at).toLocaleString('es-AR')}</div>
          </div>
          <div className="text-emerald-700 font-medium">+{b.rows_created}</div>
          <div className="text-slate-500 text-xs">skip {b.rows_skipped}</div>
        </div>
      ))}
    </div>
  );
}

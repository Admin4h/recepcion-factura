import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useSession, useProfile } from './lib/auth';
import { useInvoices, useCostCenters, useProfiles, uploadInvoicePhoto, fileToBase64, runOCR, logEvent, adminCreateUser, adminResetPassword, adminDeleteUser } from './lib/db';
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
  const titulo = enNombreDe ? `Asignadas a ${acting.nombre}` : 'Asignadas a mi'
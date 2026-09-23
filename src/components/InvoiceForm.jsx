import { useState, useEffect, useRef } from 'react';
import { getPhotoUrl, logEvent } from '../lib/db';
import { supabase } from '../supabaseClient';

const money = (n, cur = 'ARS') => {
  if (n === null || n === undefined || n === '') return '-';
  const num = Number(n);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(num);
};

export function InvoiceForm({ invoice, costCenters, buyers, currentProfile, realProfile, roles, viewAs, onSave, onClose }) {
  const actor = realProfile || currentProfile;
  const enNombreDe = realProfile && realProfile.id !== currentProfile?.id;
  const [form, setForm] = useState(invoice);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assignBuyer, setAssignBuyer] = useState('');
  const [bounceReason, setBounceReason] = useState('');

  useEffect(() => { setForm(invoice); }, [invoice]);
  useEffect(() => {
    if (invoice?.photo_path) getPhotoUrl(invoice.photo_path).then(setPhotoUrl);
    else setPhotoUrl(null);
  }, [invoice?.photo_path]);

  const isAdmin = roles.includes('administracion');
  const isBuyer = roles.includes('comprador');
  const isMyBuyer = invoice?.buyer_id === currentProfile?.id;
  const isMyUpload = invoice?.uploader_id === currentProfile?.id;
  const state = form.state;

  // Decide qué acciones mostrar segun viewAs (contexto de solapa)
  // viewAs: 'admin' | 'comprador' | 'cargador'
  const showAdminActions = isAdmin && viewAs === 'admin';
  const showBuyerActions = isMyBuyer && state === 'con_comprador' && (viewAs === 'comprador' || (viewAs === 'admin' && !showAdminActions));
  const showUploaderActions = isMyUpload && state === 'en_buzon' && viewAs === 'cargador';
  const canEditFields = showAdminActions || showBuyerActions || showUploaderActions;
  const set = (k, v) => setForm({ ...form, [k]: v });

  async function save(newState, extra = {}) {
    setSaving(true);
    try {
      const patch = { ...form, ...extra, updated_at: new Date().toISOString() };
      if (newState) patch.state = newState;
      delete patch.uploader; delete patch.buyer; delete patch.cost_center;
      const { error } = await supabase.from('invoices').update(patch).eq('id', invoice.id);
      if (error) throw error;
      if (newState) {
        const nota = [extra.bounce_reason, enNombreDe ? `en nombre de ${currentProfile.nombre}` : null].filter(Boolean).join(' - ') || null;
        await logEvent(invoice.id, actor.id, newState, nota);
      }
      onSave();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  }

  async function remove() {
    const nombre = (form.razon_social || form.concepto || 'sin proveedor') + ' ' + (form.nro_comprobante || '');
    if (!window.confirm('¿Borrar definitivamente esta carga?\n\n' + nombre + '\n\nEsta acción no se puede deshacer.')) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('invoices').delete().eq('id', invoice.id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No tiene permiso para borrar esta carga.');
      if (invoice.photo_path) await supabase.storage.from('invoice-photos').remove([invoice.photo_path]);
      onSave();
    } catch (err) { alert('Error al borrar: ' + err.message); }
    finally { setSaving(false); }
  }

  const canDelete = (isAdmin && viewAs === 'admin') || (isMyUpload && state === 'en_buzon');
  const inp = 'w-full border rounded px-2 py-1 text-sm disabled:bg-slate-50';

  if (!invoice) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
          <div className="min-w-0">
            <div className="font-semibold truncate">{form.razon_social || form.concepto || 'Sin proveedor'} - {form.nro_comprobante || 's/n'}</div>
            <div className="text-xs text-slate-500 truncate">
              Estado: <StateBadgeInline state={state} /> - Subida por {invoice.uploader?.nombre}
              {invoice.buyer?.nombre && <span> - Comprador: {invoice.buyer.nombre}</span>}
              {form.con_oc && <span> - OC: {form.oc_numero}</span>}
              {enNombreDe && <span className="ml-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800">Actuando como {currentProfile.nombre}</span>}
            </div>
          </div>
          <button onClick={onClose} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded flex-shrink-0">Cerrar</button>
        </div>
        {form.bounce_reason && <div className="mx-4 mt-2 px-3 py-1 bg-rose-50 text-rose-800 text-sm rounded-lg flex-shrink-0"><b>Motivo rechazo:</b> {form.bounce_reason}</div>}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
          <div className="flex-1 min-h-0 min-w-0 md:basis-3/5">
            <PhotoViewer url={photoUrl} />
          </div>
          <div className="md:basis-2/5 min-h-0 max-h-[45%] md:max-h-none overflow-auto md:overflow-hidden">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <Field label="Tipo"><select disabled={!canEditFields} value={form.tipo_comprobante || ''} onChange={e => set('tipo_comprobante', e.target.value || null)} className={inp}><option value="">-</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></Field>
              <Field label="Nro"><input disabled={!canEditFields} value={form.nro_comprobante || ''} onChange={e => set('nro_comprobante', e.target.value)} className={inp} /></Field>
              <div className="col-span-2"><Field label="Razón social"><input disabled={!canEditFields} value={form.razon_social || ''} onChange={e => set('razon_social', e.target.value)} className={inp} /></Field></div>
              <Field label="CUIT"><input disabled={!canEditFields} value={form.cuit || ''} onChange={e => set('cuit', e.target.value)} className={inp} /></Field>
              <Field label="Fecha"><input disabled={!canEditFields} type="date" value={form.fecha_emision || ''} onChange={e => set('fecha_emision', e.target.value || null)} className={inp} /></Field>
              <Field label="Subtotal"><input disabled={!canEditFields} type="number" step="0.01" value={form.subtotal_gravado || ''} onChange={e => set('subtotal_gravado', e.target.value || null)} className={inp} /></Field>
              <Field label="IVA"><input disabled={!canEditFields} type="number" step="0.01" value={form.iva || ''} onChange={e => set('iva', e.target.value || null)} className={inp} /></Field>
              <Field label="Total"><input disabled={!canEditFields} type="number" step="0.01" value={form.total || ''} onChange={e => set('total', e.target.value || null)} className={inp} /></Field>
              <Field label="Moneda"><input disabled={!canEditFields} value={form.moneda || 'ARS'} onChange={e => set('moneda', e.target.value)} className={inp} /></Field>
              <div className="col-span-2"><Field label="CAE"><input disabled={!canEditFields} value={form.cae || ''} onChange={e => set('cae', e.target.value)} className={inp} /></Field></div>
              <div className="col-span-2 flex items-baseline justify-between border-t pt-2 mt-1">
                <span className="text-xs uppercase text-slate-500 tracking-wide">Total</span>
                <span className="text-xl font-semibold">{money(form.total, form.moneda)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 border-t bg-slate-50 flex flex-wrap gap-2 justify-end items-center flex-shrink-0">
          {canDelete && <button disabled={saving} onClick={remove} className="mr-auto px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded font-medium">Borrar</button>}
          {canEditFields && <button disabled={saving} onClick={() => save(null)} className="px-4 py-2 bg-slate-200 rounded font-medium">Guardar cambios</button>}
          {showAdminActions && state === 'en_buzon' && !form.con_oc && (
            <>
              <select value={assignBuyer} onChange={e => setAssignBuyer(e.target.value)} className="border rounded px-2 py-1"><option value="">Elegir comprador...</option>{buyers.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select>
              <button disabled={!assignBuyer || saving} onClick={() => save('con_comprador', { buyer_id: assignBuyer })} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium disabled:opacity-50">Derivar a comprador</button>
            </>
          )}
          {showBuyerActions && (
            <>
              <button disabled={saving} onClick={() => save('con_admin')} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">Enviar a admin</button>
              <input placeholder="Motivo rechazo" value={bounceReason} onChange={e => setBounceReason(e.target.value)} className="border rounded px-2 py-1" />
              <button disabled={!bounceReason || saving} onClick={() => save('rechazada', { bounce_reason: bounceReason })} className="px-4 py-2 bg-rose-600 text-white rounded font-medium disabled:opacity-50">Rechazar</button>
            </>
          )}
          {showAdminActions && (state === 'con_admin' || (state === 'en_buzon' && form.con_oc)) && (
            <>
              <button disabled={saving} onClick={() => save('aprobada')} className="px-4 py-2 bg-emerald-600 text-white rounded font-medium">Aprobar</button>
              <input placeholder="Motivo rechazo" value={bounceReason} onChange={e => setBounceReason(e.target.value)} className="border rounded px-2 py-1" />
              <button disabled={!bounceReason || saving} onClick={() => save('rechazada', { bounce_reason: bounceReason })} className="px-4 py-2 bg-rose-600 text-white rounded font-medium disabled:opacity-50">Rechazar</button>
            </>
          )}
          {showAdminActions && state === 'con_comprador' && (
            <button disabled={saving} onClick={() => save('en_buzon', { buyer_id: null })} className="px-4 py-2 bg-amber-500 text-white rounded font-medium">Devolver al buzon</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoViewer({ url }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const boxRef = useRef(null);
  useEffect(() => { setZoom(1); setPos({ x: 0, y: 0 }); }, [url]);
  const clamp = z => Math.min(6, Math.max(1, z));
  const zoomBy = f => setZoom(z => { const nz = clamp(z * f); if (nz === 1) setPos({ x: 0, y: 0 }); return nz; });
  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [url]);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  function onDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }
  }
  function onMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(clamp(pinch.current.z * d / pinch.current.d));
    } else if (drag.current && zoom > 1) {
      setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
    }
  }
  function onUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  }
  if (!url) return <div className="h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Sin foto</div>;
  return (
    <div ref={boxRef} className="relative h-full bg-slate-100 rounded-lg border overflow-hidden select-none" style={{ touchAction: 'none', cursor: zoom > 1 ? 'grab' : 'default' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => (zoom > 1 ? reset() : zoomBy(2))}>
      <img src={url} alt="factura" draggable={false} className="absolute inset-0 w-full h-full object-contain"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: drag.current || pinch.current ? 'none' : 'transform 0.1s' }} />
      <div className="absolute bottom-2 right-2 flex gap-1 bg-white/90 rounded-lg shadow p-1" onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <button onClick={() => zoomBy(1 / 1.25)} className="w-8 h-8 rounded hover:bg-slate-100 text-lg font-bold" title="Alejar">−</button>
        <button onClick={reset} className="px-2 h-8 rounded hover:bg-slate-100 text-xs tabular-nums" title="Ajustar">{Math.round(zoom * 100)}%</button>
        <button onClick={() => zoomBy(1.25)} className="w-8 h-8 rounded hover:bg-slate-100 text-lg font-bold" title="Acercar">+</button>
        <a href={url} target="_blank" rel="noreferrer" className="px-2 h-8 flex items-center rounded hover:bg-slate-100 text-xs" title="Abrir original">Abrir</a>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] uppercase text-slate-500 tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function StateBadgeInline({ state }) {
  const colors = { en_buzon: 'bg-amber-100 text-amber-800', con_comprador: 'bg-indigo-100 text-indigo-800', con_admin: 'bg-blue-100 text-blue-800', aprobada: 'bg-emerald-100 text-emerald-800', rechazada: 'bg-rose-100 text-rose-800' };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[state] || 'bg-slate-100'}`}>{state}</span>;
}

export { money };

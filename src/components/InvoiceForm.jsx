import { useState, useEffect } from 'react';
import { getPhotoUrl, logEvent } from '../lib/db';
import { supabase } from '../supabaseClient';

const money = (n, cur = 'ARS') => {
  if (n === null || n === undefined || n === '') return '-';
  const num = Number(n);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(num);
};

export function InvoiceForm({ invoice, costCenters, buyers, currentProfile, roles, onSave, onClose }) {
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
  const canEditFields = isAdmin || (isMyBuyer && invoice?.state === 'con_comprador') || (invoice?.uploader_id === currentProfile?.id && invoice?.state === 'en_buzon');
  const set = (k, v) => setForm({ ...form, [k]: v });

  async function save(newState, extra = {}) {
    setSaving(true);
    try {
      const patch = { ...form, ...extra, updated_at: new Date().toISOString() };
      if (newState) patch.state = newState;
      delete patch.uploader; delete patch.buyer; delete patch.cost_center;
      const { error } = await supabase.from('invoices').update(patch).eq('id', invoice.id);
      if (error) throw error;
      if (newState) await logEvent(invoice.id, currentProfile.id, newState, extra.bounce_reason || null);
      onSave();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  }

  if (!invoice) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-start md:items-center justify-center p-2 md:p-8 overflow-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <span className="text-xs uppercase text-slate-500">Factura</span>
            <div className="font-semibold">{form.razon_social || 'Sin proveedor'} - {form.nro_comprobante || 's/n'}</div>
            <div className="text-xs text-slate-500">Estado: <span className="font-medium">{form.state}</span> - Subida por {invoice.uploader?.nombre}</div>
          </div>
          <button onClick={onClose} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded">Cerrar</button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div>
            {photoUrl ? <img src={photoUrl} alt="factura" className="w-full rounded-lg border" /> : <div className="aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Sin foto</div>}
          </div>
          <div className="space-y-3">
            <Field label="Tipo"><select disabled={!canEditFields} value={form.tipo_comprobante || ''} onChange={e => set('tipo_comprobante', e.target.value || null)} className="w-full border rounded px-2 py-1"><option value="">-</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></Field>
            <Field label="Nro"><input disabled={!canEditFields} value={form.nro_comprobante || ''} onChange={e => set('nro_comprobante', e.target.value)} className="w-full border rounded px-2 py-1" /></Field>
            <Field label="Razon social"><input disabled={!canEditFields} value={form.razon_social || ''} onChange={e => set('razon_social', e.target.value)} className="w-full border rounded px-2 py-1" /></Field>
            <Field label="CUIT"><input disabled={!canEditFields} value={form.cuit || ''} onChange={e => set('cuit', e.target.value)} className="w-full border rounded px-2 py-1" /></Field>
            <Field label="Fecha"><input disabled={!canEditFields} type="date" value={form.fecha_emision || ''} onChange={e => set('fecha_emision', e.target.value || null)} className="w-full border rounded px-2 py-1" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subtotal"><input disabled={!canEditFields} type="number" step="0.01" value={form.subtotal_gravado || ''} onChange={e => set('subtotal_gravado', e.target.value || null)} className="w-full border rounded px-2 py-1" /></Field>
              <Field label="IVA"><input disabled={!canEditFields} type="number" step="0.01" value={form.iva || ''} onChange={e => set('iva', e.target.value || null)} className="w-full border rounded px-2 py-1" /></Field>
              <Field label="Total"><input disabled={!canEditFields} type="number" step="0.01" value={form.total || ''} onChange={e => set('total', e.target.value || null)} className="w-full border rounded px-2 py-1" /></Field>
              <Field label="Moneda"><input disabled={!canEditFields} value={form.moneda || 'ARS'} onChange={e => set('moneda', e.target.value)} className="w-full border rounded px-2 py-1" /></Field>
            </div>
            <Field label="CAE"><input disabled={!canEditFields} value={form.cae || ''} onChange={e => set('cae', e.target.value)} className="w-full border rounded px-2 py-1" /></Field>
            <Field label="Total mostrado"><div className="text-lg font-semibold">{money(form.total, form.moneda)}</div></Field>
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 flex flex-wrap gap-2 justify-end">
          {canEditFields && <button disabled={saving} onClick={() => save(null)} className="px-4 py-2 bg-slate-200 rounded font-medium">Guardar</button>}
          {isAdmin && form.state === 'en_buzon' && (
            <div className="flex gap-2 items-center">
              <select value={assignBuyer} onChange={e => setAssignBuyer(e.target.value)} className="border rounded px-2 py-1"><option value="">Elegir comprador...</option>{buyers.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select>
              <button disabled={!assignBuyer || saving} onClick={() => save('con_comprador', { buyer_id: assignBuyer })} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium disabled:opacity-50">Derivar</button>
            </div>
          )}
          {isMyBuyer && form.state === 'con_comprador' && (
            <>
              <button disabled={saving} onClick={() => save('con_admin')} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium">Enviar a admin</button>
              <input placeholder="Motivo rechazo" value={bounceReason} onChange={e => setBounceReason(e.target.value)} className="border rounded px-2 py-1" />
              <button disabled={!bounceReason || saving} onClick={() => save('rechazada', { bounce_reason: bounceReason })} className="px-4 py-2 bg-rose-600 text-white rounded font-medium disabled:opacity-50">Rechazar</button>
            </>
          )}
          {isAdmin && (form.state === 'con_admin' || form.state === 'con_comprador') && (
            <>
              <button disabled={saving} onClick={() => save('aprobada')} className="px-4 py-2 bg-emerald-600 text-white rounded font-medium">Aprobar</button>
              <input placeholder="Motivo rechazo" value={bounceReason} onChange={e => setBounceReason(e.target.value)} className="border rounded px-2 py-1" />
              <button disabled={!bounceReason || saving} onClick={() => save('rechazada', { bounce_reason: bounceReason })} className="px-4 py-2 bg-rose-600 text-white rounded font-medium disabled:opacity-50">Rechazar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase text-slate-500 tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export { money };

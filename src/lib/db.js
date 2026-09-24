import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useInvoices(filter = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('invoices').select('*, uploader:uploader_id(nombre), buyer:buyer_id(nombre), cost_center:cost_center_id(codigo, nombre)').order('created_at', { ascending: false });
    if (filter.state) q = q.eq('state', filter.state);
    if (filter.uploader_id) q = q.eq('uploader_id', filter.uploader_id);
    if (filter.buyer_id) q = q.eq('buyer_id', filter.buyer_id);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }, [JSON.stringify(filter)]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

export function useCostCenters() {
  const [rows, setRows] = useState([]);
  const reload = useCallback(async () => {
    const { data } = await supabase.from('cost_centers').select('*').eq('activo', true).order('nombre');
    setRows(data || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, reload };
}

export function useProfiles() {
  const [rows, setRows] = useState([]);
  const reload = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*, user_roles(role)').order('nombre');
    setRows(data || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, reload };
}

export async function uploadInvoicePhoto(file, userId) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await supabase.storage.from('invoice-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function getPhotoUrl(path) {
  if (!path) return null;
  const { data } = await supabase.storage.from('invoice-photos').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result;
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function runOCR(base64, mimeType) {
  const res = await fetch('https://vuhjqjdpqievjdbacoge.supabase.co/functions/v1/ocr-factura', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM',
      'Authorization': 'Bearer sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM',
    },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!res.ok) throw new Error('OCR ' + res.status);
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  return j.data;
}

export async function logEvent(invoiceId, actorId, action, note) {
  await supabase.from('invoice_events').insert({ invoice_id: invoiceId, actor_id: actorId, action, note });
}

const ADMIN_USERS_URL = 'https://vuhjqjdpqievjdbacoge.supabase.co/functions/v1/admin-users';

async function adminCall(body) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  const apikey = 'sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM';
  const res = await fetch(ADMIN_USERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apikey,
      'Authorization': `Bearer ${token || apikey}`,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `admin-users HTTP ${res.status}`);
  return j;
}

export async function adminCreateUser({ email, password, nombre, roles }) {
  return adminCall({ action: 'create', email, password, nombre, roles });
}
export async function adminResetPassword(user_id, password) {
  return adminCall({ action: 'reset_password', user_id, password });
}
export async function adminDeleteUser(user_id) {
  return adminCall({ action: 'delete', user_id });
}

// -------- Tango Import (Cash Flow) --------
const TANGO_IMPORT_URL = 'https://vuhjqjdpqievjdbacoge.supabase.co/functions/v1/tango-import';

export async function adminTangoImport({ tipo, filename, file_b64 }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  const apikey = 'sb_publishable_uON1ciEGIhZrNRdSoHrWjA_oK0YDTxM';
  const res = await fetch(TANGO_IMPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apikey,
      'Authorization': `Bearer ${token || apikey}`,
    },
    body: JSON.stringify({ tipo, filename, file_b64 }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `tango-import HTTP ${res.status}`);
  return j;
}

export function useCashFlowRows(filters = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cash_flow_rows').select('*').order('fecha_vto', { ascending: true }).limit(500);
    if (filters.concepto) q = q.eq('concepto', filters.concepto);
    if (filters.desde)    q = q.gte('fecha_vto', filters.desde);
    if (filters.hasta)    q = q.lte('fecha_vto', filters.hasta);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }, [JSON.stringify(filters)]);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}

export function useImportBatches() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from('import_batches').select('*').order('created_at', { ascending: false }).limit(50);
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, reload: load };
}

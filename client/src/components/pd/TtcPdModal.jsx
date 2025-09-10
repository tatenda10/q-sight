import React, { useState } from 'react';

export default function TtcPdModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    portfolio: '',
    product: '',
    risk_band: '',
    bucket: 1,
    ttc_pd: '',
    valid_from: '',
    valid_to: ''
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">&times;</button>
        <h3 className="text-lg font-semibold mb-6 text-gray-900">Add TTC PD</h3>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Portfolio" value={form.portfolio} onChange={e => setForm(f => ({ ...f, portfolio: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Product" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Risk Band" value={form.risk_band} onChange={e => setForm(f => ({ ...f, risk_band: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Bucket" type="number" value={form.bucket} onChange={e => setForm(f => ({ ...f, bucket: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="TTC PD" type="number" value={form.ttc_pd} onChange={e => setForm(f => ({ ...f, ttc_pd: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Valid From" type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Valid To" type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} required />
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
} 
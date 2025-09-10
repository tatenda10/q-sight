import React, { useState } from 'react';

export default function MevModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    period: '',
    scenario: '',
    variable_name: '',
    value: ''
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">&times;</button>
        <h3 className="text-lg font-semibold mb-6 text-gray-900">Add Macroeconomic Variable</h3>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Period" type="date" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Scenario" value={form.scenario} onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Variable Name" value={form.variable_name} onChange={e => setForm(f => ({ ...f, variable_name: e.target.value }))} required />
          <input className="border border-gray-300 rounded px-3 py-2 w-full text-sm" placeholder="Value" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
} 
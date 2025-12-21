"use client";
import { useState, useEffect } from 'react';

const API_URL = "https://myspotnow-api.onrender.com";

export default function Admin() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null); // For Popup

  const refresh = async () => {
    const res = await fetch(`${API_URL}/queue/status`);
    const data = await res.json();
    setQueue(data.queue);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = async () => {
    await fetch(`${API_URL}/queue/next`, { method: "POST" });
    refresh();
  };

  const handleReset = async () => {
    if(confirm("Are you sure? This deletes everyone.")) {
        await fetch(`${API_URL}/queue/reset`, { method: "POST" });
        refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-10 border-b border-gray-800 pb-6">
         <div>
            <h1 className="text-3xl font-bold text-white">Vendor Panel</h1>
            <p className="text-gray-500">Manage your queue</p>
         </div>
         <div className="flex gap-4">
            <button onClick={handleReset} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition">Reset Queue</button>
            <button onClick={handleNext} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-500 transition">Call Next Customer</button>
         </div>
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
         {queue.map((p, index) => (
             <div key={p.token} onClick={() => setSelected(p)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95
                    ${index===0 ? 'bg-blue-600 border-blue-400 shadow-blue-900/50 shadow-xl' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}
                `}
             >
                <div className="flex justify-between items-start mb-4">
                    <span className={`text-2xl font-bold ${index===0 ? 'text-white' : 'text-gray-500'}`}>#{p.token}</span>
                    {index===0 && <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold">SERVING</span>}
                </div>
                <h3 className="font-bold text-lg truncate">{p.name}</h3>
                <p className={`text-sm mt-1 ${index===0 ? 'text-blue-100' : 'text-gray-400'}`}>
                    {p.services.length} services • {p.total_duration}m
                </p>
             </div>
         ))}
      </div>

      {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
              <p className="font-bold text-xl">Queue is Empty</p>
              <p className="text-sm">Wait for customers to join</p>
          </div>
      )}

      {/* POPUP MODAL */}
      {selected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                  <button onClick={() => setSelected(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white">✕</button>
                  
                  <div className="text-center">
                      <div className="inline-block px-4 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold mb-4">
                          Token #{selected.token}
                      </div>
                      <h2 className="text-3xl font-bold mb-1">{selected.name}</h2>
                      <p className="text-gray-400 text-lg font-mono">{selected.phone}</p>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6 mt-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Service List</h3>
                      <div className="flex flex-wrap gap-2">
                          {selected.services.map((s:string) => (
                              <span key={s} className="px-3 py-1 bg-gray-700 rounded-lg text-sm text-gray-300">{s}</span>
                          ))}
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between text-sm">
                          <span className="text-gray-500">Total Duration</span>
                          <span className="font-bold text-white">{selected.total_duration} Minutes</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
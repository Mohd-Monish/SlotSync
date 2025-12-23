"use client";
import { useState, useEffect } from 'react';

const API_URL = "https://myspotnow-api.onrender.com"; 

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [salonId, setSalonId] = useState("salon_101"); 
  const [menu, setMenu] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);

  // Auth & Init
  const handleLogin = async () => {
    // Fetch menu to verify salon exists and load services
    try {
        const res = await fetch(`${API_URL}/salons/${salonId}`);
        if(res.ok) {
             const json = await res.json();
             setMenu(json.menu || []);
             setIsLocked(false);
        } else { alert("Invalid Salon ID"); }
    } catch(e) { alert("Connection Error"); }
  };

  // Sync
  useEffect(() => {
    if(isLocked) return;
    const fetchQ = async () => {
        const res = await fetch(`${API_URL}/queue/status?salon_id=${salonId}`);
        setData(await res.json());
    };
    fetchQ();
    const interval = setInterval(fetchQ, 3000);
    return () => clearInterval(interval);
  }, [isLocked, salonId]);

  // API Call Wrapper
  const apiCall = async (endpoint: string, body: any) => {
      await fetch(`${API_URL}/queue/${endpoint}`, { 
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({...body, salon_id: salonId}) 
      });
  };

  const toggleEditSvc = (svc: string) => {
      if(editServices.includes(svc)) setEditServices(editServices.filter(s => s !== svc));
      else setEditServices([...editServices, svc]);
  };

  if (isLocked) return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Admin Portal</h1>
          <input className="p-4 bg-white/10 rounded-xl text-white mb-2" placeholder="Salon ID (e.g. salon_101)" value={salonId} onChange={e => setSalonId(e.target.value)} />
          <button onClick={handleLogin} className="px-8 py-3 bg-green-500 font-bold rounded-xl">Access</button>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
          <div className="flex justify-between mb-8">
              <h1 className="text-2xl font-bold">Managing: {salonId}</h1>
              <button onClick={() => setIsLocked(true)} className="text-red-500">Logout</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/10 p-6 rounded-2xl">
                  <p className="text-gray-400 text-xs uppercase">Waiting</p>
                  <p className="text-4xl font-bold">{data?.people_ahead || 0}</p>
              </div>
              <button onClick={() => apiCall("next", {})} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xl">
                  Call Next →
              </button>
          </div>

          <div className="space-y-3">
              {data?.queue.map((p: any, i: number) => (
                  <div key={p.token} className={`p-4 rounded-xl flex justify-between items-center ${i===0 ? 'bg-green-900/20 border border-green-500' : 'bg-white/5'}`}>
                      <div>
                          <span className="font-bold text-lg mr-3">#{p.token}</span>
                          <span>{p.name}</span>
                          <p className="text-xs text-gray-500">{p.services.join(", ")}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => { setEditingUser(p); setEditServices(p.services); }} className="p-2 bg-gray-700 rounded">✎</button>
                          <button onClick={() => apiCall("delete", {token: p.token})} className="p-2 bg-red-900/50 text-red-500 rounded">✕</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-sm">
                  <h3 className="font-bold mb-4">Edit Services</h3>
                  <div className="space-y-2 mb-4">
                      {menu.map(s => (
                          <div key={s.name} onClick={() => toggleEditSvc(s.name)} className={`p-3 border cursor-pointer ${editServices.includes(s.name) ? 'bg-blue-600 border-blue-600' : 'border-gray-700'}`}>
                              {s.name}
                          </div>
                      ))}
                  </div>
                  <button onClick={() => { apiCall("edit", {token: editingUser.token, services: editServices}); setEditingUser(null); }} className="w-full bg-green-500 py-3 font-bold rounded">Save</button>
              </div>
          </div>
      )}
    </div>
  );
}
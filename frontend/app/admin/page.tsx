"use client";
import { useState, useEffect } from 'react';

// 👇 YOUR RENDER LINK (Backend is still live)
const API_URL = "https://myspotnow-api.onrender.com"; 

const ALL_SERVICES = [
  { name: "Haircut", time: 20 }, { name: "Shave", time: 10 },
  { name: "Head Massage", time: 15 }, { name: "Facial", time: 30 },
  { name: "Hair Color", time: 45 },
];

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  
  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [salonId, setSalonId] = useState("salon_101"); // Default ID
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Edit State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);

  // --- LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) { 
            setIsLocked(false); 
            refresh(); 
        } 
        else { setError("Invalid Credentials"); }
    } catch (err) { setError("Connection Failed"); }
    setLoading(false);
  };

  // --- SYNC ---
  useEffect(() => {
    if(isLocked) return;
    refresh();
    const poller = setInterval(refresh, 3000);
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, [isLocked, salonId]);

  const refresh = async () => {
    try {
        // Send salon_id to get THAT specific queue
        const res = await fetch(`${API_URL}/queue/status?salon_id=${salonId}`);
        const json = await res.json();
        setData((prev: any) => {
            if (JSON.stringify(prev?.queue) !== JSON.stringify(json.queue)) return json;
            return prev;
        });
        if (Math.abs(json.seconds_left - timeLeft) > 2) setTimeLeft(json.seconds_left);
    } catch (e) { console.error("API Error"); }
  };

  // --- API ACTIONS ---
  const apiCall = async (endpoint: string, body: any) => {
      // Always attach salon_id so backend knows which queue to update
      const payload = { ...body, salon_id: salonId };
      await fetch(`${API_URL}/queue/${endpoint}`, { 
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) 
      });
      refresh();
  };

  const handleNext = async () => apiCall("next", {});
  const handleReset = async () => { if(confirm("DELETE ALL DATA?")) apiCall("reset", {}); };
  const moveUser = (token: number, dir: string, e: any) => { e.stopPropagation(); apiCall("move", { token, direction: dir }); };
  const deleteUser = (token: number, e: any) => { e.stopPropagation(); if(confirm("Remove?")) apiCall("delete", { token }); };
  const serveNow = (token: number, e: any) => { e.stopPropagation(); if(confirm("Jump to front?")) apiCall("serve-now", { token }); };
  const saveEdit = async () => { await apiCall("edit", { token: editingUser.token, services: editServices }); setEditingUser(null); };
  
  const toggleEditService = (svc: string) => {
      if(editServices.includes(svc)) setEditServices(editServices.filter(s => s !== svc));
      else setEditServices([...editServices, svc]);
  };

  const formatTime = (s: number) => { 
    if (typeof s !== 'number' || isNaN(s)) return "0:00"; 
    const m = Math.floor(s / 60); const sc = s % 60; 
    return `${m}:${sc < 10 ? '0' : ''}${sc}`; 
  };

  // --- LOGIN SCREEN ---
  if (isLocked) return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
              <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                  <p className="text-gray-500 text-sm">Secure Access Required</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                   <div className="group">
                        <label className="text-xs text-gray-500 uppercase font-bold ml-1">Salon ID</label>
                        <input className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors" 
                            placeholder="e.g. salon_101" value={salonId} onChange={e => setSalonId(e.target.value)} />
                   </div>
                  <input className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                  
                  {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded">{error}</p>}
                  
                  <button disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all transform active:scale-95">
                    {loading ? "Authenticating..." : "Access Dashboard"}
                  </button>
              </form>
          </div>
      </div>
  );

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black text-white p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                  <p className="text-sm text-green-400 font-mono mt-1">Managing: {salonId}</p>
              </div>
              <button onClick={() => setIsLocked(true)} className="text-xs text-red-400 border border-red-500/20 px-4 py-2 rounded-full hover:bg-red-500/10 transition">Logout</button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                  <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Current Wait</p>
                  <p className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{formatTime(timeLeft)}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">People Waiting</p>
                  <p className="text-5xl font-bold text-white">{data?.people_ahead || 0}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col justify-center gap-3 sm:col-span-2 lg:col-span-1">
                  <button onClick={handleNext} disabled={!data?.queue?.length} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all">
                      Call Next Customer →
                  </button>
                  <button onClick={handleReset} className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors flex items-center justify-center gap-2">
                      <span>⚠</span> RESET QUEUE
                  </button>
              </div>
          </div>

          {/* QUEUE LIST */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-400 mb-4 px-2">Active Queue</h2>
            {data?.queue.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl text-gray-600">No customers in queue</div>
            )}
            {data?.queue.map((p: any, index: number) => (
                <div key={p.token} className={`relative group flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${index===0 ? 'bg-gradient-to-r from-blue-900/20 to-blue-900/10 border-blue-500/50' : 'bg-neutral-900/50 border-white/5'}`}>
                    <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${index===0 ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}>{p.token}</div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-xl text-white">{p.name}</h3>
                                {index === 0 && <span className="bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">SERVING</span>}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{p.services.join(", ")}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto justify-end border-t border-white/5 pt-4 md:pt-0 md:border-t-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditingUser(p); setEditServices(p.services); }} className="p-3 bg-neutral-800 hover:bg-white hover:text-black text-gray-300 rounded-xl">✎</button>
                        <button onClick={(e) => moveUser(p.token, "up", e)} disabled={index === 0} className="p-3 bg-neutral-800 hover:bg-blue-600 text-gray-300 rounded-xl disabled:opacity-20">⬆</button>
                        <button onClick={(e) => moveUser(p.token, "down", e)} disabled={index === data.queue.length - 1} className="p-3 bg-neutral-800 hover:bg-blue-600 text-gray-300 rounded-xl disabled:opacity-20">⬇</button>
                        <button onClick={(e) => deleteUser(p.token, e)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl">✕</button>
                    </div>
                </div>
            ))}
          </div>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-neutral-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-bold mb-1 text-white">Edit Services</h3>
                  <div className="space-y-2 mb-8">
                      {ALL_SERVICES.map(svc => (
                          <div key={svc.name} onClick={() => toggleEditService(svc.name)} className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all duration-200 ${editServices.includes(svc.name) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-white/5 text-gray-400'}`}>
                              <span className="font-medium">{svc.name}</span>
                              <span className="text-xs opacity-60 bg-black/20 px-2 py-1 rounded">{svc.time}m</span>
                          </div>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEditingUser(null)} className="py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">Cancel</button>
                    <button onClick={saveEdit} className="py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
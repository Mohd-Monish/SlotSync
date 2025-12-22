"use client";
import { useState, useEffect } from 'react';

// 👇 YOUR RENDER LINK
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) { setIsLocked(false); refresh(); } 
        else { setError("Invalid Credentials"); }
    } catch (err) { setError("Connection Failed"); }
    setLoading(false);
  };

  useEffect(() => {
    if(isLocked) return;
    refresh();
    const poller = setInterval(refresh, 3000);
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, [isLocked]);

  const refresh = async () => {
    try {
        const res = await fetch(`${API_URL}/queue/status`);
        const json = await res.json();
        setData((prev: any) => {
            if (JSON.stringify(prev?.queue) !== JSON.stringify(json.queue)) return json;
            return prev;
        });
        if (Math.abs(json.seconds_left - timeLeft) > 2) setTimeLeft(json.seconds_left);
    } catch (e) { console.error("API Error"); }
  };

  const apiCall = async (endpoint: string, body: any) => {
      await fetch(`${API_URL}/queue/${endpoint}`, { 
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) 
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

  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };

  // --- LOGIN SCREEN (Responsive Center) ---
  if (isLocked) return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 text-2xl shadow-[0_0_15px_rgba(74,222,128,0.2)]">🔒</div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal</h1>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-2">Secure Access Required</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                  <input className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                  <input type="password" className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                  {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded font-bold">{error}</p>}
                  <button disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all transform active:scale-95">
                    {loading ? "Authenticating..." : "Access Dashboard"}
                  </button>
              </form>
          </div>
      </div>
  );

  // --- DASHBOARD (Responsive Grid) ---
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black text-white font-sans selection:bg-green-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <span className="text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">SlotSync Admin</span>
            <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 hidden sm:block">Logged in as {username}</span>
                <button onClick={() => setIsLocked(true)} className="text-xs font-bold text-red-400 hover:text-white transition-colors border border-red-500/20 px-3 py-1.5 rounded-full">Logout</button>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
          
          {/* STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
              
              {/* Timer Card */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-green-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-green-500/20"></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Estimated Wait</p>
                    <div className="text-5xl md:text-6xl font-mono font-bold text-white tracking-tighter">{formatTime(timeLeft)}</div>
                  </div>
              </div>

              {/* Queue Count Card */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">People Waiting</p>
                    <div className="text-5xl md:text-6xl font-bold text-white tracking-tighter">{data?.people_ahead || 0}</div>
                  </div>
              </div>

              {/* Actions Panel */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col justify-center gap-3 sm:col-span-2 lg:col-span-1">
                  <button onClick={handleNext} disabled={!data?.queue?.length} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                      Call Next Customer <span>→</span>
                  </button>
                  <button onClick={handleReset} className="text-red-400 text-xs font-bold hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 py-3 rounded-xl flex items-center justify-center gap-2">
                      <span>⚠</span> RESET SYSTEM DATA
                  </button>
              </div>
          </div>

          {/* QUEUE HEADER */}
          <div className="flex items-end justify-between px-2 mb-4">
            <h2 className="text-xl font-bold text-gray-200">Active Queue</h2>
            <span className="text-xs text-gray-500">{data?.queue.length || 0} customers total</span>
          </div>

          {/* QUEUE LIST */}
          <div className="space-y-3">
            {data?.queue.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                    <div className="text-4xl mb-4 opacity-50">☕</div>
                    <p className="text-gray-500 font-medium">No customers in queue</p>
                    <p className="text-xs text-gray-600 mt-1">Ready for new bookings</p>
                </div>
            )}

            {data?.queue.map((p: any, index: number) => (
                <div key={p.token} onClick={() => setSelectedUser(p)} 
                    className={`relative group flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all duration-300
                    ${index===0 
                        ? 'bg-gradient-to-r from-blue-900/30 to-blue-900/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.01]' 
                        : 'bg-neutral-900/40 border-white/5 hover:bg-neutral-800 hover:border-white/10'
                    }`}>
                    
                    {/* Left Side: Customer Info */}
                    <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-bold shadow-lg ${index===0 ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                            {p.token}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-lg md:text-xl text-white truncate max-w-[150px] md:max-w-xs">{p.name}</h3>
                                {index === 0 && <span className="bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Serving Now</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">{p.services.length} Services</span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500 truncate max-w-[200px]">{p.services.join(", ")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Action Buttons */}
                    <div className="flex gap-2 w-full md:w-auto justify-end border-t border-white/5 pt-3 md:pt-0 md:border-t-0 opacity-100 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingUser(p); setEditServices(p.services); }} className="flex-1 md:flex-none py-2 px-3 md:p-3 bg-white/5 hover:bg-white hover:text-black text-gray-300 rounded-xl transition-colors text-sm font-bold flex items-center justify-center gap-1">
                             <span className="md:hidden">Edit</span> ✎
                        </button>
                        
                        <div className="w-px h-auto bg-white/10 mx-1 hidden md:block"></div>
                        
                        <div className="flex gap-1 flex-1 md:flex-none">
                            <button onClick={(e) => moveUser(p.token, "up", e)} disabled={index === 0} className="flex-1 md:flex-none py-2 px-3 md:p-3 bg-white/5 hover:bg-blue-600 text-gray-300 rounded-xl disabled:opacity-20 transition-colors">⬆</button>
                            <button onClick={(e) => moveUser(p.token, "down", e)} disabled={index === data.queue.length - 1} className="flex-1 md:flex-none py-2 px-3 md:p-3 bg-white/5 hover:bg-blue-600 text-gray-300 rounded-xl disabled:opacity-20 transition-colors">⬇</button>
                        </div>
                        
                        <div className="w-px h-auto bg-white/10 mx-1 hidden md:block"></div>

                        {index !== 0 && <button onClick={(e) => serveNow(p.token, e)} className="flex-1 md:flex-none py-2 px-3 md:p-3 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-xl transition-colors font-bold" title="Jump to front">⚡</button>}
                        <button onClick={(e) => deleteUser(p.token, e)} className="flex-1 md:flex-none py-2 px-3 md:p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold">✕</button>
                    </div>
                </div>
            ))}
          </div>
      </div>

      {/* EDIT MODAL (Glassmorphism) */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-neutral-900 border-t sm:border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-5">
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden"></div>
                  <h3 className="text-xl font-bold mb-1 text-white">Edit Services</h3>
                  <p className="text-gray-500 text-sm mb-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Customer #{editingUser.token}</p>
                  
                  <div className="space-y-2 mb-8 max-h-[40vh] overflow-y-auto pr-1">
                      {ALL_SERVICES.map(svc => (
                          <div key={svc.name} onClick={() => toggleEditService(svc.name)} 
                            className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all duration-200 active:scale-98 ${editServices.includes(svc.name) ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-neutral-800 border-white/5 text-gray-400 hover:bg-neutral-700'}`}>
                              <span className="font-medium">{svc.name}</span>
                              <span className={`text-xs px-2 py-1 rounded font-bold ${editServices.includes(svc.name) ? 'bg-black/20 text-white' : 'bg-black/20 text-gray-500'}`}>{svc.time}m</span>
                          </div>
                      ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEditingUser(null)} className="py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">Cancel</button>
                    <button onClick={saveEdit} className="py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors shadow-lg shadow-green-900/20">Save Changes</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
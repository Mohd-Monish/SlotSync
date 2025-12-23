"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // 👈 Added for routing

// 👇 YOUR RENDER LINK
const API_URL = "https://myspotnow-api.onrender.com"; 

const SERVICES = [ 
    { name: "Haircut", time: 20 }, 
    { name: "Shave", time: 10 }, 
    { name: "Head Massage", time: 15 }, 
    { name: "Facial", time: 30 }, 
    { name: "Hair Color", time: 45 }
];

export default function SalonBooking() {
  const params = useParams(); // 👈 Get Salon ID
  const router = useRouter(); // 👈 For Back Button
  const salonId = params.id;

  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // UI State
  const [view, setView] = useState("home"); 
  const [form, setForm] = useState({ username: "", password: "", name: "", phone: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  
  // Local Timer State (For smooth countdown)
  const [displayTime, setDisplayTime] = useState(0);

  // --- SYNC ---
  useEffect(() => {
    const savedUser = localStorage.getItem('slotSync_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    fetchStatus();
    // Poll server every 3 seconds to sync up
    const poller = setInterval(fetchStatus, 3000);
    
    // Local countdown every 1 second
    const timer = setInterval(() => {
        setDisplayTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => { clearInterval(poller); clearInterval(timer); };
  }, [salonId]); // 👈 Refresh when ID changes

  const fetchStatus = async () => {
    try {
      // 👇 NEW: Sending salon_id
      const res = await fetch(`${API_URL}/queue/status?salon_id=${salonId}`);
      const json = await res.json();
      setData(json);
    } catch (e) { console.error("API Error"); }
  };

  // Update local timer when server data changes
  useEffect(() => {
      if (data && currentUser) {
          const myItem = data.queue.find((p:any) => p.phone === currentUser.phone);
          if (myItem) {
              if (Math.abs(myItem.estimated_wait - displayTime) > 2) {
                  setDisplayTime(myItem.estimated_wait);
              }
          }
      }
  }, [data, currentUser]);

  // --- ACTIONS ---
  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault(); setLoading(true); setError("");
      try {
          const res = await fetch(`${API_URL}/auth/login`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: form.username, password: form.password })
          });
          if (res.ok) {
              const json = await res.json();
              const user = { username: form.username, name: json.name, phone: json.phone };
              setCurrentUser(user);
              localStorage.setItem('slotSync_user', JSON.stringify(user));
              setView("home");
          } else { setError("Invalid Credentials"); }
      } catch (err) { setError("Server Error"); }
      setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault(); setLoading(true); setError("");
      try {
          const res = await fetch(`${API_URL}/auth/signup`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form)
          });
          if (res.ok) { alert("Created! Please Login."); setView("login"); } 
          else { const err = await res.json(); setError(err.detail || "Failed"); }
      } catch (err) { setError("Server Error"); }
      setLoading(false);
  };

  const handleJoin = async () => {
    if (selected.length === 0) return alert("Select a service");
    setLoading(true);
    await fetch(`${API_URL}/queue/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // 👇 NEW: Sending salon_id in body
        body: JSON.stringify({ 
            salon_id: salonId,
            name: currentUser.name, 
            phone: currentUser.phone, 
            services: selected 
        }),
    });
    setLoading(false); setView("home"); setSelected([]); fetchStatus();
  };

  const handleAddServices = async () => {
      if (selected.length === 0) return alert("Select at least one service");
      setLoading(true);
      
      const myItem = data?.queue.find((p:any) => p.phone === currentUser?.phone);
      if(!myItem) return;

      await fetch(`${API_URL}/queue/add-service`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: myItem.token, new_services: selected }),
      });
      setLoading(false); setShowAddService(false); setSelected([]); fetchStatus();
  };

  const handleCancel = async (token: number) => {
      if(!confirm("Cancel your booking?")) return;
      setLoading(true);
      await fetch(`${API_URL}/queue/cancel`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
      });
      setLoading(false); fetchStatus();
  };

  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  // Safe time formatting (Fixes NaN issue)
  const formatTime = (s: any) => {
    if (typeof s !== 'number' || isNaN(s)) return "0:00"; 
    const mins = Math.floor(s / 60); const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- DERIVED STATE ---
  const myQueueItem = data?.queue.find((p:any) => p.phone === currentUser?.phone);
  const amIInQueue = !!myQueueItem;
  const myIndex = data?.queue.findIndex((p:any) => p.phone === currentUser?.phone);
  const peopleAhead = myIndex > 0 ? myIndex : 0;
  const isServingNow = amIInQueue && myIndex === 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex items-center justify-center p-4 md:p-8 font-sans text-gray-200">
      
      <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden">
         
         {/* HEADER */}
         <div className="flex justify-between items-center p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
                {/* 👇 Back Button added gracefully */}
                <button onClick={() => router.push('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white">←</button>
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">SlotSync</h1>
            </div>
            
            {currentUser ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{currentUser.name}</span>
                    <button onClick={() => { localStorage.removeItem('slotSync_user'); setCurrentUser(null); }} className="text-[10px] text-red-400 border border-red-500/20 px-2 py-1 rounded-full">Logout</button>
                </div>
            ) : <button onClick={() => setView("login")} className="text-sm text-green-400 font-bold">Login</button>}
         </div>

         {view === "home" && (
             <div className="p-8 text-center">
                 {amIInQueue ? (
                     <>
                        {isServingNow ? (
                            <div className="mb-8 animate-pulse">
                                <div className="text-6xl mb-2">✂️</div>
                                <h2 className="text-3xl font-black text-green-500">SERVING NOW</h2>
                                <p className="text-gray-400 text-sm">Please proceed to the chair</p>
                            </div>
                        ) : (
                            <div className="mb-8">
                                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Your Wait Time</p>
                                {/* USES LOCAL DISPLAY TIME FOR SMOOTHNESS */}
                                <div className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                    {formatTime(displayTime)}
                                </div>
                                <div className="mt-4 flex justify-center gap-4">
                                    <div className="bg-white/5 px-4 py-2 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase">Token</p>
                                        <p className="text-xl font-bold text-white">#{myQueueItem.token}</p>
                                    </div>
                                    <div className="bg-white/5 px-4 py-2 rounded-lg">
                                        <p className="text-[10px] text-gray-500 uppercase">Ahead</p>
                                        <p className="text-xl font-bold text-white">{peopleAhead}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-2 justify-center mt-6">
                             <button onClick={() => setShowAddService(true)} className="px-4 py-2 bg-blue-600/20 text-blue-400 text-sm font-bold rounded-lg hover:bg-blue-600 hover:text-white transition">
                                 + Add Services
                             </button>
                             {/* HIDE CANCEL BUTTON IF SERVING */}
                             {!isServingNow && (
                                <button onClick={() => handleCancel(myQueueItem.token)} disabled={loading} className="px-4 py-2 bg-red-600/20 text-red-400 text-sm font-bold rounded-lg hover:bg-red-600 hover:text-white transition">
                                    Cancel
                                </button>
                             )}
                        </div>
                     </>
                 ) : (
                     <div className="mb-8">
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Current Queue</p>
                         <div className="text-5xl font-black text-white mb-2">{data?.people_ahead || 0}</div>
                         <p className="text-sm text-gray-400">People Waiting</p>
                         <button onClick={() => currentUser ? setView("join") : setView("login")} className="mt-6 w-full bg-green-500 text-black font-bold py-4 rounded-xl hover:bg-green-400 transition">
                             {currentUser ? "Book a Slot" : "Login to Book"}
                         </button>
                     </div>
                 )}

                 <div className="mt-8 pt-8 border-t border-white/5 text-left">
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Up Next</h3>
                     <div className="space-y-2">
                         {data?.queue.slice(0, 5).map((p:any, i:number) => (
                             <div key={p.token} className={`p-3 rounded-xl flex justify-between items-center ${i===0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/5'}`}>
                                 <div className="flex items-center gap-3">
                                     <span className={`text-sm font-bold ${i===0 ? 'text-green-400' : 'text-gray-500'}`}>#{p.token}</span>
                                     <span className="text-sm font-medium text-gray-200">{p.name}</span>
                                 </div>
                                 {i===0 && <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded font-bold">Serving</span>}
                                 {i>0 && <span className="text-[10px] text-gray-500">~{formatTime(p.estimated_wait)}</span>}
                             </div>
                         ))}
                         {data?.queue.length === 0 && <p className="text-center text-sm text-gray-600 italic py-4">Queue is empty</p>}
                     </div>
                 </div>
             </div>
         )}

         {/* ADD SERVICE MODAL (With Disabled Duplicates) */}
         {showAddService && (
             <div className="absolute inset-0 bg-black/90 z-50 p-8 animate-in slide-in-from-bottom duration-300">
                <h2 className="text-xl font-bold text-white mb-4">Add More Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {SERVICES.map(s => {
                        const alreadyHas = myQueueItem?.services.includes(s.name);
                        return (
                            <button 
                                key={s.name} 
                                onClick={() => !alreadyHas && toggleService(s.name)} 
                                disabled={alreadyHas}
                                className={`p-3 rounded-xl text-sm font-bold border transition-all 
                                    ${alreadyHas 
                                        ? 'bg-neutral-800 text-gray-600 border-transparent cursor-not-allowed opacity-50' 
                                        : selected.includes(s.name) 
                                            ? 'bg-blue-500 text-white border-blue-500' 
                                            : 'bg-white/5 text-gray-400 border-white/5'
                                    }`}
                            >
                                {s.name} 
                                <span className="block text-[10px] opacity-60 font-normal">
                                    {alreadyHas ? "Added" : `${s.time}m`}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddServices} disabled={loading} className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-400">Update</button>
                    <button onClick={() => { setShowAddService(false); setSelected([]); }} className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl">Cancel</button>
                </div>
             </div>
         )}

         {/* LOGIN / SIGNUP / JOIN VIEWS */}
         {view === "login" && (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <button disabled={loading} className="w-full bg-white text-black font-bold py-4 rounded-xl">{loading ? "..." : "Login"}</button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer" onClick={()=>setView("signup")}>Create Account</p>
                    <p className="text-center text-xs text-gray-600 mt-2 cursor-pointer" onClick={()=>setView("home")}>Back</p>
                </form>
            </div>
         )}

         {view === "signup" && (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
                <form onSubmit={handleSignup} className="space-y-3">
                    <input className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Phone (10 digits)" maxLength={10} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <button disabled={loading} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl mt-2">{loading ? "..." : "Sign Up"}</button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer" onClick={()=>setView("login")}>Back to Login</p>
                </form>
            </div>
         )}

         {view === "join" && (
             <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">Select Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {SERVICES.map(s => (
                        <button key={s.name} onClick={() => toggleService(s.name)} className={`p-3 rounded-xl text-sm font-bold border transition-all ${selected.includes(s.name) ? 'bg-green-500 text-black border-green-500' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                            {s.name} <span className="block text-[10px] opacity-60 font-normal">{s.time}m</span>
                        </button>
                    ))}
                </div>
                <button onClick={handleJoin} disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200">{loading ? "..." : "Confirm"}</button>
                <p className="text-center text-xs text-gray-600 mt-4 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
             </div>
         )}
      </div>
    </main>
  );
}
"use client";
import { useState, useEffect } from 'react';

// 👇 YOUR RENDER LINK
const API_URL = "https://myspotnow-api.onrender.com"; 

const SERVICES = [ 
    { name: "Haircut", time: 20 }, 
    { name: "Shave", time: 10 }, 
    { name: "Head Massage", time: 15 }, 
    { name: "Facial", time: 30 }, 
    { name: "Hair Color", time: 45 }
];

export default function Home() {
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
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      const json = await res.json();
      setData(json);
    } catch (e) { console.error("API Error"); }
  };

  // Update local timer when server data changes (Correction Logic)
  useEffect(() => {
      if (data && currentUser) {
          const myItem = data.queue.find((p:any) => p.phone === currentUser.phone);
          if (myItem) {
              // If server says 100s, and we are at 99s, don't jump. Only jump if diff is huge.
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
        body: JSON.stringify({ name: currentUser.name, phone: currentUser.phone, services: selected }),
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

  if (!data) return (
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black z-50 flex flex-col items-center justify-center">
          <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
              <img src="/logo_no-text.png" alt="Loading" className="w-24 h-24 object-contain animate-spin relative z-10" />
          </div>
          <p className="mt-8 text-green-500/50 text-xs font-mono tracking-[0.5em] animate-pulse">SYNCHRONIZING</p>
      </div>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex items-center justify-center p-4 md:p-8 font-sans text-gray-200 overflow-hidden">
      
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* LEFT SIDE - DESKTOP HERO */}
          <div className="hidden lg:flex flex-col space-y-8 animate-in slide-in-from-left-10 duration-1000 fade-in">
              <div className="w-32 h-32 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl shadow-green-900/20 animate-bounce">
                  <img src="/logo_no-text.png" alt="SlotSync Logo" className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
              </div>
              
              <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 tracking-tight animate-in slide-in-from-bottom-5 duration-1000 delay-100">
                  SlotSync
              </h1>
              <p className="text-2xl text-gray-400 max-w-lg leading-relaxed font-light animate-in slide-in-from-bottom-5 duration-1000 delay-200">
                  The smartest way to manage your time. <br/>
                  <span className="text-white font-medium">Book appointments</span>, track live queues, and save hours every week.
              </p>
              
              <div className="flex gap-8 pt-8 border-t border-white/10 animate-in slide-in-from-bottom-5 duration-1000 delay-300">
                  <div className="group cursor-default">
                      <p className="text-4xl font-bold text-white group-hover:text-green-400 transition-colors">Live</p>
                      <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">Queue Updates</p>
                  </div>
                  <div className="w-px h-16 bg-white/10"></div>
                  <div className="group cursor-default">
                      <p className="text-4xl font-bold text-white group-hover:text-blue-400 transition-colors">0m</p>
                      <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">Wasted Time</p>
                  </div>
              </div>
          </div>

          {/* RIGHT SIDE - APP INTERFACE */}
          <div className="flex flex-col items-center lg:items-end w-full">
              
              {/* Header (Adaptive) */}
              <div className="w-full max-w-md flex justify-between items-center mb-6 px-2 animate-in fade-in slide-in-from-top-5 duration-700">
                  {/* Mobile Logo */}
                  <div className="lg:hidden flex items-center gap-3">
                      <img src="/logo_no-text.png" alt="Logo" className="w-8 h-8 object-contain" />
                      <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">SlotSync</h1>
                  </div>
                  
                  {/* Desktop Spacer */}
                  <div className="hidden lg:block"></div>

                  {/* User Controls */}
                  {currentUser ? (
                      <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg hover:bg-white/10 transition-all">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span className="text-sm text-gray-300 font-medium">Hi, {currentUser.name}</span>
                          <button onClick={() => { localStorage.removeItem('slotSync_user'); setCurrentUser(null); setView("home"); }} className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors ml-2">Logout</button>
                      </div>
                  ) : (
                      <button onClick={() => setView("login")} className="text-sm text-green-400 font-bold hover:text-green-300 transition-colors px-4 py-2 rounded-full hover:bg-green-500/10">Login</button>
                  )}
              </div>

              {/* Main Card */}
              <div className="w-full max-w-md bg-neutral-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500 ring-1 ring-white/5">
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-50"></div>
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none mix-blend-screen animate-pulse"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none mix-blend-screen animate-pulse delay-700"></div>

                {/* VIEW: HOME */}
                {view === "home" && (
                    <div className="p-8 md:p-10 text-center relative z-10 flex flex-col h-full justify-center min-h-[500px]">
                        
                        {amIInQueue ? (
                            <>
                                {isServingNow ? (
                                    <div className="mb-8 animate-pulse">
                                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <img src="/logo_no-text.png" alt="Serving" className="w-16 h-16 object-contain animate-spin" />
                                        </div>
                                        <h2 className="text-3xl font-black text-green-500">SERVING NOW</h2>
                                        <p className="text-gray-400 text-sm">Please proceed to the chair</p>
                                    </div>
                                ) : (
                                    <div className="mb-12 relative group">
                                        <p className="text-xs font-bold text-green-400 uppercase tracking-[0.3em] mb-6 opacity-80">Estimated Wait</p>
                                        <div className="relative inline-block">
                                            <div className="text-8xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_40px_rgba(34,197,94,0.2)] group-hover:scale-105 transition-transform duration-500">
                                                {formatTime(displayTime)}
                                            </div>
                                            <div className="absolute -inset-10 bg-green-500/5 blur-2xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        </div>
                                        
                                        <div className="mt-8 flex justify-center gap-4">
                                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Token</p>
                                                <p className="text-2xl font-bold text-white">#{myQueueItem.token}</p>
                                            </div>
                                            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ahead</p>
                                                <p className="text-2xl font-bold text-white">{peopleAhead}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-center mt-6">
                                     <button onClick={() => setShowAddService(true)} className="px-6 py-3 bg-blue-600/20 text-blue-400 text-sm font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20">
                                         + Add Services
                                     </button>
                                     {!isServingNow && (
                                        <button onClick={() => handleCancel(myQueueItem.token)} disabled={loading} className="px-6 py-3 bg-red-600/20 text-red-400 text-sm font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20">
                                            Cancel
                                        </button>
                                     )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-12 flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-200">
                                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">People Ahead</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-6xl font-black text-white tracking-tighter">{data?.people_ahead || 0}</span>
                                        <span className="text-lg text-gray-600 font-medium">users</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => currentUser ? setView("join") : setView("login")}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black py-5 rounded-2xl text-lg shadow-lg shadow-green-900/20 transition-all transform hover:scale-[1.02] active:scale-95 relative overflow-hidden group"
                                >
                                    <span className="relative z-10">{currentUser ? "Book Appointment" : "Login to Book"}</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                </button>
                            </>
                        )}

                        {/* UP NEXT LIST */}
                        <div className="mt-10 pt-8 border-t border-white/5 text-left">
                             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 pl-2">Up Next</h3>
                             <div className="space-y-2">
                                 {data?.queue.slice(0, 3).map((p:any, i:number) => (
                                     <div key={p.token} className={`p-3 rounded-xl flex justify-between items-center transition-all hover:bg-white/5 ${i===0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-transparent border border-transparent'}`}>
                                         <div className="flex items-center gap-3">
                                             <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg ${i===0 ? 'bg-green-500 text-black' : 'bg-white/10 text-gray-500'}`}>#{p.token}</span>
                                             <span className="text-sm font-medium text-gray-200">{p.name}</span>
                                         </div>
                                         {i===0 && <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded font-bold animate-pulse">Serving</span>}
                                         {i>0 && <span className="text-[10px] text-gray-500">~{formatTime(p.estimated_wait)}</span>}
                                     </div>
                                 ))}
                                 {data?.queue.length === 0 && <p className="text-center text-sm text-gray-600 italic py-4">Queue is empty</p>}
                             </div>
                        </div>
                    </div>
                )}

                {/* LOGIN FORM */}
                {view === "login" && (
                    <div className="p-8 md:p-10 relative z-10 h-full flex flex-col justify-center min-h-[500px] animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <img src="/logo_no-text.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-lg" />
                            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-gray-500 text-sm">Enter your credentials to access</p>
                        </div>
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-4">
                                <div className="group relative">
                                    <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all pl-12" placeholder="Username" 
                                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                                    <span className="absolute left-4 top-4 text-gray-500">@</span>
                                </div>
                                <div className="group relative">
                                    <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all pl-12" placeholder="Password" 
                                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                                    <span className="absolute left-4 top-4 text-gray-500">🔒</span>
                                </div>
                            </div>
                            
                            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center animate-in shake">{error}</div>}
                            
                            <button disabled={loading} className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-xl transition-all transform active:scale-95 mt-4 shadow-lg">
                                {loading ? "Authenticating..." : "Login"}
                            </button>
                            
                            <div className="flex flex-col items-center gap-4 mt-8">
                                <p className="text-sm text-gray-500">Don't have an account? <span className="text-green-400 font-bold cursor-pointer hover:underline" onClick={()=>setView("signup")}>Sign up</span></p>
                                <p className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" onClick={()=>setView("home")}>Cancel</p>
                            </div>
                        </form>
                    </div>
                )}

                {/* SIGNUP FORM */}
                {view === "signup" && (
                    <div className="p-8 md:p-10 relative z-10 h-full flex flex-col justify-center min-h-[500px] animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                            <p className="text-gray-500 text-sm">Join us to book your slot</p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-3">
                            <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Full Name" 
                                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Phone (10 digits)" maxLength={10}
                                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Username" 
                                value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                            <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Password" 
                                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                            
                            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center animate-in shake">{error}</div>}
                            
                            <button disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all transform active:scale-95 mt-4">
                                {loading ? "Creating Account..." : "Sign Up"}
                            </button>
                            
                            <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <span className="text-green-400 font-bold cursor-pointer hover:underline" onClick={()=>setView("login")}>Login</span></p>
                        </form>
                    </div>
                )}

                {/* JOIN FORM */}
                {view === "join" && (
                    <div className="p-8 md:p-10 relative z-10 h-full flex flex-col justify-center min-h-[500px] animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Select Services</h2>
                            <p className="text-gray-500 text-sm">Choose what you need today</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {SERVICES.map(s => (
                                <button key={s.name} onClick={() => toggleService(s.name)}
                                    className={`p-4 rounded-2xl text-sm font-bold border transition-all duration-200 flex flex-col items-start gap-1 relative overflow-hidden group
                                    ${selected.includes(s.name) 
                                        ? 'bg-green-500 text-black border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]' 
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                >
                                    <span className="relative z-10">{s.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full relative z-10 ${selected.includes(s.name) ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-500'}`}>{s.time}m</span>
                                    
                                    {/* Selection Glow */}
                                    {selected.includes(s.name) && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                </button>
                            ))}
                        </div>
                        
                        <button onClick={handleJoin} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-black font-black py-4 rounded-xl shadow-lg transition-all transform active:scale-95">
                            {loading ? "Processing..." : "Confirm Booking"}
                        </button>
                        
                        <p className="text-center text-xs text-gray-600 mt-6 cursor-pointer hover:text-gray-400 transition-colors" onClick={()=>setView("home")}>Cancel</p>
                    </div>
                )}

                {/* ADD SERVICE MODAL */}
                {showAddService && (
                    <div className="absolute inset-0 bg-black/90 z-50 p-8 animate-in slide-in-from-bottom duration-300 flex flex-col justify-center">
                        <h2 className="text-xl font-bold text-white mb-4 text-center">Add More Services</h2>
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

              </div>
          </div>

      </div>
    </main>
  );
}

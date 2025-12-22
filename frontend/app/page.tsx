"use client";
import { useState, useEffect } from 'react';

// 👇 REPLACE THIS WITH YOUR ACTUAL RENDER BACKEND URL
const API_URL = "https://myspotnow-api.onrender.com"; 

const SERVICES = [
  { name: "Haircut", time: 20 },
  { name: "Shave", time: 10 },
  { name: "Head Massage", time: 15 },
  { name: "Facial", time: 30 },
];

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myWaitTime, setMyWaitTime] = useState(0); 
  
  // UI State
  const [view, setView] = useState("home"); 
  const [form, setForm] = useState({ username: "", password: "", name: "", phone: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- SYNC ---
  useEffect(() => {
    const savedUser = localStorage.getItem('slotSync_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    fetchStatus();
    const poller = setInterval(fetchStatus, 3000);
    const timer = setInterval(() => {
        setMyWaitTime(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      const json = await res.json();
      setData(json);
      // Sync wait time
      if (Math.abs(json.seconds_left - myWaitTime) > 2) setMyWaitTime(json.seconds_left);
    } catch (e) { console.error("API Error"); }
  };

  // --- AUTH HANDLERS ---
  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault(); setLoading(true); setError("");
      try {
          const res = await fetch(`${API_URL}/auth/signup`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form)
          });
          if (res.ok) { alert("Account Created! Please Login."); setView("login"); } 
          else { const err = await res.json(); setError(err.detail || "Signup Failed"); }
      } catch (err) { setError("Server Error"); }
      setLoading(false);
  };

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

  const logout = () => {
      localStorage.removeItem('slotSync_user');
      setCurrentUser(null);
      setView("home");
  };

  // --- JOIN HANDLER ---
  const handleJoin = async () => {
    if (selected.length === 0) return alert("Select a service");
    setLoading(true);
    await fetch(`${API_URL}/queue/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: currentUser.name, phone: currentUser.phone, services: selected }),
    });
    setLoading(false);
    setView("home");
    fetchStatus();
  };

  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const amIInQueue = data?.queue.some((p:any) => p.phone === currentUser?.phone);
  const myQueueItem = data?.queue.find((p:any) => p.phone === currentUser?.phone);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex flex-col items-center justify-center p-6 font-sans text-gray-200">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 px-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">SlotSync</h1>
          {currentUser ? (
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                  <span className="text-sm text-gray-300 font-medium">Hi, {currentUser.name}</span>
                  <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors">Logout</button>
              </div>
          ) : (
              <button onClick={() => setView("login")} className="text-sm text-green-400 font-bold hover:text-green-300 transition-colors">Login</button>
          )}
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* VIEW: HOME */}
        {view === "home" && (
            <div className="p-10 text-center relative z-10">
                
                {/* 1. BIG TIMER AT TOP */}
                <div className="mb-10">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-[0.2em] mb-4">Estimated Wait</p>
                    <div className="relative inline-block">
                        <div className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            {formatTime(myWaitTime)}
                        </div>
                        {/* Subtle reflection/glow */}
                        <div className="absolute -inset-4 bg-green-500/5 blur-xl rounded-full -z-10"></div>
                    </div>
                </div>

                {/* 2. TICKET NUMBER BELOW */}
                {amIInQueue ? (
                    <div className="inline-block px-8 py-4 bg-white/5 rounded-2xl border border-white/10 mb-10 backdrop-blur-md shadow-lg">
                        <span className="text-gray-400 text-sm uppercase tracking-wider font-bold block mb-1">Your Ticket</span>
                        <span className="text-white font-black text-4xl">#{myQueueItem.token}</span>
                    </div>
                ) : (
                    <div className="mb-10 flex flex-col items-center gap-2">
                         <span className="text-gray-500 text-sm font-medium">People Ahead</span>
                         <span className="text-3xl font-bold text-white">{data?.people_ahead || 0}</span>
                    </div>
                )}

                {!amIInQueue && (
                    <button 
                        onClick={() => currentUser ? setView("join") : setView("login")}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black py-4 rounded-xl text-lg shadow-lg shadow-green-900/20 transition-all transform active:scale-95"
                    >
                        {currentUser ? "Book Now" : "Login to Book"}
                    </button>
                )}
            </div>
        )}

        {/* LOGIN FORM */}
        {view === "login" && (
            <div className="p-8 relative z-10">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-500 text-sm mb-8">Enter your credentials to access your account</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-4">
                        <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Username" 
                            value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                        <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Password" 
                            value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    </div>
                    
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">{error}</div>}
                    
                    <button disabled={loading} className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-xl transition-all transform active:scale-95 mt-4">
                        {loading ? "Loading..." : "Login"}
                    </button>
                    
                    <div className="flex flex-col items-center gap-3 mt-6">
                        <p className="text-sm text-gray-500">Don't have an account? <span className="text-white font-bold cursor-pointer hover:underline" onClick={()=>setView("signup")}>Sign up</span></p>
                        <p className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors" onClick={()=>setView("home")}>Cancel</p>
                    </div>
                </form>
            </div>
        )}

        {/* SIGNUP FORM */}
        {view === "signup" && (
            <div className="p-8 relative z-10">
                <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                <p className="text-gray-500 text-sm mb-8">Join us to book your slot</p>

                <form onSubmit={handleSignup} className="space-y-3">
                    <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Full Name" 
                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Phone" maxLength={10}
                        value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Username" 
                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-green-500 focus:bg-black/60 transition-all" placeholder="Password" 
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">{error}</div>}
                    
                    <button disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all transform active:scale-95 mt-2">
                        {loading ? "Creating..." : "Sign Up"}
                    </button>
                    
                    <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <span className="text-white font-bold cursor-pointer hover:underline" onClick={()=>setView("login")}>Login</span></p>
                </form>
            </div>
        )}

        {/* JOIN FORM */}
        {view === "join" && (
             <div className="p-8 relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">Select Services</h2>
                <p className="text-gray-500 text-sm mb-6">Choose what you need today</p>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {SERVICES.map(s => (
                        <button key={s.name} onClick={() => toggleService(s.name)}
                            className={`p-4 rounded-2xl text-sm font-bold border transition-all duration-200 flex flex-col items-start gap-1
                            ${selected.includes(s.name) 
                                ? 'bg-green-500 text-black border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]' 
                                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                        >
                            <span>{s.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.includes(s.name) ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-500'}`}>{s.time}m</span>
                        </button>
                    ))}
                </div>
                
                <button onClick={handleJoin} disabled={loading} className="w-full bg-white hover:bg-gray-100 text-black font-black py-4 rounded-xl shadow-lg transition-all transform active:scale-95">
                    {loading ? "Processing..." : "Confirm Booking"}
                </button>
                
                <p className="text-center text-xs text-gray-600 mt-6 cursor-pointer hover:text-gray-400 transition-colors" onClick={()=>setView("home")}>Cancel</p>
             </div>
        )}
      </div>
    </main>
  );
}

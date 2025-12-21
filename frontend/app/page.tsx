"use client";
import { useState, useEffect } from 'react';

// --- CONFIG ---
const API_URL = "http://127.0.0.1:8000"; 

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
  const [view, setView] = useState("home"); // home, login, signup, join
  const [form, setForm] = useState({ username: "", password: "", name: "", phone: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- 1. INITIAL LOAD & TIMER ---
  useEffect(() => {
    // Check for saved user
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
      
      // Calculate Wait Time Logic (Same as before)
      if (currentUser) {
          // Find my token if I am in queue
          // (This logic would need backend to return "my_token" based on user ID, 
          // but for now we rely on local storage or name match if simplest)
      }
    } catch (e) { console.error("API Error"); }
  };

  // --- 2. AUTH HANDLERS ---
  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true); setError("");
      try {
          const res = await fetch(`${API_URL}/auth/signup`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form)
          });
          if (res.ok) {
              alert("Account Created! Please Login.");
              setView("login");
          } else {
              const err = await res.json();
              setError(err.detail || "Signup Failed");
          }
      } catch (err) { setError("Server Error"); }
      setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true); setError("");
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
          } else {
              setError("Invalid Credentials");
          }
      } catch (err) { setError("Server Error"); }
      setLoading(false);
  };

  const logout = () => {
      localStorage.removeItem('slotSync_user');
      setCurrentUser(null);
      setView("home");
  };

  // --- 3. QUEUE HANDLERS ---
  const handleJoin = async () => {
    if (selected.length === 0) return alert("Select a service");
    setLoading(true);
    
    await fetch(`${API_URL}/queue/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: currentUser.name, 
            phone: currentUser.phone, 
            services: selected 
        }),
    });
    
    setLoading(false);
    setView("home");
    fetchStatus();
  };

  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  // UI HELPERS
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const amIInQueue = data?.queue.some((p:any) => p.phone === currentUser?.phone);
  const myQueueItem = data?.queue.find((p:any) => p.phone === currentUser?.phone);

  return (
    <main className="min-h-screen bg-neutral-950 p-6 flex flex-col items-center font-sans text-gray-200">
      
      {/* HEADER: USER INFO */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-2">
          <h1 className="text-xl font-black text-white tracking-tight">SlotSync</h1>
          {currentUser ? (
              <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Hi, {currentUser.name}</span>
                  <button onClick={logout} className="text-xs text-red-500 hover:text-red-400 font-bold border border-red-900/50 px-3 py-1 rounded-full">Logout</button>
              </div>
          ) : (
              <button onClick={() => setView("login")} className="text-sm text-green-400 font-bold">Login</button>
          )}
      </div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 mb-8 relative">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]"></div>
        
        {/* VIEW: HOME (Status) */}
        {view === "home" && (
            <div className="p-8 text-center animate-in fade-in zoom-in duration-300">
                <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-8">
                    {amIInQueue ? "Your Token" : "Current Shop Status"}
                </p>
                
                <div className="relative inline-block mb-8">
                    {amIInQueue ? (
                        <>
                            <span className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">#{myQueueItem.token}</span>
                            <span className="block text-sm text-gray-400 mt-2">Est. Wait: {formatTime(data?.seconds_left)}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{data?.people_ahead || 0}</span>
                            <span className="absolute -bottom-4 left-0 w-full text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">In Queue</span>
                        </>
                    )}
                </div>

                {!amIInQueue && (
                    <button 
                        onClick={() => currentUser ? setView("join") : setView("login")}
                        className="w-full bg-green-500 text-neutral-950 font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-400 hover:scale-[1.02] transition-all"
                    >
                        {currentUser ? "Book a Spot" : "Login to Book"}
                    </button>
                )}
            </div>
        )}

        {/* VIEW: LOGIN */}
        {view === "login" && (
            <div className="p-8 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Username" 
                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-4 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Password" 
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    
                    <button disabled={loading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200">
                        {loading ? "Loading..." : "Login"}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:text-white" onClick={()=>setView("signup")}>New here? Create Account</p>
                    <p className="text-center text-xs text-gray-600 mt-2 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
                </form>
            </div>
        )}

        {/* VIEW: SIGNUP */}
        {view === "signup" && (
            <div className="p-8 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
                <form onSubmit={handleSignup} className="space-y-3">
                    <input className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Full Name" 
                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Phone (10 digits)" maxLength={10}
                        value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Choose Username" 
                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-white focus:border-green-500 outline-none" placeholder="Password" 
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />

                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    
                    <button disabled={loading} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl hover:bg-green-400 mt-2">
                        {loading ? "Creating..." : "Sign Up"}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:text-white" onClick={()=>setView("login")}>Already have account? Login</p>
                </form>
            </div>
        )}

        {/* VIEW: JOIN QUEUE (Service Selection) */}
        {view === "join" && (
             <div className="p-8 animate-in slide-in-from-right duration-300">
                <h2 className="text-xl font-bold text-white mb-4">Select Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {SERVICES.map(s => (
                        <button key={s.name} onClick={() => toggleService(s.name)}
                            className={`p-3 rounded-xl text-sm font-bold border transition-all ${selected.includes(s.name) ? 'bg-green-500 text-black border-green-500' : 'bg-neutral-800 text-gray-400 border-white/5'}`}
                        >
                            {s.name} <span className="block text-[10px] opacity-60 font-normal">{s.time}m</span>
                        </button>
                    ))}
                </div>
                <button onClick={handleJoin} disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl shadow-lg hover:bg-gray-200">
                    {loading ? "Processing..." : "Confirm Booking"}
                </button>
                <p className="text-center text-xs text-gray-600 mt-4 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
             </div>
        )}

      </div>
      
      {/* QUEUE LIST PREVIEW */}
      <div className="w-full max-w-md space-y-3 opacity-50">
         <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-2">Up Next</h3>
         {data?.queue.slice(0, 3).map((p:any, i:number) => (
             <div key={p.token} className="p-3 bg-neutral-900 border border-white/5 rounded-xl flex justify-between items-center">
                 <span className="font-bold text-gray-400">#{p.token} {p.name}</span>
                 {i===0 && <span className="text-[10px] bg-green-900 text-green-400 px-2 py-0.5 rounded">Serving</span>}
             </div>
         ))}
      </div>

    </main>
  );
}
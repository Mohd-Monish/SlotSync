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
    <main className="min-h-screen bg-black p-6 flex flex-col items-center font-sans text-gray-200">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-2">
          <h1 className="text-xl font-black text-white">SlotSync</h1>
          {currentUser ? (
              <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Hi, {currentUser.name}</span>
                  <button onClick={logout} className="text-xs text-red-500 border border-red-900/50 px-3 py-1 rounded-full">Logout</button>
              </div>
          ) : (
              <button onClick={() => setView("login")} className="text-sm text-green-400 font-bold">Login</button>
          )}
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-neutral-900 rounded-3xl border border-white/10 mb-8 relative overflow-hidden">
        
        {/* VIEW: HOME */}
        {view === "home" && (
            <div className="p-10 text-center">
                
                {/* 1. BIG TIMER AT TOP */}
                <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Estimated Wait</p>
                <div className="text-7xl font-mono font-bold text-white tracking-tighter mb-8 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    {formatTime(myWaitTime)}
                </div>

                {/* 2. TICKET NUMBER BELOW */}
                {amIInQueue ? (
                    <div className="inline-block px-6 py-2 bg-white/5 rounded-full border border-white/10 mb-8">
                        <span className="text-gray-400 text-sm">Your Ticket: </span>
                        <span className="text-white font-bold text-xl ml-2">#{myQueueItem.token}</span>
                    </div>
                ) : (
                    <div className="mb-8">
                         <span className="text-gray-500 text-sm">People Ahead: </span>
                         <span className="text-white font-bold text-xl ml-1">{data?.people_ahead || 0}</span>
                    </div>
                )}

                {!amIInQueue && (
                    <button 
                        onClick={() => currentUser ? setView("join") : setView("login")}
                        className="w-full bg-green-500 text-black font-black py-4 rounded-xl text-lg hover:bg-green-400 transition-all"
                    >
                        {currentUser ? "Book Now" : "Login to Book"}
                    </button>
                )}
            </div>
        )}

        {/* LOGIN FORM */}
        {view === "login" && (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input className="w-full p-4 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Username" 
                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-4 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Password" 
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <button disabled={loading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200">
                        {loading ? "Loading..." : "Login"}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer" onClick={()=>setView("signup")}>Create Account</p>
                    <p className="text-center text-xs text-gray-600 mt-2 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
                </form>
            </div>
        )}

        {/* SIGNUP FORM */}
        {view === "signup" && (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
                <form onSubmit={handleSignup} className="space-y-3">
                    <input className="w-full p-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Full Name" 
                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input className="w-full p-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Phone" maxLength={10}
                        value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input className="w-full p-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Username" 
                        value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    <input type="password" className="w-full p-3 bg-black border border-white/10 rounded-xl text-white outline-none focus:border-green-500" placeholder="Password" 
                        value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <button disabled={loading} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl mt-2">
                        {loading ? "Creating..." : "Sign Up"}
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer" onClick={()=>setView("login")}>Back to Login</p>
                </form>
            </div>
        )}

        {/* JOIN FORM */}
        {view === "join" && (
             <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">Select Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {SERVICES.map(s => (
                        <button key={s.name} onClick={() => toggleService(s.name)}
                            className={`p-3 rounded-xl text-sm font-bold border ${selected.includes(s.name) ? 'bg-green-500 text-black border-green-500' : 'bg-neutral-800 text-gray-400 border-white/5'}`}
                        >
                            {s.name} <span className="block text-[10px] opacity-60 font-normal">{s.time}m</span>
                        </button>
                    ))}
                </div>
                <button onClick={handleJoin} disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200">
                    {loading ? "Processing..." : "Confirm"}
                </button>
                <p className="text-center text-xs text-gray-600 mt-4 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
             </div>
        )}
      </div>
    </main>
  );
}
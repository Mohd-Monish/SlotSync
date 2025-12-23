"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = "https://myspotnow-api.onrender.com"; 

export default function SalonBooking() {
  const params = useParams(); 
  const router = useRouter(); 
  const salonId = params.id;

  const [salonDetails, setSalonDetails] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]); 
  const [data, setData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [view, setView] = useState("home"); 
  const [form, setForm] = useState({ username: "", password: "", name: "", phone: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  // 1. Load Salon Data
  useEffect(() => {
      fetch(`${API_URL}/salons/${salonId}`)
        .then(res => res.json())
        .then(json => { setSalonDetails(json); setMenu(json.menu || []); })
        .catch(e => console.error("Salon load error"));
  }, [salonId]);

  // 2. Sync Queue
  useEffect(() => {
    const savedUser = localStorage.getItem('slotSync_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const fetchQ = async () => {
        try {
            const res = await fetch(`${API_URL}/queue/status?salon_id=${salonId}`);
            const json = await res.json();
            setData(json);
        } catch(e) {}
    };
    fetchQ();
    const poller = setInterval(fetchQ, 3000); // Polling every 3s
    const timer = setInterval(() => setDisplayTime(p => p > 0 ? p - 1 : 0), 1000);
    return () => { clearInterval(poller); clearInterval(timer); };
  }, [salonId]);

  // Sync timer with server
  useEffect(() => {
      if (data && currentUser) {
          const myItem = data.queue.find((p:any) => p.phone === currentUser.phone);
          if (myItem && Math.abs(myItem.estimated_wait - displayTime) > 2) setDisplayTime(myItem.estimated_wait);
      }
  }, [data, currentUser]);

  // Actions
  const handleLogin = async (e: any) => {
      e.preventDefault(); setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({username: form.username, password: form.password}) });
      if(res.ok) {
          const u = await res.json();
          const userObj = {username: form.username, name: u.name, phone: u.phone};
          setCurrentUser(userObj); localStorage.setItem('slotSync_user', JSON.stringify(userObj)); setView("home");
      } else { alert("Login Failed"); }
      setLoading(false);
  };

  const handleJoin = async () => {
    if (selected.length === 0) return alert("Select a service");
    setLoading(true);
    await fetch(`${API_URL}/queue/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salon_id: salonId, name: currentUser.name, phone: currentUser.phone, services: selected }),
    });
    setLoading(false); setView("home"); setSelected([]);
  };

  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  const formatTime = (s: number) => { const m=Math.floor(s/60); const sc=s%60; return `${m}:${sc<10?'0':''}${sc}`; };

  const myQueueItem = data?.queue.find((p:any) => p.phone === currentUser?.phone);
  const isServingNow = myQueueItem && data.queue[0]?.token === myQueueItem.token;

  if (!salonDetails) return <div className="min-h-screen bg-black flex items-center justify-center text-green-500 animate-pulse">LOADING SALON...</div>;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden">
         
         {/* HEADER */}
         <div className="flex justify-between items-center p-6 border-b border-white/5">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">← Back</button>
            <h1 className="font-bold text-white">{salonDetails.name}</h1>
            {currentUser && <button onClick={() => { localStorage.removeItem('slotSync_user'); setCurrentUser(null); }} className="text-xs text-red-400">Logout</button>}
         </div>

         {view === "home" && (
             <div className="p-8 text-center">
                 {myQueueItem ? (
                     <>
                        {isServingNow ? (
                            <div className="mb-8 animate-pulse text-green-500">
                                <div className="text-6xl mb-2">✂️</div>
                                <h2 className="text-3xl font-black">SERVING NOW</h2>
                                <p className="text-sm">Please proceed to chair</p>
                            </div>
                        ) : (
                            <div className="mb-8">
                                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Wait Time</p>
                                <div className="text-7xl font-mono font-bold text-white">{formatTime(displayTime)}</div>
                                <div className="mt-4 flex justify-center gap-4 text-white">
                                    <div className="bg-white/5 px-4 py-2 rounded">Token #{myQueueItem.token}</div>
                                </div>
                            </div>
                        )}
                        {!isServingNow && <button onClick={async () => { if(confirm("Cancel?")) { await fetch(`${API_URL}/queue/cancel`, { method: "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({token: myQueueItem.token})}); } }} className="text-red-400 text-sm">Cancel Booking</button>}
                     </>
                 ) : (
                     <div className="mb-8">
                         <div className="text-5xl font-black text-white mb-2">{data?.people_ahead || 0}</div>
                         <p className="text-sm text-gray-400">People Waiting</p>
                         <button onClick={() => currentUser ? setView("join") : setView("login")} className="mt-6 w-full bg-green-500 text-black font-bold py-4 rounded-xl hover:bg-green-400">
                             {currentUser ? "Book Appointment" : "Login to Book"}
                         </button>
                     </div>
                 )}
                 {/* UP NEXT LIST */}
                 <div className="mt-8 pt-8 border-t border-white/5 text-left">
                     <p className="text-xs text-gray-500 mb-4 uppercase font-bold">Up Next</p>
                     {data?.queue.slice(0, 3).map((p:any, i:number) => (
                         <div key={p.token} className="flex justify-between py-2 text-gray-300 border-b border-white/5">
                             <span>#{p.token} {p.name}</span>
                             <span className="text-xs">{i===0 ? "Serving" : `~${formatTime(p.estimated_wait)}`}</span>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {view === "join" && (
             <div className="p-8">
                <h2 className="text-xl font-bold text-white mb-4">Select Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {menu.map(s => (
                        <button key={s.name} onClick={() => toggleService(s.name)} className={`p-3 rounded-xl text-sm font-bold border ${selected.includes(s.name) ? 'bg-green-500 text-black border-green-500' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                            {s.name} <span className="block text-[10px] opacity-60">{s.time}m • ₹{s.price}</span>
                        </button>
                    ))}
                </div>
                <button onClick={handleJoin} disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-xl">{loading ? "..." : "Confirm"}</button>
             </div>
         )}

         {view === "login" && (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
                <input className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white mb-2" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                <input type="password" className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white mb-4" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                <button onClick={handleLogin} disabled={loading} className="w-full bg-white text-black font-bold py-4 rounded-xl">{loading ? "..." : "Login"}</button>
                <p className="text-center text-sm text-gray-500 mt-4 cursor-pointer" onClick={()=>setView("home")}>Cancel</p>
            </div>
         )}
      </div>
    </main>
  );
}
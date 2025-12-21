"use client";
import { useState, useEffect } from 'react';

// --- CONFIG ---
const API_URL = "https://myspotnow-api.onrender.com"; // Your Render URL
const SERVICES = [
  { name: "Haircut", time: 20 },
  { name: "Shave", time: 10 },
  { name: "Head Massage", time: 15 },
  { name: "Facial", time: 30 },
];

export default function Home() {
  // State
  const [data, setData] = useState<any>(null);
  const [myToken, setMyToken] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 1. INITIAL LOAD & TIMER ---
  useEffect(() => {
    // Restore Session
    const savedToken = localStorage.getItem('slotSync_token');
    if (savedToken) setMyToken(parseInt(savedToken));

    fetchStatus();
    
    // Polling (Every 3s)
    const poller = setInterval(fetchStatus, 3000);
    
    // Live Timer (Every 1s)
    const timer = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => { clearInterval(poller); clearInterval(timer); };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      const json = await res.json();
      setData(json);
      
      // Sync Timer (Avoid jumping)
      const serverSeconds = json.total_wait_minutes * 60;
      if (Math.abs(serverSeconds - timeLeft) > 5) setTimeLeft(serverSeconds);
    } catch (e) { console.error("API Error"); }
  };

  // --- 2. HANDLERS ---
  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return alert("Phone must be exactly 10 digits");
    if (selected.length === 0) return alert("Select at least one service");
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, services: selected }),
      });
      const resData = await res.json();
      
      if (res.ok) {
        localStorage.setItem('slotSync_token', resData.token.toString());
        setMyToken(resData.token);
        setShowModal(false);
        fetchStatus();
      } else {
        alert("Error: " + (resData.detail?.[0]?.msg || "Failed to join"));
      }
    } catch (err) { alert("Server Error"); }
    setLoading(false);
  };

  const handleAddMore = async () => {
    if (selected.length === 0) return;
    await fetch(`${API_URL}/queue/add-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: myToken, new_services: selected }),
    });
    setIsAddingMore(false);
    setSelected([]);
    fetchStatus();
    alert("Services Added!");
  };

  // --- 3. UI HELPERS ---
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const amIInQueue = data?.queue.some((c:any) => c.token === myToken);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex flex-col items-center font-sans text-gray-800">
      
      {/* --- STATUS CARD --- */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 mb-8 relative">
        <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        <div className="p-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">SlotSync</h1>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">Live Queue</p>
          
          <div className="relative inline-block">
             <span className="text-7xl font-mono font-bold text-gray-900 tracking-tighter">
                {formatTime(timeLeft)}
             </span>
             <span className="absolute -bottom-4 left-0 w-full text-center text-xs text-gray-400 font-bold uppercase">Estimated Wait</span>
          </div>

          <div className="mt-10 flex justify-center gap-2">
             <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold shadow-sm">
                ● {data?.people_ahead || 0} Waiting
             </span>
             <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs font-bold shadow-sm">
                Open Now
             </span>
          </div>
        </div>

        {/* --- DYNAMIC ACTION AREA --- */}
        <div className="bg-gray-50/50 p-6 border-t border-gray-100">
           {amIInQueue ? (
              <div className="text-center animate-in zoom-in duration-300">
                 <p className="text-sm font-bold text-gray-400 uppercase">Your Token</p>
                 <p className="text-5xl font-black text-blue-600 my-2">#{myToken}</p>
                 <button 
                    onClick={() => { setSelected([]); setIsAddingMore(true); }}
                    className="mt-4 w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 shadow-sm"
                 >
                    + Add More Services
                 </button>
              </div>
           ) : (
              <button 
                 onClick={() => setShowModal(true)}
                 className="w-full bg-black text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:scale-[1.02] transition-transform"
              >
                 Join Queue
              </button>
           )}
        </div>
      </div>

      {/* --- QUEUE LIST --- */}
      <div className="w-full max-w-md space-y-3">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Current List</h3>
         {data?.queue.map((p:any, i:number) => {
            const isMe = p.token === myToken;
            return (
                <div key={p.token} className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all
                    ${isMe ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 z-10 scale-[1.02]' : 'bg-white/60 border-gray-100'}
                `}>
                    <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                            ${i===0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                        `}>
                            #{p.token}
                        </span>
                        <div>
                            <p className="font-bold text-gray-800">{p.name} {isMe && '(You)'}</p>
                            <p className="text-xs text-gray-500">{p.services.join(", ")} • {p.total_duration}m</p>
                        </div>
                    </div>
                    {i===0 && <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded">NEXT</span>}
                </div>
            )
         })}
      </div>

      {/* --- MODAL (JOIN & ADD) --- */}
      {(showModal || isAddingMore) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                 <h2 className="font-bold text-xl">{isAddingMore ? "Add Service" : "Book Spot"}</h2>
                 <button onClick={() => { setShowModal(false); setIsAddingMore(false); }} className="text-gray-400 hover:text-black">✕</button>
              </div>
              
              <div className="p-6 space-y-4">
                 {/* Only show Inputs if NOT adding more */}
                 {!isAddingMore && (
                     <>
                        <input className="w-full p-4 bg-gray-50 border rounded-xl font-medium focus:ring-2 ring-blue-500 outline-none" 
                            placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} />
                        <input className="w-full p-4 bg-gray-50 border rounded-xl font-medium focus:ring-2 ring-blue-500 outline-none" 
                            type="number" placeholder="Phone (10 digits)" value={phone} onChange={e=>setPhone(e.target.value)} />
                     </>
                 )}

                 <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map(s => (
                        <button key={s.name} type="button" onClick={() => toggleService(s.name)}
                            className={`p-3 rounded-xl text-sm font-bold border transition-all ${selected.includes(s.name) ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        >
                            {s.name} <span className="block text-[10px] opacity-60 font-normal">{s.time}m</span>
                        </button>
                    ))}
                 </div>

                 <button onClick={isAddingMore ? handleAddMore : handleJoin} disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50">
                    {loading ? "Processing..." : "Confirm"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </main>
  );
}
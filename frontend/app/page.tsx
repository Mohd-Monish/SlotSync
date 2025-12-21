"use client";
import { useState, useEffect, useRef } from 'react';

// --- CONFIG ---
const API_URL = "https://myspotnow-api.onrender.com"; 

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
  const [timeLeft, setTimeLeft] = useState(0); 
  
  // REFS (For Smart Timer Logic)
  // We store the list of token IDs to detect if the queue actually changed
  const lastQueueTokens = useRef<string>("");

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 1. INITIAL LOAD & TIMER ---
  useEffect(() => {
    const savedToken = localStorage.getItem('slotSync_token');
    if (savedToken) setMyToken(parseInt(savedToken));

    fetchStatus();
    const poller = setInterval(fetchStatus, 3000);
    
    // Smooth Countdown (Decrements every second)
    const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => { clearInterval(poller); clearInterval(timer); };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      const json = await res.json();
      setData(json);
      
      // --- SMART TIMER FIX ---
      // Create a "fingerprint" of the current queue (e.g., "101,102,103")
      const currentTokens = json.queue.map((q: any) => q.token).join(",");

      // Only reset the timer if the queue has CHANGED (someone joined/left)
      if (lastQueueTokens.current !== currentTokens) {
          setTimeLeft(json.total_wait_minutes * 60);
          lastQueueTokens.current = currentTokens; // Update our record
      }
      
    } catch (e) { console.error("API Error"); }
  };

  // --- 2. HANDLERS ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPhone(value);
    }
  };

  const toggleService = (svc: string) => {
    if (selected.includes(svc)) setSelected(selected.filter(s => s !== svc));
    else setSelected([...selected, svc]);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop form reload
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

  // --- FIXED ADD SERVICE HANDLER ---
  const handleAddMore = async (e: React.FormEvent) => {
    e.preventDefault(); // <--- CRITICAL FIX: Stops the page/modal reload
    if (selected.length === 0) return;
    
    setLoading(true);
    await fetch(`${API_URL}/queue/add-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: myToken, new_services: selected }),
    });
    
    // Close modal cleanly without alert
    setIsAddingMore(false);
    setSelected([]);
    setLoading(false);
    
    // Force a data refresh to update time immediately
    fetchStatus(); 
  };

  // --- 3. UI HELPERS ---
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const amIInQueue = data?.queue.some((c:any) => c.token === myToken);

  return (
    <main className="min-h-screen bg-neutral-950 p-6 flex flex-col items-center font-sans text-gray-200">
      
      {/* --- STATUS CARD --- */}
      <div className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 mb-8 relative">
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]"></div>
        
        <div className="p-8 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">SlotSync</h1>
          <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-8">Live Queue Status</p>
          
          <div className="relative inline-block">
             <span className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {formatTime(timeLeft)}
             </span>
             <span className="absolute -bottom-4 left-0 w-full text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Wait Time
             </span>
          </div>

          <div className="mt-10 flex justify-center gap-3">
             <span className="px-4 py-2 bg-neutral-800 text-gray-300 border border-white/10 rounded-full text-xs font-bold">
                👥 {data?.people_ahead || 0} Waiting
             </span>
             <span className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold animate-pulse">
                ● Open Now
             </span>
          </div>
        </div>

        {/* --- DYNAMIC ACTION AREA --- */}
        <div className="bg-neutral-800/50 p-6 border-t border-white/5">
           {amIInQueue ? (
              <div className="text-center animate-in zoom-in duration-300">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Token Number</p>
                 <p className="text-6xl font-black text-green-400 my-3 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]">
                    #{myToken}
                 </p>
                 <button 
                    onClick={() => { setSelected([]); setIsAddingMore(true); }}
                    className="mt-4 w-full bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-3 rounded-xl border border-white/10 transition-all"
                 >
                    + Add More Services
                 </button>
              </div>
           ) : (
              <button 
                 onClick={() => setShowModal(true)}
                 className="w-full bg-green-500 text-neutral-950 font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-400 hover:scale-[1.02] transition-all"
              >
                 Join Queue
              </button>
           )}
        </div>
      </div>

      {/* --- QUEUE LIST --- */}
      <div className="w-full max-w-md space-y-3">
         <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-2">Current List</h3>
         {data?.queue.map((p:any, i:number) => {
            const isMe = p.token === myToken;
            return (
                <div key={p.token} className={`p-4 rounded-2xl flex items-center justify-between border transition-all
                    ${isMe 
                        ? 'bg-neutral-800 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] scale-[1.02]' 
                        : 'bg-neutral-900 border-white/5'}
                `}>
                    <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                            ${i===0 
                                ? 'bg-green-500 text-black' 
                                : isMe ? 'bg-neutral-700 text-green-400' : 'bg-neutral-800 text-gray-500'}
                        `}>
                            #{p.token}
                        </span>
                        <div>
                            <p className={`font-bold ${isMe ? 'text-green-400' : 'text-gray-200'}`}>
                                {p.name} {isMe && '(You)'}
                            </p>
                            <p className="text-xs text-gray-500">{p.services.join(", ")} • {p.total_duration}m</p>
                        </div>
                    </div>
                    {i===0 && <span className="text-[10px] font-bold bg-white text-black px-2 py-1 rounded">NEXT</span>}
                </div>
            )
         })}
      </div>

      {/* --- MODAL (JOIN & ADD) --- */}
      {(showModal || isAddingMore) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
              <div className="p-6 bg-neutral-800/50 border-b border-white/5 flex justify-between items-center">
                 <h2 className="font-bold text-xl text-white">{isAddingMore ? "Add Service" : "Book Spot"}</h2>
                 <button onClick={() => { setShowModal(false); setIsAddingMore(false); }} className="text-gray-500 hover:text-white">✕</button>
              </div>
              
              <div className="p-6 space-y-4">
                 {!isAddingMore && (
                     <>
                        <input className="w-full p-4 bg-neutral-950 border border-white/10 rounded-xl font-medium text-white focus:border-green-500 outline-none" 
                            placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} />
                        
                        <input 
                            type="tel" 
                            maxLength={10}
                            className="w-full p-4 bg-neutral-950 border border-white/10 rounded-xl font-medium text-white focus:border-green-500 outline-none" 
                            placeholder="Phone (10 digits)" 
                            value={phone} 
                            onChange={handlePhoneChange} 
                        />
                     </>
                 )}

                 <div className="grid grid-cols-2 gap-2">
                    {SERVICES.map(s => (
                        <button key={s.name} type="button" onClick={() => toggleService(s.name)}
                            className={`p-3 rounded-xl text-sm font-bold border transition-all 
                                ${selected.includes(s.name) 
                                    ? 'bg-green-500 text-black border-green-500' 
                                    : 'bg-neutral-800 text-gray-400 border-white/5 hover:border-white/20'}
                            `}
                        >
                            {s.name} <span className="block text-[10px] opacity-60 font-normal">{s.time}m</span>
                        </button>
                    ))}
                 </div>

                 <button onClick={isAddingMore ? handleAddMore : handleJoin} disabled={loading}
                    className="w-full bg-white text-black font-black py-4 rounded-xl shadow-lg hover:bg-gray-200 disabled:opacity-50">
                    {loading ? "Processing..." : "Confirm"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </main>
  );
}
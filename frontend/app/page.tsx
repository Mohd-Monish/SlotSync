"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 👇 Your Backend URL
const API_URL = "https://myspotnow-api.onrender.com"; 

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState("Initializing...");

  useEffect(() => {
    const fetchSalons = async () => {
      setDebugMsg("Waking up server...");
      try {
        const res = await fetch(`${API_URL}/salons`);
        if (!res.ok) throw new Error("Server Error");
        const data = await res.json();
        setSalons(data);
        setDebugMsg("Ready");
      } catch (err) {
        setDebugMsg("Connecting...");
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, []);

  const filtered = salons.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans relative overflow-x-hidden">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative pt-24 pb-12 px-6 text-center z-10">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-6">SlotSync</h1>
        <p className="text-xl text-gray-400 mb-10">Find your salon. Join the queue. Skip the wait.</p>
        
        <input 
            type="text" 
            placeholder="Search salon name..." 
            className="w-full max-w-lg p-5 bg-[#0a0a0a] border border-white/10 rounded-2xl text-white outline-none focus:border-green-500/50 shadow-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <h2 className="text-2xl font-bold text-white mb-8">Available Salons</h2>

        {loading && <p className="text-center text-green-500 animate-pulse">Finding salons... ({debugMsg})</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((salon) => (
                <Link href={`/booking/${salon.id}`} key={salon.id} className="group">
                    <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 hover:border-green-500/30 transition-all hover:-translate-y-2">
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-4xl">{salon.image || "💈"}</div>
                            <span className="px-3 py-1 rounded-full text-[10px] bg-green-900/20 text-green-400 border border-green-500/30">{salon.status}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{salon.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">📍 {salon.location}</p>
                        <div className="pt-6 border-t border-white/5 flex justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Est. Wait</p>
                                <p className="text-2xl font-mono font-bold text-green-400">{salon.wait_time}m</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-black transition">➜</div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
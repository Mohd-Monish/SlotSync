"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 👇 Pointing to your Real Backend
const API_URL = "https://myspotnow-api.onrender.com"; 

export default function LandingPage() {
  const [search, setSearch] = useState("");
  const [salons, setSalons] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // Fetch salons from backend
  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const res = await fetch(`${API_URL}/salons`);
        const data = await res.json();
        setSalons(data);
      } catch (err) {
        console.error("Failed to load salons", err);
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
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-green-500/30 overflow-x-hidden relative">
      
      {/* ANIMATED BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-emerald-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-900/10 rounded-full blur-[80px]"></div>
      </div>

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-20 px-6 border-b border-white/5 bg-gradient-to-b from-transparent to-black/80">
        <div className="max-w-5xl mx-auto text-center relative z-10">
            
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold tracking-widest text-gray-300 uppercase">Live Queue System</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-6 tracking-tighter drop-shadow-2xl">
                SlotSync
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                Skip the waiting room. <br/>
                <span className="text-green-400 font-medium">Book your spot instantly</span> at the best salons near you.
            </p>
            
            {/* FLOATING SEARCH BAR */}
            <div className="relative max-w-xl mx-auto group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Find a salon name or location..." 
                        className="w-full p-6 pl-16 bg-[#0a0a0a] border border-white/10 rounded-2xl text-white text-lg placeholder-gray-600 outline-none focus:border-green-500/50 focus:bg-[#0f0f0f] transition-all shadow-2xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <span className="absolute left-6 top-6 text-gray-500 text-xl group-hover:text-green-500 transition-colors">🔍</span>
                </div>
            </div>
        </div>
      </div>

      {/* SALON GRID */}
      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full"></span>
                Available Salons
            </h2>
            <span className="text-sm text-gray-500 font-mono hidden md:block">
                {filtered.length} locations active
            </span>
        </div>

        {/* LOADING STATE SKELETON */}
        {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1,2,3].map(i => (
                    <div key={i} className="h-64 bg-white/5 rounded-[2rem] border border-white/5"></div>
                ))}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((salon, i) => (
                <Link href={`/booking/${salon.id}`} key={salon.id} className="group">
                    <div className="h-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 hover:bg-white/5 hover:border-green-500/30 transition-all duration-500 relative overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                        
                        {/* Status Badge */}
                        <div className="absolute top-6 right-6 z-20">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${salon.status === 'Open' ? 'bg-green-950/30 text-green-400 border-green-500/30 shadow-green-900/20' : 'bg-red-950/30 text-red-400 border-red-500/30'}`}>
                                {salon.status}
                            </span>
                        </div>

                        {/* Icon/Image */}
                        <div className="mb-6 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                {salon.image || "💈"}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300 line-clamp-1">{salon.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mb-6">
                                <span className="text-gray-600">📍</span> {salon.location}
                            </p>
                        </div>

                        {/* Footer Info */}
                        <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Est. Wait</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-mono font-bold ${salon.wait_time < 15 ? 'text-green-400' : salon.wait_time < 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {salon.wait_time}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">min</span>
                                </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* Hover Glow Effect */}
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px] group-hover:bg-green-500/10 transition-colors duration-700 pointer-events-none"></div>
                    </div>
                </Link>
            ))}
        </div>
        
        {!loading && filtered.length === 0 && (
            <div className="text-center py-32 border border-dashed border-white/10 rounded-[2rem] bg-white/5 backdrop-blur-sm">
                <p className="text-gray-500 text-lg font-light">No salons found matching "<span className="text-white font-medium">{search}</span>"</p>
                <button onClick={() => setSearch("")} className="mt-4 text-green-400 hover:text-green-300 text-sm font-bold uppercase tracking-wider hover:underline">Clear Search</button>
            </div>
        )}
      </div>
    </div>
  );
}
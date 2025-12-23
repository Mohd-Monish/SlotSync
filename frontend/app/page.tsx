"use client";
import { useState } from 'react';
import Link from 'next/link';

// MOCK DATA: Simulating a database of salons
const MOCK_SALONS = [
  { 
    id: "salon_101", 
    name: "Cool Cuts Mumbai", 
    location: "Bandra West, Mumbai", 
    wait_time: 15, 
    status: "Open",
    image: "💈" 
  },
  { 
    id: "salon_102", 
    name: "Delhi Style Studio", 
    location: "Connaught Place, Delhi", 
    wait_time: 45, 
    status: "Busy",
    image: "✂️" 
  },
  { 
    id: "salon_103", 
    name: "Bangalore Buzz", 
    location: "Indiranagar, Bangalore", 
    wait_time: 5, 
    status: "Open",
    image: "💇‍♂️" 
  },
];

export default function LandingPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_SALONS.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-green-500/30 overflow-x-hidden">
      
      {/* HERO SECTION */}
      <div className="relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black pb-20 pt-20 px-6 border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="w-20 h-20 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl shadow-green-900/20 mx-auto mb-8 animate-bounce">
                  <img src="/logo_no-text.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 mb-6 tracking-tight">
                SlotSync
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                Find your salon. <span className="text-white font-medium">Join the queue.</span> Skip the wait.
            </p>
            
            {/* SEARCH BAR */}
            <div className="relative max-w-lg mx-auto group">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <input 
                    type="text" 
                    placeholder="Search by name or city..." 
                    className="w-full p-5 pl-14 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-green-500/50 focus:bg-black/80 transition-all backdrop-blur-md relative z-10 shadow-2xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-5 top-5 text-gray-500 z-20">🔍</span>
            </div>
        </div>
      </div>

      {/* SALON GRID */}
      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 animate-in fade-in delay-200 duration-700">
            <span className="w-1.5 h-8 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full"></span>
            Available Salons
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((salon, i) => (
                <Link href={`/salon/${salon.id}`} key={salon.id} className="group h-full">
                    <div className={`bg-neutral-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-white/5 hover:border-green-500/30 transition-all duration-300 relative overflow-hidden h-full flex flex-col animate-in zoom-in-50 fade-in fill-mode-backwards`} style={{animationDelay: `${i * 100}ms`}}>
                        
                        {/* Glow Effect */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-500"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                                {salon.image}
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${salon.status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {salon.status}
                            </span>
                        </div>

                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-green-400 group-hover:to-emerald-500 transition-all">{salon.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                📍 {salon.location}
                            </p>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Est. Wait</p>
                                <p className="text-xl font-mono font-bold text-white">{salon.wait_time} <span className="text-sm font-sans font-normal text-gray-500">min</span></p>
                            </div>
                            <span className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-green-500 group-hover:text-black group-hover:border-green-500 transition-all duration-300 shadow-lg">
                                ➜
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>

        {filtered.length === 0 && (
            <div className="text-center py-32 border border-dashed border-white/10 rounded-[2rem] bg-white/5 backdrop-blur-sm animate-in fade-in">
                <p className="text-gray-500 text-lg">No salons found matching "{search}"</p>
                <button onClick={() => setSearch("")} className="mt-4 text-green-400 hover:text-green-300 text-sm font-bold">Clear Search</button>
            </div>
        )}
      </div>
    </div>
  );
}
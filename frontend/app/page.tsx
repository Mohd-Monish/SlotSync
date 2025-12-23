"use client";
import { useState } from 'react';
import Link from 'next/link';

// Mock Data for Search
const MOCK_SALONS = [
  { id: "salon_101", name: "Cool Cuts Mumbai", location: "Bandra West, Mumbai", wait_time: 15, status: "Open", image: "💈" },
  { id: "salon_102", name: "Delhi Style Studio", location: "Connaught Place, Delhi", wait_time: 45, status: "Busy", image: "✂️" },
  { id: "salon_103", name: "Bangalore Buzz", location: "Indiranagar, Bangalore", wait_time: 5, status: "Open", image: "💇‍♂️" },
];

export default function LandingPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_SALONS.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-green-500/30 overflow-x-hidden">
      <div className="relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black pb-20 pt-20 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 mb-6 tracking-tight">SlotSync</h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                Find your salon. <span className="text-white font-medium">Join the queue.</span> Skip the wait.
            </p>
            <div className="relative max-w-lg mx-auto group">
                <input type="text" placeholder="Search by name or city..." className="w-full p-5 pl-14 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-green-500/50 focus:bg-black/80 transition-all backdrop-blur-md relative z-10 shadow-2xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                <span className="absolute left-5 top-5 text-gray-500 z-20">🔍</span>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full"></span>
            Available Salons
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((salon) => (
                // 👇 LINK POINTS TO "booking" FOLDER
                <Link href={`/booking/${salon.id}`} key={salon.id} className="group h-full">
                    <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-white/5 hover:border-green-500/30 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300">{salon.image}</div>
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${salon.status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{salon.status}</span>
                        </div>
                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{salon.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1">📍 {salon.location}</p>
                        </div>
                        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Est. Wait</p>
                                <p className="text-xl font-mono font-bold text-white">{salon.wait_time} <span className="text-sm font-sans font-normal text-gray-500">min</span></p>
                            </div>
                            <span className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-green-500 group-hover:text-black group-hover:border-green-500 transition-all duration-300 shadow-lg">➜</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
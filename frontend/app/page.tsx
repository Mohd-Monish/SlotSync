"use client";

import { useState, useEffect } from 'react';

// --- TYPES (To prevent errors) ---
type Customer = {
  token: number;
  name: string;
  status: string;
  joined_at: string;
};

type QueueData = {
  shop_status: string;
  people_ahead: number;
  estimated_wait_minutes: number;
  queue: Customer[];
};

export default function Home() {
  // --- STATE ---
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // --- FETCHER ---
  const fetchStatus = async () => {
    try {
      // Note: Make sure this URL matches your new Azure/DigitalOcean backend if you moved it!
      const res = await fetch('https://myspotnow-api.onrender.com/queue/status');
      if (!res.ok) throw new Error("Server Error");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error(err);
      // Keep showing old data if fetch fails briefly
    }
  };

  // --- AUTO REFRESH ---
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  // --- HANDLER: JOIN QUEUE ---
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service_type: "Haircut" }),
      });

      const result = await res.json();
      
      if (res.ok) {
        alert(`Success! Your Token is #${result.your_token}`);
        setShowModal(false);
        setName("");
        setPhone("");
        fetchStatus(); // Update list immediately
      } else {
        alert("Failed to join. Please try again.");
      }
    } catch (error) {
      alert("Network Error. Check internet connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Loading SlotSync...</p>
      </div>
    );
  }

  // --- MAIN UI ---
  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center">
      
      {/* 1. STATUS CARD */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h1 className="text-2xl font-black tracking-tight">SlotSync</h1>
          <p className="text-blue-100 text-sm opacity-90">Live Queue Status</p>
        </div>

        <div className="p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Estimated Wait
          </p>
          <div className="flex items-center justify-center text-gray-800">
            <span className="text-6xl font-black tracking-tighter">
              {data?.estimated_wait_minutes || 0}
            </span>
            <span className="text-xl font-medium text-gray-400 ml-2 mt-4">min</span>
          </div>

          <div className="mt-6 inline-flex items-center bg-green-50 border border-green-100 px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-green-700">
              {data?.people_ahead} People Waiting
            </span>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="w-full mt-8 bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition transform active:scale-95"
          >
            Join Queue
          </button>
        </div>
      </div>

      {/* 2. THE LIST (Who is waiting?) */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Current List</h3>
          <span className="text-xs text-gray-400">Updates live</span>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {data?.queue.map((customer, index) => (
            <div key={customer.token} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                `}>
                  #{customer.token}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{customer.name}</p>
                  <p className="text-xs text-gray-400">Joined {customer.joined_at}</p>
                </div>
              </div>
              {index === 0 && (
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded uppercase">
                  Next
                </span>
              )}
            </div>
          ))}
          
          {data?.queue.length === 0 && (
            <div className="p-8 text-center text-gray-400 italic">
              The queue is currently empty. Be the first!
            </div>
          )}
        </div>
      </div>

      {/* MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">Join the Line</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleJoin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                <input 
                  autoFocus
                  required
                  className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-black"
                  placeholder="e.g. Rahul"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input 
                  type="tel"
                  required
                  className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-black"
                  placeholder="9876..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <button 
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl mt-2 transition"
              >
                {submitting ? "Joining..." : "Confirm Spot"}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
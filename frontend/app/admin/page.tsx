"use client";
import { useState, useEffect } from 'react';

// --- TYPES ---
type Customer = {
  token: number;
  name: string;
  phone: string;
  services: string[];
  total_duration: number;
  joined_at: string;
};

export default function AdminPanel() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // POPUP STATE
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const refreshQueue = async () => {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/status');
      const data = await res.json();
      setQueue(data.queue);
      setLoading(false);
  };

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = async () => {
      await fetch('https://myspotnow-api.onrender.com/queue/next', { method: 'POST' });
      refreshQueue();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 font-sans">
      <div className="flex justify-between items-end mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">Vendor Dashboard</h1>
          <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold">
              Call Next Customer
          </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queue.map((person, index) => (
              <div 
                  key={person.token}
                  onClick={() => setSelectedCustomer(person)} // CLICK TO OPEN POPUP
                  className={`p-4 rounded-xl cursor-pointer transition hover:scale-[1.02] ${index === 0 ? 'bg-blue-900 border-2 border-blue-500' : 'bg-gray-800 border border-gray-700'}`}
              >
                  <div className="flex justify-between items-start">
                      <div>
                          <span className="text-2xl font-bold">#{person.token}</span>
                          <h3 className="text-lg font-bold mt-1">{person.name}</h3>
                          <p className="text-xs text-gray-400 mt-1">{person.services.length} Services • {person.total_duration} min</p>
                      </div>
                      {index === 0 && <span className="bg-blue-500 text-xs px-2 py-1 rounded font-bold">CURRENT</span>}
                  </div>
              </div>
          ))}
      </div>

      {/* DETAILS POPUP MODAL */}
      {selectedCustomer && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 border border-gray-600 shadow-2xl relative">
                  <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >✕</button>
                  
                  <div className="text-center mb-6">
                      <div className="inline-block bg-gray-700 rounded-full px-4 py-1 text-sm font-mono text-blue-300 mb-2">
                          Token #{selectedCustomer.token}
                      </div>
                      <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                      <p className="text-lg text-gray-400 mt-1">{selectedCustomer.phone}</p>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 mb-6">
                      <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Requested Services</h3>
                      <div className="flex flex-wrap gap-2">
                          {selectedCustomer.services.map((s, i) => (
                              <span key={i} className="bg-blue-900/50 text-blue-200 px-3 py-1 rounded-lg text-sm border border-blue-800">
                                  {s}
                              </span>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Total Duration</p>
                          <p className="font-bold text-xl">{selectedCustomer.total_duration} min</p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400">Joined At</p>
                          <p className="font-bold text-xl">{selectedCustomer.joined_at}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
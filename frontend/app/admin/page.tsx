"use client";
import { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [queueData, setQueueData] = useState<any>(null);

  // Function to refresh list
  const refreshQueue = async () => {
    try {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/status');
      const data = await res.json();
      setQueueData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshQueue();
    // Auto-refresh every 5 seconds so the barber sees new names instantly
    const interval = setInterval(refreshQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Function to Mark "Next Customer"
  const handleNext = async () => {
    await fetch('https://myspotnow-api.onrender.com/queue/next', { method: 'POST' });
    refreshQueue(); // Update UI immediately
  };

  if (!queueData) return <div className="p-10 text-white bg-gray-900 min-h-screen">Loading Vendor Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-blue-400">MySpotNow <span className="text-white text-sm font-normal">| Vendor Panel</span></h1>
        <div className="text-right">
          <p className="text-sm text-gray-400">Status</p>
          <p className="text-green-400 font-bold">● Online</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-2xl">
          <p className="text-gray-400 text-xs uppercase">In Queue</p>
          <p className="text-4xl font-bold">{queueData.people_ahead}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl">
          <p className="text-gray-400 text-xs uppercase">Wait Time</p>
          <p className="text-4xl font-bold">{queueData.estimated_wait_minutes}<span className="text-lg">m</span></p>
        </div>
      </div>

      {/* The "Big Button" for the Barber */}
      <button 
        onClick={handleNext}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-6 rounded-2xl text-xl shadow-lg transform transition active:scale-95 mb-8"
      >
        ✅ Call The Next Customer
      </button>

      {/* List of People */}
      <h3 className="text-gray-400 uppercase text-xs font-bold mb-4">Upcoming Customers</h3>
      <div className="space-y-3">
        {queueData.queue && queueData.queue.length === 0 ? (
          <p className="text-gray-600 italic">No one waiting...</p>
        ) : (
          queueData.queue && queueData.queue.map((person: any, index: number) => (
            <div key={index} className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border-l-4 border-blue-500">
              <div>
                <p className="font-bold text-lg">#{person.token} - {person.name}</p>
                <p className="text-xs text-gray-400">Waiting since {new Date(person.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              {index === 0 && <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">NEXT</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
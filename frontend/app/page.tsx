"use client";
import { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // New States for Popup
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const fetchQueue = async () => {
    try {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/status');
      const data = await res.json();
      setQueueData(data);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      // Don't stop loading if it's just a background refresh failure
    }
  };

  // --- THE FIX: Auto-Refresh every 3 seconds ---
  useEffect(() => {
    fetchQueue(); // 1. Load immediately
    
    // 2. Set up a timer to ask the server every 3 seconds
    const interval = setInterval(() => {
      fetchQueue();
    }, 3000);

    // 3. Clean up the timer when the user leaves the page
    return () => clearInterval(interval);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);

    try {
      const res = await fetch('https://myspotnow-api.onrender.com/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          phone: userPhone,
          service_type: "Haircut"
        }),
      });

      const result = await res.json();
      
      if (res.ok) {
        alert(`Success! Your Token is #${result.your_token}`);
        setShowModal(false);
        setUserName("");
        setUserPhone("");
        fetchQueue();
      } else {
        alert("Something went wrong.");
      }
    } catch (error) {
      alert("Could not connect to server.");
    }
    
    setIsJoining(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!queueData) return <div className="flex h-screen items-center justify-center text-red-500">Server Offline</div>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 relative">
      
      {/* Main Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-blue-600 p-6 text-center text-white relative">
          <h1 className="text-3xl font-black tracking-tighter">MySpotNow</h1>
          <p className="text-blue-100 text-sm mt-1">{queueData.salon_name}</p>
        </div>

        <div className="py-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Estimated Wait</p>
          
          {/* Animated Timer */}
          <div className="text-7xl font-black text-gray-800 transition-all duration-500">
            {queueData.estimated_wait_minutes}
            <span className="text-2xl font-medium text-gray-400 ml-1">min</span>
          </div>

          <div className="mt-8 inline-flex items-center bg-green-50 border border-green-100 px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-green-700">{queueData.people_ahead} People in Queue</span>
          </div>
        </div>

        <div className="bg-gray-50 p-6">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition active:scale-95"
          >
            Join Queue Now
          </button>
        </div>
      </div>

      {/* Popup Modal */}
      {showModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Book Your Spot</h2>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Your Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-blue-500 text-black"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-blue-500 text-black"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isJoining}
                  className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {isJoining ? "Booking..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
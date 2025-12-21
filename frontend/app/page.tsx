"use client";
import { useState, useEffect } from 'react';

// --- TYPES ---
type Customer = {
  token: number;
  name: string;
  services: string[];
  total_duration: number;
  joined_at: string;
};

type QueueData = {
  people_ahead: number;
  total_wait_minutes: number;
  queue: Customer[];
};

const SERVICE_OPTIONS = [
  { name: "Haircut", time: 20 },
  { name: "Shave", time: 10 },
  { name: "Massage", time: 15 },
  { name: "Facial", time: 25 },
];

export default function Home() {
  const [data, setData] = useState<QueueData | null>(null);
  const [myToken, setMyToken] = useState<number | null>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // For adding extra services
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const API_URL = 'https://myspotnow-api.onrender.com'; 

  // --- INITIAL LOAD ---
  useEffect(() => {
    const savedToken = localStorage.getItem('slotSync_token');
    if (savedToken) setMyToken(parseInt(savedToken));

    fetchStatus();
    const poller = setInterval(fetchStatus, 3000); 
    
    // LIVE TIMER COUNTDOWN (Updates every second)
    const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
        clearInterval(poller);
        clearInterval(timer);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/queue/status`);
      const json = await res.json();
      setData(json);
      // Sync the countdown timer with server time (converted to seconds)
      // Only update if the difference is large to prevent "jumping"
      if (Math.abs(json.total_wait_minutes * 60 - timeLeft) > 5) {
          setTimeLeft(json.total_wait_minutes * 60);
      }
    } catch (err) console.error(err);
  };

  // --- HANDLER: TOGGLE SERVICES ---
  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
        setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
        setSelectedServices([...selectedServices, service]);
    }
  };

  // --- HANDLER: JOIN QUEUE ---
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return alert("Please enter a valid 10-digit phone number.");
    if (selectedServices.length === 0) return alert("Please select at least one service.");

    const res = await fetch(`${API_URL}/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, services: selectedServices }),
    });

    if (res.ok) {
        const result = await res.json();
        localStorage.setItem('slotSync_token', result.your_token.toString());
        setMyToken(result.your_token);
        setShowModal(false);
        fetchStatus();
    } else {
        alert("Error joining queue.");
    }
  };

  // --- HANDLER: ADD EXTRA SERVICE ---
  const handleAddService = async () => {
     if (selectedServices.length === 0) return;
     
     const res = await fetch(`${API_URL}/queue/add-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: myToken, new_services: selectedServices }),
     });

     if (res.ok) {
         alert("Services Added! Queue time updated.");
         setShowAddModal(false);
         setSelectedServices([]); // Reset selection
         fetchStatus();
     }
  };

  // --- FORMATTER: SECONDS TO MM:SS ---
  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const amIInQueue = data?.queue.some(c => c.token === myToken);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center font-sans">
      
      {/* STATUS CARD */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-6 border border-gray-100">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h1 className="text-2xl font-black">SlotSync</h1>
          <p className="text-blue-100 text-sm">Live Queue Status</p>
        </div>

        <div className="p-8 text-center">
            <p className="text-xs font-bold uppercase text-gray-400 mb-2">Estimated Wait</p>
            {/* LIVE COUNTDOWN DISPLAY */}
            <div className="text-6xl font-black text-gray-800 tracking-tighter font-mono">
                {formatTime(timeLeft)}
            </div>

            {amIInQueue ? (
                <div className="mt-6 animate-in zoom-in">
                    <p className="text-lg font-bold text-blue-600">You are Token #{myToken}</p>
                    <button 
                        onClick={() => { setSelectedServices([]); setShowAddModal(true); }}
                        className="mt-4 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-full text-sm hover:bg-gray-200"
                    >
                        + Add More Services
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowModal(true)}
                    className="w-full mt-8 bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg"
                >
                    Join Queue
                </button>
            )}
        </div>
      </div>

      {/* MODAL: JOIN QUEUE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg mb-4">Join Queue</h2>
            <form onSubmit={handleJoin} className="space-y-4">
               <input 
                  className="w-full p-3 border rounded-xl" 
                  placeholder="Name" 
                  value={name} onChange={e => setName(e.target.value)} required 
               />
               <input 
                  type="number"
                  className="w-full p-3 border rounded-xl" 
                  placeholder="Phone (10 digits)" 
                  value={phone} onChange={e => setPhone(e.target.value)} required 
               />
               
               <div className="grid grid-cols-2 gap-2">
                   {SERVICE_OPTIONS.map(s => (
                       <button
                           type="button"
                           key={s.name}
                           onClick={() => toggleService(s.name)}
                           className={`p-2 rounded-lg text-xs font-bold border transition
                             ${selectedServices.includes(s.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'}
                           `}
                       >
                           {s.name} ({s.time}m)
                       </button>
                   ))}
               </div>

               <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Confirm</button>
               <button type="button" onClick={() => setShowModal(false)} className="w-full text-gray-400 py-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICES */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h2 className="font-bold text-lg mb-4">Add Extra Services</h2>
                <div className="grid grid-cols-2 gap-2 mb-4">
                   {SERVICE_OPTIONS.map(s => (
                       <button
                           type="button"
                           key={s.name}
                           onClick={() => toggleService(s.name)}
                           className={`p-2 rounded-lg text-xs font-bold border transition
                             ${selectedServices.includes(s.name) ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-500 border-gray-200'}
                           `}
                       >
                           + {s.name}
                       </button>
                   ))}
                </div>
                <button onClick={handleAddService} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl">Update My Booking</button>
                <button onClick={() => setShowAddModal(false)} className="w-full text-gray-400 py-2 mt-2">Cancel</button>
            </div>
          </div>
      )}
    </main>
  );
}
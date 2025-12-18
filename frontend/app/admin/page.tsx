// "use client";

// import { useEffect, useState } from "react";

// export default function AdminPage() {
//   const ADMIN_PIN = "1234";
//   const API_URL = "https://myspotnow-api.onrender.com";

//   // --- STATE ---
//   const [isUnlocked, setIsUnlocked] = useState(false);
//   const [pinInput, setPinInput] = useState("");
//   const [activeTab, setActiveTab] = useState("queue"); // 'queue' or 'history'
  
//   const [queue, setQueue] = useState<any[]>([]);
//   const [history, setHistory] = useState<any[]>([]);
  
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState("");

//   // --- FETCHERS ---
//   const fetchData = async () => {
//     try {
//       // Fetch Queue
//       const resQueue = await fetch(`${API_URL}/queue`);
//       if (resQueue.ok) setQueue(await resQueue.json());

//       // Fetch History
//       const resHistory = await fetch(`${API_URL}/history`);
//       if (resHistory.ok) setHistory(await resHistory.json());
      
//       setStatus("Connected ✅");
//     } catch (err) {
//       setStatus("Connecting...");
//     }
//   };

//   useEffect(() => {
//     if (isUnlocked) {
//       fetchData();
//       const interval = setInterval(fetchData, 3000);
//       return () => clearInterval(interval);
//     }
//   }, [isUnlocked]);

//   // --- HANDLERS ---
//   const handleUnlock = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (pinInput === ADMIN_PIN) setIsUnlocked(true);
//     else alert("Incorrect PIN");
//   };

//   const handleAdd = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!name || !phone) return;
//     setLoading(true);
//     try {
//       await fetch(`${API_URL}/add`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ name, phone_number: phone }),
//       });
//       setName("");
//       setPhone("");
//       fetchData();
//     } catch (error) {
//       alert("Error adding customer");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleComplete = async (id: number) => {
//     if(!confirm("Mark as Done?")) return;
//     await fetch(`${API_URL}/remove/${id}`, { method: "DELETE" });
//     fetchData();
//   };

//   // --- VIEW: LOCK SCREEN ---
//   if (!isUnlocked) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-gray-800 text-white">
//         <form onSubmit={handleUnlock} className="flex flex-col gap-4 text-center">
//           <h1 className="text-2xl font-bold">Admin Access</h1>
//           <input
//             type="password"
//             className="rounded px-4 py-2 text-black text-center text-xl"
//             value={pinInput}
//             onChange={(e) => setPinInput(e.target.value)}
//             placeholder="PIN"
//             autoFocus
//           />
//           <button className="rounded bg-blue-500 py-2 font-bold">Unlock</button>
//         </form>
//       </div>
//     );
//   }

//   // --- VIEW: DASHBOARD ---
//   return (
//     <div className="min-h-screen p-4 bg-gray-50">
//       <div className="max-w-3xl mx-auto">
//         {/* Header */}
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-900">MySpot Manager</h1>
//           <div className="text-right">
//             <span className="text-xs text-green-600 font-bold block">{status}</span>
//             <button onClick={() => setIsUnlocked(false)} className="text-sm text-red-500 underline">Lock</button>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="flex mb-6 bg-white rounded shadow overflow-hidden">
//           <button 
//             onClick={() => setActiveTab("queue")}
//             className={`flex-1 py-3 font-bold ${activeTab === "queue" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
//           >
//             Current Queue ({queue.length})
//           </button>
//           <button 
//             onClick={() => setActiveTab("history")}
//             className={`flex-1 py-3 font-bold ${activeTab === "history" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
//           >
//             History ({history.length})
//           </button>
//         </div>

//         {/* TAB 1: QUEUE */}
//         {activeTab === "queue" && (
//           <div>
//             {/* Add Form */}
//             <form onSubmit={handleAdd} className="bg-white p-4 rounded shadow mb-4 flex gap-2">
//               <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="border p-2 rounded flex-1"/>
//               <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="border p-2 rounded w-24 md:w-auto"/>
//               <button disabled={loading} className="bg-green-600 text-white px-4 rounded font-bold">+</button>
//             </form>

//             {/* List */}
//             <div className="bg-white rounded shadow divide-y">
//               {queue.map((c) => (
//                 <div key={c.id} className="p-4 flex justify-between items-center">
//                   <span className="font-bold">{c.name}</span>
//                   <button onClick={() => handleComplete(c.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold">
//                     Mark Done
//                   </button>
//                 </div>
//               ))}
//               {queue.length === 0 && <div className="p-8 text-center text-gray-400">Queue is empty</div>}
//             </div>
//           </div>
//         )}

//         {/* TAB 2: HISTORY */}
//         {activeTab === "history" && (
//           <div className="bg-white rounded shadow divide-y">
//             {history.slice().reverse().map((c) => (
//               <div key={c.id} className="p-4 flex justify-between items-center opacity-75">
//                 <div>
//                   <span className="font-bold text-gray-800">{c.name}</span>
//                   <span className="block text-xs text-gray-400">ID: #{c.id} • {new Date(c.joined_at).toLocaleTimeString()}</span>
//                 </div>
//                 <span className="text-green-600 font-bold text-sm">Completed</span>
//               </div>
//             ))}
//             {history.length === 0 && <div className="p-8 text-center text-gray-400">No history yet</div>}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";
import { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/next"

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
         Call The Next Customer
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
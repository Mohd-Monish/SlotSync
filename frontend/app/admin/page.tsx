"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const ADMIN_PIN = "1234"; 

  // --- STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [queue, setQueue] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  // DEBUG STATE (To show you what is wrong)
  const [status, setStatus] = useState("Idle"); 
  const [lastError, setLastError] = useState("");

  // --- FETCHER ---
  const fetchQueue = async () => {
    try {
      setStatus("Fetching data...");
      const res = await fetch("https://myspotnow.onrender.com/queue");
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();
      setQueue(data);
      setStatus("Connected ✅");
      setLastError("");
    } catch (err: any) {
      console.error(err);
      setStatus("Connection Failed ❌");
      setLastError(err.message);
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (isUnlocked) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000); // Check every 5s
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  // --- HANDLERS ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
    } else {
      alert("Incorrect PIN");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Please fill in both Name and Phone");
      return;
    }
    
    setStatus("Adding customer...");
    try {
      const res = await fetch("https://myspotnow.onrender.com/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone }),
      });
      
      if (!res.ok) throw new Error(`Add Failed: ${res.status}`);
      
      setName("");
      setPhone("");
      fetchQueue(); // Refresh list immediately
    } catch (err: any) {
      alert("Failed to add: " + err.message);
      setLastError(err.message);
    }
  };

  const handleRemove = async (id: number) => {
    setStatus("Removing...");
    try {
      await fetch(`https://myspotnow.onrender.com/remove/${id}`, { method: "DELETE" });
      fetchQueue();
    } catch (err: any) {
      alert("Failed to remove");
    }
  };

  // --- VIEW 1: LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-800 text-white flex-col gap-4">
        <h1 className="text-2xl font-bold">Admin Locked</h1>
        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Enter PIN"
            className="rounded px-4 py-2 text-black text-center text-xl"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
          <button className="rounded bg-blue-500 py-2 font-bold">Unlock</button>
        </form>
      </div>
    );
  }

  // --- VIEW 2: DASHBOARD (DEBUG MODE) ---
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Queue Manager</h1>
          <button onClick={() => setIsUnlocked(false)} className="text-red-600 underline">Lock</button>
        </div>

        {/* --- DEBUG STATUS BAR --- */}
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 text-sm font-mono">
          <p><strong>Status:</strong> {status}</p>
          {lastError && <p className="text-red-600 font-bold mt-1">ERROR: {lastError}</p>}
        </div>

        {/* ADD FORM */}
        <form onSubmit={handleAdd} className="bg-white p-6 rounded shadow mb-6 flex gap-4">
          <input 
            className="border p-2 rounded flex-1"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input 
            className="border p-2 rounded flex-1"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button className="bg-green-600 text-white px-6 rounded font-bold hover:bg-green-700">
            Add
          </button>
        </form>

        {/* LIST */}
        <div className="bg-white rounded shadow divide-y">
          {queue.map((c) => (
            <div key={c.id} className="p-4 flex justify-between items-center">
              <span className="text-xl font-medium">{c.name}</span>
              <button 
                onClick={() => handleRemove(c.id)}
                className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          {queue.length === 0 && <div className="p-6 text-center text-gray-500">Queue Empty (or loading...)</div>}
        </div>
      </div>
    </div>
  );
}
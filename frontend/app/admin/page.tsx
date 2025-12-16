"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const ADMIN_PIN = "1234";
  const API_URL = "https://myspotnow-api.onrender.com";

  // --- STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' or 'history'
  
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // --- FETCHERS ---
  const fetchData = async () => {
    try {
      // Fetch Queue
      const resQueue = await fetch(`${API_URL}/queue`);
      if (resQueue.ok) setQueue(await resQueue.json());

      // Fetch History
      const resHistory = await fetch(`${API_URL}/history`);
      if (resHistory.ok) setHistory(await resHistory.json());
      
      setStatus("Connected ✅");
    } catch (err) {
      setStatus("Connecting...");
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  // --- HANDLERS ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) setIsUnlocked(true);
    else alert("Incorrect PIN");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone }),
      });
      setName("");
      setPhone("");
      fetchData();
    } catch (error) {
      alert("Error adding customer");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    if(!confirm("Mark as Done?")) return;
    await fetch(`${API_URL}/remove/${id}`, { method: "DELETE" });
    fetchData();
  };

  // --- VIEW: LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-800 text-white">
        <form onSubmit={handleUnlock} className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">Admin Access</h1>
          <input
            type="password"
            className="rounded px-4 py-2 text-black text-center text-xl"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN"
            autoFocus
          />
          <button className="rounded bg-blue-500 py-2 font-bold">Unlock</button>
        </form>
      </div>
    );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">MySpot Manager</h1>
          <div className="text-right">
            <span className="text-xs text-green-600 font-bold block">{status}</span>
            <button onClick={() => setIsUnlocked(false)} className="text-sm text-red-500 underline">Lock</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-white rounded shadow overflow-hidden">
          <button 
            onClick={() => setActiveTab("queue")}
            className={`flex-1 py-3 font-bold ${activeTab === "queue" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Current Queue ({queue.length})
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 font-bold ${activeTab === "history" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            History ({history.length})
          </button>
        </div>

        {/* TAB 1: QUEUE */}
        {activeTab === "queue" && (
          <div>
            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-white p-4 rounded shadow mb-4 flex gap-2">
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="border p-2 rounded flex-1"/>
              <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="border p-2 rounded w-24 md:w-auto"/>
              <button disabled={loading} className="bg-green-600 text-white px-4 rounded font-bold">+</button>
            </form>

            {/* List */}
            <div className="bg-white rounded shadow divide-y">
              {queue.map((c) => (
                <div key={c.id} className="p-4 flex justify-between items-center">
                  <span className="font-bold">{c.name}</span>
                  <button onClick={() => handleComplete(c.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold">
                    Mark Done
                  </button>
                </div>
              ))}
              {queue.length === 0 && <div className="p-8 text-center text-gray-400">Queue is empty</div>}
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white rounded shadow divide-y">
            {history.slice().reverse().map((c) => (
              <div key={c.id} className="p-4 flex justify-between items-center opacity-75">
                <div>
                  <span className="font-bold text-gray-800">{c.name}</span>
                  <span className="block text-xs text-gray-400">ID: #{c.id} • {new Date(c.joined_at).toLocaleTimeString()}</span>
                </div>
                <span className="text-green-600 font-bold text-sm">Completed</span>
              </div>
            ))}
            {history.length === 0 && <div className="p-8 text-center text-gray-400">No history yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";

// --- CONFIGURATION ---
const ADMIN_PASSWORD = "1234"; // <--- CHANGE THIS TO YOUR DESIRED PIN

export default function AdminPage() {
  // State for Login System
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // State for Admin Features
  const [queue, setQueue] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Check if already logged in (saved in browser)
  useEffect(() => {
    const savedAuth = localStorage.getItem("adminAuth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // 2. Fetch Queue (Only if logged in)
  useEffect(() => {
    if (isAuthenticated) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuth", "true"); // Save login so you don't type it every time
    } else {
      alert("Wrong Password!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuth");
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch("https://myspotnow.onrender.com/queue");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching queue:", error);
    }
  };

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);

    try {
      await fetch("https://myspotnow.onrender.com/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone }),
      });
      setName("");
      setPhone("");
      fetchQueue();
    } catch (error) {
      alert("Error adding customer");
    } finally {
      setLoading(false);
    }
  };

  const removeCustomer = async (id: number) => {
    if (!confirm("Remove this customer?")) return;
    try {
      await fetch(`https://myspotnow.onrender.com/remove/${id}`, {
        method: "DELETE",
      });
      fetchQueue();
    } catch (error) {
      alert("Error removing customer");
    }
  };

  // --- VIEW 1: LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
            Admin Access
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enter PIN
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 p-2 text-center text-2xl tracking-widest outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="****"
                maxLength={4}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-700"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW 2: DASHBOARD (Your Original Admin Page) ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Logout
          </button>
        </div>

        {/* Add Customer Form */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">
            Add New Customer
          </h2>
          <form onSubmit={addCustomer} className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              placeholder="Customer Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded border p-3 outline-none focus:border-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded border p-3 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-green-600 px-8 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add to Queue"}
            </button>
          </form>
        </div>

        {/* Queue List */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">
            Current Queue ({queue.length})
          </h2>
          {queue.length === 0 ? (
            <p className="text-gray-500">No customers in queue.</p>
          ) : (
            <ul className="divide-y">
              {queue.map((customer) => (
                <li
                  key={customer.id}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {customer.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Joined: {new Date(customer.joined_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeCustomer(customer.id)}
                    className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
                  >
                    Done / Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
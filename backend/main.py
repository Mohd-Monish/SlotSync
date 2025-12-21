from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

app = FastAPI()

# --- CRITICAL SETTING: Allow Frontend to talk to Backend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all for now (easier for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class Customer(BaseModel):
    name: str
    phone: str
    service_type: str = "Haircut"  # Default

# --- DATABASE (In-Memory for testing) ---
# This list resets every time you restart the server
queue_db = [
    {"token": 101, "name": "Rahul (Demo)", "status": "waiting", "time": time.time()},
    {"token": 102, "name": "Amit (Demo)", "status": "waiting", "time": time.time()}
]
current_token = 102

# --- API ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "SlotSync Backend is Live!"}

@app.get("/queue/status")
def get_status():
    # Logic: Count people waiting * 20 mins per person
    waiting_count = len(queue_db)
    eta_minutes = waiting_count * 20
    
    return {
        "salon_name": "Wise Salon - Wadhwa Wise City",
        "people_ahead": waiting_count,
        "estimated_wait_minutes": eta_minutes,
        "queue": queue_db  # Sending the list so we can see names
    }

@app.post("/queue/join")
def join_queue(customer: Customer):
    global current_token
    current_token += 1
    
    new_entry = {
        "token": current_token,
        "name": customer.name,
        "status": "waiting",
        "time": time.time()
    }
    
    queue_db.append(new_entry)
    
    return {
        "message": "Success",
        "your_token": current_token,
        "eta": len(queue_db) * 20
    }

# --- NEW: Vendor Controls (The Barber's Button) ---

@app.post("/queue/next")
def next_customer():
    if len(queue_db) > 0:
        # Remove the first person in line (FIFO)
        removed_customer = queue_db.pop(0)
        
        # Calculate new wait time
        new_eta = len(queue_db) * 20
        
        return {
            "message": f"Completed {removed_customer['name']}",
            "remaining_people": len(queue_db),
            "new_eta": new_eta
        }
    else:
        return {"message": "Queue is already empty!"}
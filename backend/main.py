from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
from typing import List, Optional

app = FastAPI()

# --- CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SERVICE MENU & TIMES (Minutes) ---
SERVICE_MENU = {
    "Haircut": 20,
    "Shave": 10,
    "Massage": 15,
    "Hair Color": 30,
    "Facial": 25
}

# --- MODELS ---
class JoinRequest(BaseModel):
    name: str
    phone: str
    services: List[str]  # e.g., ["Haircut", "Shave"]

    # VALIDATOR: Force 10-digit phone number
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return v

class AddServiceRequest(BaseModel):
    token: int
    new_services: List[str]

class LeaveRequest(BaseModel):
    token: int

# --- DATABASE ---
queue_db = []
history_db = []
current_token = 100

# --- HELPER: Calculate Total Queue Time ---
def calculate_eta():
    total_minutes = 0
    for customer in queue_db:
        total_minutes += customer['total_duration']
    return total_minutes

# --- ENDPOINTS ---

@app.get("/")
def home():
    return {"message": "SlotSync v2 Online"}

@app.get("/queue/status")
def get_status():
    return {
        "shop_status": "Open",
        "people_ahead": len(queue_db),
        "total_wait_minutes": calculate_eta(),
        "queue": queue_db,
        "history": history_db[-5:]
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    global current_token
    current_token += 1
    
    # Calculate how long this customer will take
    duration = sum([SERVICE_MENU.get(s, 0) for s in req.services])
    
    new_entry = {
        "token": current_token,
        "name": req.name,
        "phone": req.phone,
        "services": req.services,     # List of services
        "total_duration": duration,   # Total time for this person
        "status": "waiting",
        "joined_at": datetime.now().strftime("%I:%M %p")
    }
    
    queue_db.append(new_entry)
    
    return {
        "message": "Joined successfully",
        "your_token": current_token,
        "your_name": req.name,
        "eta": calculate_eta()
    }

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    # Find customer
    for customer in queue_db:
        if customer['token'] == req.token:
            # Add new services
            customer['services'].extend(req.new_services)
            # Recalculate their duration
            added_time = sum([SERVICE_MENU.get(s, 0) for s in req.new_services])
            customer['total_duration'] += added_time
            
            return {
                "message": "Services updated", 
                "new_total_time": customer['total_duration'],
                "global_eta": calculate_eta()
            }
            
    raise HTTPException(status_code=404, detail="Token not found")

@app.post("/queue/leave")
def leave_queue(req: LeaveRequest):
    global queue_db
    queue_db = [c for c in queue_db if c['token'] != req.token]
    return {"message": "Left queue"}

@app.post("/queue/next")
def next_customer():
    if len(queue_db) > 0:
        served = queue_db.pop(0)
        served["status"] = "completed"
        served["completed_at"] = datetime.now().strftime("%I:%M %p")
        history_db.append(served)
        return {"message": f"Called #{served['token']}"}
    return {"message": "Queue empty"}
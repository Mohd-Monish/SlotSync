from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
from typing import List

app = FastAPI()

# --- 1. CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. SERVICE MENU (Time in Minutes) ---
MENU = {
    "Haircut": 20,
    "Shave": 10,
    "Head Massage": 15,
    "Hair Color": 45,
    "Facial": 30
}

# --- 3. DATA MODELS ---
class JoinRequest(BaseModel):
    name: str
    phone: str
    services: List[str]

    # VALIDATOR: Strict 10-digit check
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Phone must be 10 digits')
        return v

class AddServiceRequest(BaseModel):
    token: int
    new_services: List[str]

# --- 4. DATABASE ---
queue_db = []
history_db = []
current_token = 100

# --- 5. HELPER ---
def get_total_wait_time():
    return sum(c['total_duration'] for c in queue_db)

# --- 6. ENDPOINTS ---

@app.get("/")
def home():
    return {"status": "Online", "mode": "Advanced UI"}

@app.get("/queue/status")
def get_status():
    return {
        "shop_status": "Open",
        "people_ahead": len(queue_db),
        "total_wait_minutes": get_total_wait_time(),
        "queue": queue_db,
        "history": history_db[-3:]
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    global current_token
    current_token += 1
    
    # Calculate duration based on selected services
    duration = sum(MENU.get(s, 0) for s in req.services)
    
    new_customer = {
        "token": current_token,
        "name": req.name,
        "phone": req.phone,
        "services": req.services,
        "total_duration": duration,
        "status": "waiting",
        "joined_at": datetime.now().strftime("%I:%M %p")
    }
    
    queue_db.append(new_customer)
    return {"message": "Joined", "token": current_token, "data": new_customer}

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    for customer in queue_db:
        if customer['token'] == req.token:
            customer['services'].extend(req.new_services)
            customer['total_duration'] += sum(MENU.get(s, 0) for s in req.new_services)
            return {"message": "Updated", "new_time": customer['total_duration']}
    raise HTTPException(status_code=404, detail="Token not found")

@app.post("/queue/next")
def next_customer():
    if not queue_db: return {"message": "Queue Empty"}
    customer = queue_db.pop(0)
    customer['status'] = 'completed'
    history_db.insert(0, customer)
    return {"message": f"Called #{customer['token']}"}

@app.post("/queue/reset")
def reset_system():
    global queue_db, history_db, current_token
    queue_db = []
    history_db = []
    current_token = 100
    return {"message": "System Reset"}
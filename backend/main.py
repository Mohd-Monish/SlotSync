from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MENU = {
    "Haircut": 20,
    "Shave": 10,
    "Head Massage": 15,
    "Hair Color": 45,
    "Facial": 30
}

# --- DB & STATE ---
queue_db = []
history_db = []
current_token = 100
current_service_start = None

# --- MODELS ---
class JoinRequest(BaseModel):
    name: str
    phone: str
    services: List[str]
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10: raise ValueError('Phone must be 10 digits')
        return v

class AddServiceRequest(BaseModel):
    token: int
    new_services: List[str]

class MoveRequest(BaseModel):
    token: int
    direction: str 

class EditRequest(BaseModel):
    token: int
    services: List[str]

class ActionRequest(BaseModel):
    token: int

# --- HELPERS ---
def calculate_status():
    total_minutes = sum(c['total_duration'] for c in queue_db)
    elapsed = 0
    if queue_db and current_service_start:
        elapsed = (datetime.now() - current_service_start).total_seconds()
    
    # Calculate real remaining seconds
    seconds_left = max(0, (total_minutes * 60) - elapsed)
    
    return {
        "count": len(queue_db), 
        "seconds_left": int(seconds_left), 
        "stats": {
            "served": len(history_db), 
            "minutes": sum(c['total_duration'] for c in history_db)
        }
    }

# --- ENDPOINTS ---
@app.get("/")
def home(): return {"status": "Online"}

@app.get("/queue/status")
def get_status():
    st = calculate_status()
    return {
        "shop_status": "Open", 
        "people_ahead": st["count"], 
        "seconds_left": st["seconds_left"], 
        "queue": queue_db, 
        "daily_stats": st["stats"]
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    global current_token, current_service_start
    if len(queue_db) == 0: current_service_start = datetime.now()
    current_token += 1
    dur = sum(MENU.get(s, 0) for s in list(set(req.services)))
    queue_db.append({
        "token": current_token, "name": req.name, "phone": req.phone, 
        "services": list(set(req.services)), "total_duration": dur, 
        "status": "waiting", "joined_at": datetime.now().strftime("%I:%M %p")
    })
    return {"message": "Joined", "token": current_token}

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    for c in queue_db:
        if c['token'] == req.token:
            for s in req.new_services:
                if s not in c['services']:
                    c['services'].append(s)
                    c['total_duration'] += MENU.get(s, 0)
            return {"message": "Updated"}
    raise HTTPException(404, "Not found")

@app.post("/queue/next")
def next_customer():
    global current_service_start
    if not queue_db: return {"message": "Empty"}
    c = queue_db.pop(0)
    c['status'] = 'completed'
    history_db.insert(0, c)
    current_service_start = datetime.now() if queue_db else None
    return {"message": "Next"}

@app.post("/queue/reset")
def reset():
    global queue_db, history_db, current_token, current_service_start
    queue_db = []
    history_db = []
    current_token = 100
    current_service_start = None
    return {"message": "Reset"}

# --- MASTER ENDPOINTS ---
@app.post("/queue/move")
def move_customer(req: MoveRequest):
    idx = next((i for i, c in enumerate(queue_db) if c['token'] == req.token), -1)
    if idx == -1: return {"message": "Not found"}
    if req.direction == "up" and idx > 0:
        queue_db[idx], queue_db[idx-1] = queue_db[idx-1], queue_db[idx]
    elif req.direction == "down" and idx < len(queue_db) - 1:
        queue_db[idx], queue_db[idx+1] = queue_db[idx+1], queue_db[idx]
    return {"message": "Moved"}

@app.post("/queue/edit")
def edit_customer(req: EditRequest):
    for c in queue_db:
        if c['token'] == req.token:
            # 1. Update Services
            c['services'] = req.services
            # 2. Recalculate Time (Crucial for Global Timer Sync)
            c['total_duration'] = sum(MENU.get(s, 0) for s in req.services)
            return {"message": "Edited"}
    return {"message": "Not found"}

@app.post("/queue/delete")
def delete_customer(req: ActionRequest):
    global queue_db
    queue_db = [c for c in queue_db if c['token'] != req.token]
    return {"message": "Deleted"}

@app.post("/queue/serve-now")
def serve_now(req: ActionRequest):
    idx = next((i for i, c in enumerate(queue_db) if c['token'] == req.token), -1)
    if idx > 0:
        item = queue_db.pop(idx)
        queue_db.insert(0, item)
    return {"message": "Moved to front"}
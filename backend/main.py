import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from datetime import datetime
from typing import List, Optional
from pymongo import MongoClient
from passlib.context import CryptContext

app = FastAPI()

# --- CONFIG ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MENU = {
    "Haircut": 20, "Shave": 10, "Head Massage": 15, "Hair Color": 45, "Facial": 30
}

# --- SECURITY & DB CONNECTION ---
# Your MongoDB Connection String
MONGO_URI = "mongodb+srv://mrmonish1122_db_user:e6cbLGZyWGv3qrqu@slotsync-startup.xalblqt.mongodb.net/?appName=SlotSync-Startup"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    client = MongoClient(MONGO_URI)
    db = client["slotsync_db"]
    
    # COLLECTIONS
    queue_col = db["queue"]       # Active Queue
    history_col = db["history"]   # Booking Logs
    users_col = db["users"]       # User Accounts
    admins_col = db["admins"]     # Admin Accounts
    config_col = db["config"]     # Timer State
    
    print("✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ DB Error: {e}")

# --- HELPERS ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_service_start_time():
    config = config_col.find_one({"_id": "timer_state"})
    if config and config.get("start_time"): return config["start_time"]
    return None

def set_service_start_time(dt):
    config_col.update_one({"_id": "timer_state"}, {"$set": {"start_time": dt}}, upsert=True)

# --- MODELS ---
class UserSignup(BaseModel):
    username: str; password: str; phone: str; name: str

class LoginRequest(BaseModel):
    username: str; password: str

class JoinRequest(BaseModel):
    name: str; phone: str; services: List[str]
    @validator('phone')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10: raise ValueError('Phone must be 10 digits')
        return v

class AddServiceRequest(BaseModel):
    token: int; new_services: List[str]

class MoveRequest(BaseModel):
    token: int; direction: str 

class EditRequest(BaseModel):
    token: int; services: List[str]

class ActionRequest(BaseModel):
    token: int

# --- AUTH ENDPOINTS (NEW) ---

@app.post("/auth/signup")
def user_signup(req: UserSignup):
    if users_col.find_one({"username": req.username}):
        raise HTTPException(400, "Username already taken")
    
    new_user = {
        "username": req.username,
        "password": get_password_hash(req.password),
        "phone": req.phone,
        "name": req.name,
        "created_at": datetime.now()
    }
    users_col.insert_one(new_user)
    return {"message": "Account created"}

@app.post("/auth/login")
def user_login(req: LoginRequest):
    user = users_col.find_one({"username": req.username})
    if not user or not verify_password(req.password, user['password']):
        raise HTTPException(401, "Invalid credentials")
    return {"message": "Login successful", "name": user['name'], "phone": user['phone']}

@app.post("/admin/create")
def create_admin(req: LoginRequest):
    # Security: Check if admin already exists
    if admins_col.count_documents({}) > 0:
        raise HTTPException(403, "Admin already exists")
    
    admin = {
        "username": req.username,
        "password": get_password_hash(req.password)
    }
    admins_col.insert_one(admin)
    return {"message": "Admin created"}

@app.post("/admin/login")
def admin_login(req: LoginRequest):
    admin = admins_col.find_one({"username": req.username})
    if not admin or not verify_password(req.password, admin['password']):
        raise HTTPException(401, "Invalid admin credentials")
    return {"message": "Welcome Admin", "access": "granted"}

# --- QUEUE ENDPOINTS ---

@app.get("/queue/status")
def get_status():
    queue_list = list(queue_col.find().sort("order_index", 1))
    total_minutes = sum(c['total_duration'] for c in queue_list)
    
    start_time = get_service_start_time()
    elapsed = 0
    if queue_list and start_time:
        elapsed = (datetime.now() - start_time).total_seconds()
    
    global_seconds_left = max(0, (total_minutes * 60) - elapsed)
    
    # Stats
    history_count = history_col.count_documents({})
    
    for q in queue_list: q.pop("_id", None)
    
    return {
        "shop_status": "Open", 
        "people_ahead": len(queue_list),
        "seconds_left": int(global_seconds_left), 
        "elapsed_seconds": int(elapsed),
        "queue": queue_list, 
        "daily_stats": {"served": history_count}
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    if queue_col.count_documents({}) == 0: set_service_start_time(datetime.now())

    # Get Next Token
    last_q = queue_col.find_one(sort=[("token", -1)])
    last_h = history_col.find_one(sort=[("token", -1)])
    t1 = last_q["token"] if last_q else 99
    t2 = last_h["token"] if last_h else 99
    new_token = max(t1, t2) + 1
    
    # Get Order Index
    last_item = queue_col.find_one(sort=[("order_index", -1)])
    new_order = (last_item["order_index"] + 1) if last_item else 1

    dur = sum(MENU.get(s, 0) for s in list(set(req.services)))

    new_customer = {
        "token": new_token, "name": req.name, "phone": req.phone, 
        "services": list(set(req.services)), "total_duration": dur, 
        "status": "waiting", 
        "joined_at": datetime.now(),
        "joined_at_str": datetime.now().strftime("%I:%M %p"),
        "order_index": new_order
    }
    queue_col.insert_one(new_customer)
    return {"message": "Joined", "token": new_token}

@app.post("/queue/next")
def next_customer():
    first = queue_col.find_one(sort=[("order_index", 1)])
    if not first: return {"message": "Empty"}
    
    # Log to History with completion time
    first["status"] = "completed"
    first["completed_at"] = datetime.now()
    first["completed_at_str"] = datetime.now().strftime("%I:%M %p")
    
    history_col.insert_one(first)
    queue_col.delete_one({"_id": first["_id"]})
    
    if queue_col.count_documents({}) > 0: set_service_start_time(datetime.now())
    else: set_service_start_time(None)
        
    return {"message": "Next"}

# --- OTHER UTILS (Add/Move/Edit/Delete/Reset/ServeNow) ---

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    customer = queue_col.find_one({"token": req.token})
    if not customer: raise HTTPException(404, "Not found")
    updated = list(set(customer["services"] + req.new_services))
    new_dur = sum(MENU.get(s, 0) for s in updated)
    queue_col.update_one({"token": req.token}, {"$set": {"services": updated, "total_duration": new_dur}})
    return {"message": "Updated"}

@app.post("/queue/move")
def move_customer(req: MoveRequest):
    person = queue_col.find_one({"token": req.token})
    if not person: return {"message": "Not found"}
    current_order = person["order_index"]
    if req.direction == "up":
        neighbor = queue_col.find_one({"order_index": {"$lt": current_order}}, sort=[("order_index", -1)])
    else:
        neighbor = queue_col.find_one({"order_index": {"$gt": current_order}}, sort=[("order_index", 1)])
    if neighbor:
        queue_col.update_one({"_id": person["_id"]}, {"$set": {"order_index": neighbor["order_index"]}})
        queue_col.update_one({"_id": neighbor["_id"]}, {"$set": {"order_index": current_order}})
    return {"message": "Moved"}

@app.post("/queue/edit")
def edit_customer(req: EditRequest):
    new_dur = sum(MENU.get(s, 0) for s in req.services)
    res = queue_col.update_one({"token": req.token}, {"$set": {"services": req.services, "total_duration": new_dur}})
    if res.matched_count == 0: return {"message": "Not found"}
    return {"message": "Edited"}

@app.post("/queue/delete")
def delete_customer(req: ActionRequest):
    queue_col.delete_one({"token": req.token})
    return {"message": "Deleted"}

@app.post("/queue/serve-now")
def serve_now(req: ActionRequest):
    first = queue_col.find_one(sort=[("order_index", 1)])
    lowest = first["order_index"] if first else 1
    queue_col.update_one({"token": req.token}, {"$set": {"order_index": lowest - 1}})
    return {"message": "Front"}

@app.post("/queue/reset")
def reset():
    queue_col.delete_many({})
    history_col.delete_many({})
    set_service_start_time(None)
    return {"message": "Reset"}
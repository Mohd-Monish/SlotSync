import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from pymongo import MongoClient
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# --- 1. CONFIGURATION ---
origins = [
    "http://localhost:3000",       # Localhost Frontend
    "http://127.0.0.1:3000",       # Alternate Localhost
    "https://test.slotsync.in",    # Production Domain
    "*"                            # Fallback
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI") 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    client = MongoClient(MONGO_URI)
    db = client["slotsync_db"]
    # Collections
    queue_col = db["queue"]
    users_col = db["users"]
    admins_col = db["admins"]
    config_col = db["config"]
    salons_col = db["salons"]
    print("✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ DB Error: {e}")

# --- HELPERS ---
def get_password_hash(password): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

def get_service_start_time(salon_id):
    config = config_col.find_one({"_id": f"timer_{salon_id}"})
    if config and config.get("start_time"): return config["start_time"]
    return None

def set_service_start_time(salon_id, dt):
    config_col.update_one({"_id": f"timer_{salon_id}"}, {"$set": {"start_time": dt}}, upsert=True)

# --- MODELS ---
class UserSignup(BaseModel):
    username: str; password: str; phone: str; name: str

class LoginRequest(BaseModel):
    username: str; password: str

class JoinRequest(BaseModel):
    salon_id: str 
    name: str; phone: str; services: List[str]

class AddServiceRequest(BaseModel):
    token: int; new_services: List[str]

class ActionRequest(BaseModel):
    token: int
    salon_id: Optional[str] = None 

class EditRequest(BaseModel):
    token: int; services: List[str]

class MoveRequest(BaseModel):
    token: int; direction: str

# --- SALON DATA ROUTES ---

@app.get("/salons")
def get_salons():
    # Return all salons (hiding internal DB ID)
    return list(salons_col.find({}, {"_id": 0}))

@app.get("/salons/{salon_id}")
def get_salon_details(salon_id: str):
    salon = salons_col.find_one({"id": salon_id}, {"_id": 0})
    if not salon:
        raise HTTPException(404, "Salon not found")
    return salon

@app.get("/salons/seed") 
def seed_salons():
    # 🔥 NUCLEAR OPTION: Clears old data to prevent bugs
    salons_col.delete_many({}) 
    
    mock_data = [
        { 
            "id": "salon_101", 
            "name": "Cool Cuts Mumbai", 
            "location": "Bandra West, Mumbai", 
            "status": "Open", 
            "image": "💈",
            "wait_time": 15,
            "menu": [
                {"name": "Haircut", "time": 20, "price": 200},
                {"name": "Shave", "time": 10, "price": 100},
                {"name": "Head Massage", "time": 15, "price": 150},
                {"name": "Cleanup", "time": 25, "price": 400}
            ]
        },
        { 
            "id": "salon_102", 
            "name": "Delhi Style Studio", 
            "location": "Connaught Place, Delhi", 
            "status": "Busy", 
            "image": "✂️",
            "wait_time": 45,
            "menu": [
                {"name": "Premium Haircut", "time": 45, "price": 500},
                {"name": "Beard Styling", "time": 20, "price": 250},
                {"name": "Hair Color", "time": 60, "price": 1200},
                {"name": "Facial", "time": 30, "price": 800}
            ]
        },
        { 
            "id": "salon_103", 
            "name": "Bangalore Buzz", 
            "location": "Indiranagar, Bangalore", 
            "status": "Open", 
            "image": "💇‍♂️",
            "wait_time": 5,
            "menu": [
                {"name": "Quick Trim", "time": 10, "price": 150},
                {"name": "Full Service", "time": 40, "price": 600}
            ]
        },
    ]
    salons_col.insert_many(mock_data)
    return {"message": "Database Successfully Reset with 3 Salons & Menus!"}

# --- QUEUE ROUTES ---

@app.get("/queue/status")
def get_status(salon_id: str):
    queue_list = list(queue_col.find({"salon_id": salon_id}).sort("order_index", 1))
    
    start_time = get_service_start_time(salon_id)
    time_served_so_far = 0
    if queue_list and start_time:
        delta = datetime.now() - start_time
        time_served_so_far = max(0, delta.total_seconds())
    
    cumulative_wait = 0
    
    # Calculate wait times dynamically
    for index, person in enumerate(queue_list):
        person.pop("_id", None)
        person_duration_sec = person.get('total_duration', 0) * 60
        
        if index == 0:
            remaining = max(0, person_duration_sec - time_served_so_far)
            person['estimated_wait'] = 0 
            person['time_remaining_in_service'] = int(remaining)
            cumulative_wait = remaining 
        else:
            person['estimated_wait'] = int(cumulative_wait)
            cumulative_wait += person_duration_sec

    return {
        "shop_status": "Open", 
        "people_ahead": len(queue_list),
        "queue": queue_list,
        "seconds_left": int(cumulative_wait)
    }

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    # Retrieve Menu to calculate duration correctly (Security Step)
    salon = salons_col.find_one({"id": req.salon_id})
    if not salon: raise HTTPException(404, "Salon not found")
    
    # Calculate duration based on REAL database values
    total_dur = 0
    valid_services = []
    for s_name in req.services:
        item = next((m for m in salon.get("menu", []) if m["name"] == s_name), None)
        if item:
            total_dur += item["time"]
            valid_services.append(s_name)

    if queue_col.count_documents({"salon_id": req.salon_id}) == 0: 
        set_service_start_time(req.salon_id, datetime.now())
    
    last_q = queue_col.find_one(sort=[("token", -1)])
    t1 = last_q["token"] if last_q else 99
    new_token = t1 + 1
    
    last_item = queue_col.find_one({"salon_id": req.salon_id}, sort=[("order_index", -1)])
    new_order = (last_item["order_index"] + 1) if last_item else 1
    
    queue_col.insert_one({
        "token": new_token, 
        "salon_id": req.salon_id,
        "name": req.name, 
        "phone": req.phone, 
        "services": valid_services, 
        "total_duration": total_dur, 
        "order_index": new_order, 
        "joined_at_str": datetime.now().strftime("%I:%M %p")
    })
    return {"message": "Joined", "token": new_token}

# --- AUTH ROUTES ---
@app.post("/auth/signup")
def user_signup(req: UserSignup):
    if users_col.find_one({"username": req.username}): raise HTTPException(400, "Username taken")
    new_user = { "username": req.username, "password": get_password_hash(req.password), "phone": req.phone, "name": req.name }
    users_col.insert_one(new_user)
    return {"message": "Account created"}

@app.post("/auth/login")
def user_login(req: LoginRequest):
    user = users_col.find_one({"username": req.username})
    if not user or not verify_password(req.password, user['password']): raise HTTPException(401, "Invalid")
    return {"message": "Success", "name": user['name'], "phone": user['phone']}

@app.post("/admin/login")
def admin_login(req: LoginRequest):
    # In production, check Admin DB. For now, allow default.
    return {"message": "Welcome Admin"}

# --- QUEUE MANAGEMENT (ADMIN) ---
@app.post("/queue/next")
def next_customer(req: ActionRequest = None): 
    if req and req.salon_id: salon_id = req.salon_id
    else: return {"message": "Salon ID required"}

    first = queue_col.find_one({"salon_id": salon_id}, sort=[("order_index", 1)])
    if not first: return {"message": "Empty"}
    
    queue_col.delete_one({"_id": first["_id"]})
    
    if queue_col.count_documents({"salon_id": salon_id}) > 0: 
        set_service_start_time(salon_id, datetime.now())
    else: 
        set_service_start_time(salon_id, None)
    return {"message": "Next"}

@app.post("/queue/move")
def move_customer(req: MoveRequest):
    p = queue_col.find_one({"token": req.token})
    if not p: return {"message": "Not found"}
    salon_id = p.get("salon_id")

    curr = p["order_index"]
    target = queue_col.find_one({"salon_id": salon_id, "order_index": {"$lt": curr}}, sort=[("order_index", -1)]) if req.direction == "up" else queue_col.find_one({"salon_id": salon_id, "order_index": {"$gt": curr}}, sort=[("order_index", 1)])
    
    if target:
        queue_col.update_one({"_id": p["_id"]}, {"$set": {"order_index": target["order_index"]}})
        queue_col.update_one({"_id": target["_id"]}, {"$set": {"order_index": curr}})
    return {"message": "Moved"}

@app.post("/queue/delete")
def delete_customer(req: ActionRequest):
    queue_col.delete_one({"token": req.token})
    return {"message": "Deleted"}

@app.post("/queue/reset")
def reset(req: ActionRequest = None):
    queue_col.delete_many({})
    config_col.delete_many({})
    return {"message": "Reset"}
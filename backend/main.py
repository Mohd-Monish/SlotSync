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

MENU = { "Haircut": 20, "Shave": 10, "Head Massage": 15, "Hair Color": 45, "Facial": 30 }
MONGO_URI = os.getenv("MONGO_URI") 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    client = MongoClient(MONGO_URI)
    db = client["slotsync_db"]
    queue_col = db["queue"]
    history_col = db["history"]
    users_col = db["users"]
    admins_col = db["admins"]
    config_col = db["config"]
    print("✅ Connected to MongoDB")
except Exception as e:
    print(f"❌ DB Error: {e}")

# --- HELPERS ---
def get_password_hash(password): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

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

class ActionRequest(BaseModel):
    token: int

class EditRequest(BaseModel):
    token: int; services: List[str]

class MoveRequest(BaseModel):
    token: int; direction: str

# --- ROUTES ---

@app.get("/queue/status")
def get_status():
    # 1. Get raw queue sorted by order
    queue_list = list(queue_col.find().sort("order_index", 1))
    
    # 2. Calculate "Time Served" for the current person
    start_time = get_service_start_time()
    time_served_so_far = 0
    if queue_list and start_time:
        delta = datetime.now() - start_time
        time_served_so_far = max(0, delta.total_seconds())
    
    # 3. Calculate INDIVIDUAL wait times for everyone
    cumulative_wait = 0
    
    for index, person in enumerate(queue_list):
        person.pop("_id", None) # Clean ID
        
        # Duration of THIS person's service in seconds
        person_duration_sec = person['total_duration'] * 60
        
        if index == 0:
            # First person: Wait is (Duration - Time Served)
            remaining = max(0, person_duration_sec - time_served_so_far)
            person['estimated_wait'] = 0 # They are serving now
            person['time_remaining_in_service'] = int(remaining)
            cumulative_wait = remaining # This is the wait for the NEXT person
        else:
            # Everyone else: Wait is the accumulative pile before them
            person['estimated_wait'] = int(cumulative_wait)
            person['time_remaining_in_service'] = int(person_duration_sec)
            cumulative_wait += person_duration_sec

    # 4. Total Shop Wait (Time until empty)
    global_wait = cumulative_wait
    
    return {
        "shop_status": "Open", 
        "people_ahead": len(queue_list),
        "queue": queue_list,
        "seconds_left": int(global_wait) # For stats only
    }

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

@app.post("/admin/create")
def create_admin(req: LoginRequest):
    if admins_col.count_documents({}) > 0: raise HTTPException(403, "Admin exists")
    admins_col.insert_one({"username": req.username, "password": get_password_hash(req.password)})
    return {"message": "Admin created"}

@app.post("/admin/login")
def admin_login(req: LoginRequest):
    admin = admins_col.find_one({"username": req.username})
    if not admin or not verify_password(req.password, admin['password']): raise HTTPException(401, "Invalid")
    return {"message": "Welcome Admin"}

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    if queue_col.count_documents({}) == 0: set_service_start_time(datetime.now())
    
    last_q = queue_col.find_one(sort=[("token", -1)])
    last_h = history_col.find_one(sort=[("token", -1)])
    t1 = last_q["token"] if last_q else 99
    t2 = last_h["token"] if last_h else 99
    new_token = max(t1, t2) + 1
    
    last_item = queue_col.find_one(sort=[("order_index", -1)])
    new_order = (last_item["order_index"] + 1) if last_item else 1
    
    dur = sum(MENU.get(s, 0) for s in list(set(req.services)))
    
    queue_col.insert_one({
        "token": new_token, "name": req.name, "phone": req.phone, 
        "services": list(set(req.services)), "total_duration": dur, 
        "order_index": new_order, "joined_at_str": datetime.now().strftime("%I:%M %p")
    })
    return {"message": "Joined", "token": new_token}

@app.post("/queue/cancel")
def cancel_booking(req: ActionRequest):
    # Check if this person is currently being served (index 0)
    user = queue_col.find_one({"token": req.token})
    if not user: return {"message": "Not found"}
    
    # If we delete the first person, we must reset the timer for the next person
    first_person = queue_col.find_one(sort=[("order_index", 1)])
    if first_person and first_person["token"] == req.token:
        set_service_start_time(datetime.now()) # Reset timer for next person

    queue_col.delete_one({"token": req.token})
    
    # If queue is empty after delete
    if queue_col.count_documents({}) == 0: set_service_start_time(None)
    
    return {"message": "Cancelled"}

@app.post("/queue/next")
def next_customer():
    first = queue_col.find_one(sort=[("order_index", 1)])
    if not first: return {"message": "Empty"}
    
    history_col.insert_one(first)
    queue_col.delete_one({"_id": first["_id"]})
    
    if queue_col.count_documents({}) > 0: set_service_start_time(datetime.now())
    else: set_service_start_time(None)
    return {"message": "Next"}

@app.post("/queue/move")
def move_customer(req: MoveRequest):
    p = queue_col.find_one({"token": req.token})
    if not p: return {"message": "Not found"}
    curr = p["order_index"]
    target = queue_col.find_one({"order_index": {"$lt": curr}}, sort=[("order_index", -1)]) if req.direction == "up" else queue_col.find_one({"order_index": {"$gt": curr}}, sort=[("order_index", 1)])
    if target:
        queue_col.update_one({"_id": p["_id"]}, {"$set": {"order_index": target["order_index"]}})
        queue_col.update_one({"_id": target["_id"]}, {"$set": {"order_index": curr}})
    return {"message": "Moved"}

@app.post("/queue/edit")
def edit_customer(req: EditRequest):
    dur = sum(MENU.get(s, 0) for s in req.services)
    queue_col.update_one({"token": req.token}, {"$set": {"services": req.services, "total_duration": dur}})
    return {"message": "Edited"}

@app.post("/queue/delete")
def delete_customer(req: ActionRequest):
    queue_col.delete_one({"token": req.token})
    return {"message": "Deleted"}

@app.post("/queue/reset")
def reset():
    queue_col.delete_many({})
    history_col.delete_many({})
    set_service_start_time(None)
    return {"message": "Reset"}

@app.post("/queue/serve-now")
def serve_now(req: ActionRequest):
    first = queue_col.find_one(sort=[("order_index", 1)])
    lowest = first["order_index"] if first else 1
    queue_col.update_one({"token": req.token}, {"$set": {"order_index": lowest - 1}})
    return {"message": "Front"}
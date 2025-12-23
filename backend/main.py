import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from pymongo import MongoClient
from passlib.context import CryptContext

app = FastAPI()

# --- 1. CONFIGURATION ---
# We allow Localhost (You) AND the Public Web (Vercel) to talk to this backend
origins = [
    "http://localhost:3000",       # Your Local Frontend
    "http://127.0.0.1:3000",       # Your Local IP
    "https://test.slotsync.in",    # Your Vercel Domain
    "*"                            # Allow all (easiest for debugging)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    users_col = db["users"]
    admins_col = db["admins"]
    config_col = db["config"]
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

# --- ROUTES ---

@app.get("/queue/status")
def get_status(salon_id: str):
    queue_list = list(queue_col.find({"salon_id": salon_id}).sort("order_index", 1))
    
    start_time = get_service_start_time(salon_id)
    time_served_so_far = 0
    if queue_list and start_time:
        delta = datetime.now() - start_time
        time_served_so_far = max(0, delta.total_seconds())
    
    cumulative_wait = 0
    
    for index, person in enumerate(queue_list):
        person.pop("_id", None)
        person_duration_sec = person['total_duration'] * 60
        
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

# --- QUEUE ACTIONS ---

@app.post("/queue/join")
def join_queue(req: JoinRequest):
    if queue_col.count_documents({"salon_id": req.salon_id}) == 0: 
        set_service_start_time(req.salon_id, datetime.now())
    
    last_q = queue_col.find_one(sort=[("token", -1)])
    t1 = last_q["token"] if last_q else 99
    new_token = t1 + 1
    
    last_item = queue_col.find_one({"salon_id": req.salon_id}, sort=[("order_index", -1)])
    new_order = (last_item["order_index"] + 1) if last_item else 1
    
    dur = sum(MENU.get(s, 0) for s in list(set(req.services)))
    
    queue_col.insert_one({
        "token": new_token, 
        "salon_id": req.salon_id,
        "name": req.name, "phone": req.phone, 
        "services": list(set(req.services)), "total_duration": dur, 
        "order_index": new_order, "joined_at_str": datetime.now().strftime("%I:%M %p")
    })
    return {"message": "Joined", "token": new_token}

@app.post("/queue/add-service")
def add_service(req: AddServiceRequest):
    user = queue_col.find_one({"token": req.token})
    if not user: raise HTTPException(404, "User not found")
    
    updated_services = list(set(user['services'] + req.new_services))
    new_duration = sum(MENU.get(s, 0) for s in updated_services)
    
    queue_col.update_one(
        {"token": req.token}, 
        {"$set": {"services": updated_services, "total_duration": new_duration}}
    )
    return {"message": "Services updated"}

@app.post("/queue/cancel")
def cancel_booking(req: ActionRequest):
    user = queue_col.find_one({"token": req.token})
    if not user: return {"message": "Not found"}
    salon_id = user.get("salon_id", "salon_101")

    first_person = queue_col.find_one({"salon_id": salon_id}, sort=[("order_index", 1)])
    if first_person and first_person["token"] == req.token:
        set_service_start_time(salon_id, datetime.now()) 

    queue_col.delete_one({"token": req.token})
    if queue_col.count_documents({"salon_id": salon_id}) == 0: 
        set_service_start_time(salon_id, None)
    return {"message": "Cancelled"}

@app.post("/queue/next")
def next_customer(req: ActionRequest = None): 
    # Try to find salon from request, or find ANY active salon
    if req and req.salon_id:
        salon_id = req.salon_id
    else:
        any_user = queue_col.find_one()
        if not any_user: return {"message": "Empty"}
        salon_id = any_user["salon_id"]

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
    if req.direction == "up":
        target = queue_col.find_one({"salon_id": salon_id, "order_index": {"$lt": curr}}, sort=[("order_index", -1)])
    else:
        target = queue_col.find_one({"salon_id": salon_id, "order_index": {"$gt": curr}}, sort=[("order_index", 1)])
    
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
def reset(req: ActionRequest = None):
    queue_col.delete_many({})
    config_col.delete_many({})
    return {"message": "Reset"}

@app.post("/queue/serve-now")
def serve_now(req: ActionRequest):
    p = queue_col.find_one({"token": req.token})
    if not p: return {"message": "Not found"}
    salon_id = p.get("salon_id")
    
    first = queue_col.find_one({"salon_id": salon_id}, sort=[("order_index", 1)])
    lowest = first["order_index"] if first else 1
    queue_col.update_one({"token": req.token}, {"$set": {"order_index": lowest - 1}})
    return {"message": "Front"}

# ... (keep existing imports)

# 👇 NEW: Add this Route to GET all salons
@app.get("/salons")
def get_salons():
    # Fetch all salons from DB, hide the internal Mongo ID
    salons = list(db["salons"].find({}, {"_id": 0}))
    return salons

# 👇 NEW: Run this ONCE to fill your empty database
# 👇 CHANGE THIS LINE from @app.post to @app.get
@app.get("/salons/seed") 
def seed_salons():
    if db["salons"].count_documents({}) > 0:
        return {"message": "Database already has salons!"}
    
    mock_data = [
        { "id": "salon_101", "name": "Cool Cuts Mumbai", "location": "Bandra West, Mumbai", "wait_time": 15, "status": "Open", "image": "💈" },
        { "id": "salon_102", "name": "Delhi Style Studio", "location": "Connaught Place, Delhi", "wait_time": 45, "status": "Busy", "image": "✂️" },
        { "id": "salon_103", "name": "Bangalore Buzz", "location": "Indiranagar, Bangalore", "wait_time": 5, "status": "Open", "image": "💇‍♂️" },
    ]
    db["salons"].insert_many(mock_data)
    return {"message": "Success! Added 3 salons."}
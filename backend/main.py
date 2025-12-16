from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for your Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class Customer(BaseModel):
    id: int
    name: str
    phone_number: str
    joined_at: datetime
    status: str = "waiting" # waiting, completed

class CustomerInput(BaseModel):
    name: str
    phone_number: str

# --- IN-MEMORY STORAGE ---
db: List[Customer] = []
history_db: List[Customer] = [] # <--- NEW: Stores completed customers
id_counter = 1

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "MySpotNow Backend is Running!"}

# 1. Get Current Queue
@app.get("/queue")
def get_queue():
    return db

# 2. Get History (NEW)
@app.get("/history")
def get_history():
    return history_db

# 3. Add Customer
@app.post("/add")
def add_customer(customer: CustomerInput):
    global id_counter
    new_customer = Customer(
        id=id_counter,
        name=customer.name,
        phone_number=customer.phone_number,
        joined_at=datetime.now(),
        status="waiting"
    )
    db.append(new_customer)
    id_counter += 1
    return new_customer

# 4. Remove/Complete Customer (UPDATED)
@app.delete("/remove/{customer_id}")
def remove_customer(customer_id: int):
    # Find the customer
    for index, customer in enumerate(db):
        if customer.id == customer_id:
            # Move to history instead of just deleting
            completed_customer = db.pop(index)
            completed_customer.status = "completed"
            history_db.append(completed_customer) # <--- Save to history
            return {"message": "Customer moved to history"}
    
    raise HTTPException(status_code=404, detail="Customer not found")
import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database as db
import seed_data

# Ensure DB is initialized
db.init_db()
seed_data.seed()

app = FastAPI(title="Guruji Supermart - Fortune Residency")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Pydantic Request Models
class OrderItemModel(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    unit: Optional[str] = "1 unit"
    price: float
    quantity: int = Field(gt=0)

class CreateOrderRequest(BaseModel):
    customer_name: str
    phone_number: str
    society_name: str
    tower: str
    flat_no: str
    items: List[OrderItemModel]
    payment_method: Optional[str] = "COD"
    notes: Optional[str] = ""
    coupon_code: Optional[str] = ""

class CouponValidateRequest(BaseModel):
    code: str
    cart_total: float

class CouponCreateModel(BaseModel):
    code: str
    title: str
    description: Optional[str] = ""
    discount_type: str = "FLAT" # FLAT or PERCENT
    discount_val: float
    min_order_amount: Optional[float] = 0.0
    max_discount: Optional[float] = 0.0
    terms: Optional[str] = ""
    is_active: Optional[int] = 1
    expiry_date: Optional[str] = ""

class DeliveryTierModel(BaseModel):
    min_cart: float
    max_cart: float
    fee: float
    label: Optional[str] = ""

class ProductCreateModel(BaseModel):
    name: str
    category: str
    unit: str
    price: float
    mrp: float
    image_url: Optional[str] = ""
    is_available: Optional[int] = 1
    stock_quantity: Optional[int] = 50
    featured: Optional[int] = 0

class ProductUpdateModel(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    image_url: Optional[str] = None
    is_available: Optional[int] = None
    stock_quantity: Optional[int] = None
    featured: Optional[int] = None

class StatusUpdateRequest(BaseModel):
    status: str

class PinVerifyRequest(BaseModel):
    pin: str

class SettingUpdateRequest(BaseModel):
    key: str
    value: str

class BulkAddRequest(BaseModel):
    bucket_key: Optional[str] = None
    raw_text: Optional[str] = None

# HTML Page Routes
@app.get("/", response_class=HTMLResponse)
async def serve_storefront():
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/admin", response_class=HTMLResponse)
async def serve_admin():
    admin_path = os.path.join(TEMPLATES_DIR, "admin.html")
    with open(admin_path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/track", response_class=HTMLResponse)
async def serve_track():
    track_path = os.path.join(TEMPLATES_DIR, "track.html")
    with open(track_path, "r", encoding="utf-8") as f:
        return f.read()

# Public APIs
@app.get("/api/settings")
async def get_settings():
    settings = db.get_settings()
    settings.pop("admin_pin", None)
    return settings

@app.get("/api/societies")
async def get_societies():
    return db.get_societies(active_only=True)

@app.get("/api/categories")
async def get_categories():
    conn = db.get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM products 
        WHERE is_available = 1 
        GROUP BY category 
        ORDER BY count DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [{"category": r["category"], "count": r["count"]} for r in rows]

@app.get("/api/products")
async def list_products(
    category: Optional[str] = None, 
    search: Optional[str] = None,
    available_only: bool = False
):
    return db.get_all_products(category=category, search=search, available_only=available_only)

@app.get("/api/products/{product_id}")
async def get_product_detail(product_id: int):
    prod = db.get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@app.get("/api/coupons")
async def list_active_coupons():
    return db.get_all_coupons(active_only=True)

@app.post("/api/coupons/validate")
async def validate_coupon_code(payload: CouponValidateRequest):
    return db.validate_coupon(payload.code, payload.cart_total)

@app.get("/api/delivery-fee")
async def get_delivery_fee(cart_total: float = Query(0.0)):
    return db.calculate_delivery_fee(cart_total)

@app.post("/api/orders")
async def place_order(order_req: CreateOrderRequest):
    if not order_req.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required")
    if not order_req.phone_number.strip() or len(order_req.phone_number.strip()) < 10:
        raise HTTPException(status_code=400, detail="A valid 10-digit mobile number is required")
    if not order_req.society_name.strip():
        raise HTTPException(status_code=400, detail="Society name is required")
    if not order_req.tower.strip():
        raise HTTPException(status_code=400, detail="Tower / Block is required")
    if not order_req.flat_no.strip():
        raise HTTPException(status_code=400, detail="Flat No. is required")
    if not order_req.items:
        raise HTTPException(status_code=400, detail="Cart cannot be empty")

    settings = db.get_settings()
    if settings.get("store_open", "1") != "1":
        raise HTTPException(status_code=400, detail="Store is currently closed and not accepting new orders")

    items_data = [item.dict() for item in order_req.items]
    order_id = db.create_order(
        customer_name=order_req.customer_name,
        phone_number=order_req.phone_number,
        society_name=order_req.society_name,
        tower=order_req.tower,
        flat_no=order_req.flat_no,
        items=items_data,
        payment_method=order_req.payment_method or "COD",
        notes=order_req.notes or "",
        coupon_code=order_req.coupon_code or ""
    )

    full_order = db.get_order(order_id)
    
    # Broadcast to admin dispatch feed!
    await manager.broadcast({
        "event": "new_order",
        "order": full_order
    })

    return {
        "success": True,
        "order_id": order_id,
        "order": full_order,
        "message": f"Order {order_id} placed successfully! Fast delivery to Flat {order_req.flat_no}, {order_req.tower}, {order_req.society_name}."
    }

@app.get("/api/orders/{order_id}")
async def get_order_tracking(order_id: str):
    order = db.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.get("/api/orders/by-phone/{phone_number}")
async def get_orders_by_phone(phone_number: str):
    clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
    conn = db.get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM orders 
        WHERE REPLACE(REPLACE(phone_number, ' ', ''), '-', '') LIKE ? 
        ORDER BY created_at DESC LIMIT 10
    """, (f"%{clean_phone[-10:]}%",))
    rows = cursor.fetchall()
    orders = [dict(r) for r in rows]
    for o in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (o['id'],))
        o['items'] = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return orders

# Admin APIs
@app.post("/api/admin/verify-pin")
async def verify_admin_pin(payload: PinVerifyRequest):
    settings = db.get_settings()
    stored_pin = settings.get("admin_pin", "2607")
    if payload.pin.strip() == stored_pin:
        return {"success": True, "token": "admin-session-ok"}
    raise HTTPException(status_code=401, detail="Invalid Admin PIN")

@app.get("/api/admin/stats")
async def get_admin_stats():
    return db.get_store_stats()

@app.get("/api/admin/orders")
async def list_admin_orders(status: Optional[str] = "ALL", limit: int = 100):
    return db.get_all_orders(status=status, limit=limit)

@app.post("/api/admin/orders/{order_id}/status")
async def set_order_status(order_id: str, payload: StatusUpdateRequest):
    valid_statuses = ["RECEIVED", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status")
    
    db.update_order_status(order_id, payload.status)
    updated_order = db.get_order(order_id)

    await manager.broadcast({
        "event": "order_status_updated",
        "order_id": order_id,
        "new_status": payload.status,
        "order": updated_order
    })

    return {"success": True, "order": updated_order}

@app.post("/api/admin/products")
async def create_new_product(payload: ProductCreateModel):
    new_id = db.add_product(payload.dict())
    return {"success": True, "product_id": new_id, "product": db.get_product(new_id)}

@app.put("/api/admin/products/{product_id}")
async def update_existing_product(product_id: int, payload: ProductUpdateModel):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    db.update_product(product_id, update_data)
    return {"success": True, "product": db.get_product(product_id)}

@app.delete("/api/admin/products/{product_id}")
async def delete_existing_product(product_id: int):
    db.delete_product(product_id)
    return {"success": True, "message": "Product removed"}

@app.post("/api/admin/products/{product_id}/toggle-stock")
async def toggle_product_stock_status(product_id: int):
    new_status = db.toggle_product_stock(product_id)
    return {"success": True, "is_available": new_status}

# Admin Coupons Management
@app.get("/api/admin/coupons")
async def admin_get_coupons():
    return db.get_all_coupons(active_only=False)

@app.post("/api/admin/coupons")
async def admin_create_coupon(payload: CouponCreateModel):
    ok = db.add_coupon(payload.dict())
    if not ok:
        raise HTTPException(status_code=400, detail="Coupon code already exists or invalid")
    return {"success": True, "code": payload.code.upper()}

@app.delete("/api/admin/coupons/{coupon_id}")
async def admin_delete_coupon(coupon_id: int):
    db.delete_coupon(coupon_id)
    return {"success": True, "message": "Coupon deleted"}

@app.post("/api/admin/coupons/{coupon_id}/toggle")
async def admin_toggle_coupon(coupon_id: int):
    db.toggle_coupon_status(coupon_id)
    return {"success": True}

# Admin Delivery Tiers Management
@app.get("/api/admin/delivery-tiers")
async def admin_get_delivery_tiers():
    return db.get_delivery_tiers()

@app.post("/api/admin/delivery-tiers")
async def admin_set_delivery_tiers(tiers: List[DeliveryTierModel]):
    db.set_delivery_tiers([t.dict() for t in tiers])
    return {"success": True, "tiers": db.get_delivery_tiers()}

# Admin Buckets
@app.get("/api/admin/buckets")
async def get_bucket_presets():
    return seed_data.BUCKET_PRESETS

@app.post("/api/admin/buckets/load")
async def load_bucket(payload: BulkAddRequest):
    added_count = 0
    if payload.bucket_key and payload.bucket_key in seed_data.BUCKET_PRESETS:
        bucket = seed_data.BUCKET_PRESETS[payload.bucket_key]
        for item in bucket["items"]:
            item_data = dict(item)
            if "image_url" not in item_data:
                item_data["image_url"] = ""
            if "is_available" not in item_data:
                item_data["is_available"] = 1
            if "featured" not in item_data:
                item_data["featured"] = 0
            db.add_product(item_data)
            added_count += 1
        return {"success": True, "message": f"Added {added_count} items from '{bucket['title']}'!"}

    if payload.raw_text:
        lines = payload.raw_text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                name = parts[0]
                unit = parts[1]
                try:
                    price = float(parts[2])
                except ValueError:
                    continue
                mrp = float(parts[3]) if len(parts) >= 4 and parts[3] else price
                cat = parts[4] if len(parts) >= 5 and parts[4] else "Daily Staples & Atta"
                
                db.add_product({
                    "name": name,
                    "unit": unit,
                    "price": price,
                    "mrp": mrp,
                    "category": cat,
                    "stock_quantity": 50,
                    "is_available": 1
                })
                added_count += 1
        return {"success": True, "message": f"Successfully added {added_count} items in bulk!"}

    raise HTTPException(status_code=400, detail="Provide either bucket_key or raw_text")

@app.post("/api/admin/settings")
async def update_store_setting(payload: SettingUpdateRequest):
    db.update_setting(payload.key, payload.value)
    return {"success": True, "key": payload.key, "value": payload.value}

@app.get("/api/admin/societies")
async def admin_get_societies():
    return db.get_societies(active_only=False)

@app.post("/api/admin/societies")
async def add_new_society(name: str = Query(...), delivery_mins: int = Query(8)):
    ok = db.add_society(name, delivery_mins)
    if not ok:
        raise HTTPException(status_code=400, detail="Society already exists or invalid")
    return {"success": True, "name": name}

@app.delete("/api/admin/societies/{society_id}")
async def remove_society(society_id: int):
    db.delete_society(society_id)
    return {"success": True}

# WebSocket Endpoint
@app.websocket("/ws/orders")
async def websocket_orders_feed(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

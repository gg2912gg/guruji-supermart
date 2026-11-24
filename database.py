import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "store.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        mrp REAL NOT NULL,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 50,
        featured INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Societies Table (Fortune Residency only initially, merchant can add more)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS societies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 1,
        estimated_delivery_mins INTEGER DEFAULT 8
    );
    """)

    # 3. Store Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # 4. Delivery Tiers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS delivery_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        min_cart REAL NOT NULL,
        max_cart REAL NOT NULL,
        fee REAL NOT NULL,
        label TEXT
    );
    """)

    # 5. Coupons Table (with terms and conditions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        discount_type TEXT NOT NULL, -- 'FLAT' or 'PERCENT'
        discount_val REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        max_discount REAL DEFAULT 0,
        terms TEXT,
        is_active INTEGER DEFAULT 1,
        expiry_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. Orders Table (with coupon and delivery fee tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        society_name TEXT NOT NULL,
        tower TEXT NOT NULL,
        flat_no TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0.0,
        delivery_fee REAL DEFAULT 0.0,
        coupon_code TEXT DEFAULT '',
        discount_amount REAL DEFAULT 0.0,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'COD',
        payment_status TEXT DEFAULT 'PENDING',
        order_status TEXT DEFAULT 'RECEIVED',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. Order Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()

# Product Operations
def get_all_products(category: Optional[str] = None, search: Optional[str] = None, available_only: bool = False):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    
    if available_only:
        query += " AND is_available = 1"
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (name LIKE ? OR category LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])
        
    query += " ORDER BY featured DESC, category ASC, name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_product(data: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO products (name, category, unit, price, mrp, image_url, is_available, stock_quantity, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data['name'],
        data.get('category', 'Daily Staples & Atta'),
        data.get('unit', '1 unit'),
        float(data['price']),
        float(data.get('mrp', data['price'])),
        data.get('image_url', ''),
        int(data.get('is_available', 1)),
        int(data.get('stock_quantity', 50)),
        int(data.get('featured', 0))
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_product(product_id: int, data: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    values = []
    for k, v in data.items():
        if k in ['name', 'category', 'unit', 'price', 'mrp', 'image_url', 'is_available', 'stock_quantity', 'featured']:
            fields.append(f"{k} = ?")
            values.append(v)
    if not fields:
        conn.close()
        return False
    values.append(product_id)
    query = f"UPDATE products SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()
    return True

def delete_product(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return True

def toggle_product_stock(product_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE products SET is_available = CASE WHEN is_available = 1 THEN 0 ELSE 1 END WHERE id = ?", (product_id,))
    cursor.execute("SELECT is_available FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row['is_available'] if row else None

# Delivery Tiers Operations
def get_delivery_tiers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM delivery_tiers ORDER BY min_cart ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def calculate_delivery_fee(cart_total: float) -> Dict[str, Any]:
    tiers = get_delivery_tiers()
    if not tiers:
        return {"fee": 0.0, "label": "Free Delivery", "free_threshold": 0.0, "amount_needed_for_free": 0.0}
    
    fee = 0.0
    matched_label = "Standard Delivery"
    free_threshold = None
    
    for t in tiers:
        if t['fee'] == 0.0 and (free_threshold is None or t['min_cart'] < free_threshold):
            free_threshold = t['min_cart']
        if t['min_cart'] <= cart_total <= t['max_cart']:
            fee = t['fee']
            matched_label = t.get('label') or ("Free Delivery" if fee == 0 else f"₹{fee} Delivery Fee")
            
    amount_needed = max(0.0, (free_threshold - cart_total)) if free_threshold is not None else 0.0
    return {
        "fee": fee,
        "label": matched_label,
        "free_threshold": free_threshold or 0.0,
        "amount_needed_for_free": round(amount_needed, 2)
    }

def set_delivery_tiers(tiers: List[Dict[str, Any]]):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM delivery_tiers")
    for t in tiers:
        cursor.execute("""
            INSERT INTO delivery_tiers (min_cart, max_cart, fee, label)
            VALUES (?, ?, ?, ?)
        """, (float(t['min_cart']), float(t['max_cart']), float(t['fee']), t.get('label', '')))
    conn.commit()
    conn.close()
    return True

# Coupons Operations
def get_all_coupons(active_only: bool = False):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM coupons"
    if active_only:
        query += " WHERE is_active = 1"
    query += " ORDER BY min_order_amount ASC"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_coupon(data: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    code = data['code'].strip().upper()
    try:
        cursor.execute("""
            INSERT INTO coupons (code, title, description, discount_type, discount_val, min_order_amount, max_discount, terms, is_active, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            code,
            data.get('title', f"Discount {code}"),
            data.get('description', ''),
            data.get('discount_type', 'FLAT'),
            float(data.get('discount_val', 0)),
            float(data.get('min_order_amount', 0)),
            float(data.get('max_discount', 0)),
            data.get('terms', ''),
            int(data.get('is_active', 1)),
            data.get('expiry_date', '')
        ))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

def delete_coupon(coupon_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM coupons WHERE id = ?", (coupon_id,))
    conn.commit()
    conn.close()
    return True

def toggle_coupon_status(coupon_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE coupons SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?", (coupon_id,))
    conn.commit()
    conn.close()
    return True

def validate_coupon(code: str, cart_total: float) -> Dict[str, Any]:
    code = code.strip().upper()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM coupons WHERE code = ? AND is_active = 1", (code,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"valid": False, "discount": 0.0, "message": "Invalid or inactive coupon code"}

    coupon = dict(row)
    min_order = float(coupon['min_order_amount'])
    if cart_total < min_order:
        needed = round(min_order - cart_total, 2)
        return {
            "valid": False,
            "discount": 0.0,
            "message": f"Coupon requires a minimum order of ₹{min_order}. Add ₹{needed} more to your cart!",
            "coupon": coupon
        }

    # Calculate discount
    discount = 0.0
    if coupon['discount_type'] == 'FLAT':
        discount = float(coupon['discount_val'])
    elif coupon['discount_type'] == 'PERCENT':
        discount = (float(coupon['discount_val']) / 100.0) * cart_total
        if coupon['max_discount'] > 0:
            discount = min(discount, float(coupon['max_discount']))

    # Cannot discount more than cart total
    discount = min(discount, cart_total)
    discount = round(discount, 2)

    return {
        "valid": True,
        "discount": discount,
        "message": f"🎉 Coupon {coupon['code']} applied! You saved ₹{discount}.",
        "coupon": coupon
    }

# Order Operations
def create_order(customer_name: str, phone_number: str, society_name: str, tower: str, flat_no: str, 
                 items: List[Dict[str, Any]], payment_method: str = "COD", notes: str = "",
                 coupon_code: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    
    date_str = datetime.now().strftime("%y%m%d")
    cursor.execute("SELECT COUNT(*) as count FROM orders WHERE id LIKE ?", (f"GSM-{date_str}-%",))
    count = cursor.fetchone()['count'] + 1
    order_id = f"GSM-{date_str}-{count:03d}"
    
    subtotal = 0.0
    for item in items:
        subtotal += float(item['price']) * int(item['quantity'])

    # Delivery fee tier calculation
    tier_info = calculate_delivery_fee(subtotal)
    delivery_fee = tier_info['fee']

    # Coupon validation
    discount_amount = 0.0
    applied_coupon = ""
    if coupon_code.strip():
        val_result = validate_coupon(coupon_code.strip(), subtotal)
        if val_result['valid']:
            discount_amount = val_result['discount']
            applied_coupon = coupon_code.strip().upper()

    total_amount = max(0.0, (subtotal + delivery_fee - discount_amount))
    total_amount = round(total_amount, 2)
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO orders (id, customer_name, phone_number, society_name, tower, flat_no, 
                            subtotal, delivery_fee, coupon_code, discount_amount, total_amount, 
                            payment_method, payment_status, order_status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'RECEIVED', ?, ?, ?)
    """, (
        order_id, customer_name.strip(), phone_number.strip(), society_name.strip(), 
        tower.strip(), flat_no.strip(), subtotal, delivery_fee, applied_coupon, discount_amount, total_amount, 
        payment_method, notes, now_str, now_str
    ))
    
    for item in items:
        line_total = float(item['price']) * int(item['quantity'])
        cursor.execute("""
            INSERT INTO order_items (order_id, product_id, product_name, unit, price, quantity, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, item.get('product_id', 0), item['product_name'], 
            item.get('unit', ''), float(item['price']), int(item['quantity']), line_total
        ))
        
        # Decrement stock
        if item.get('product_id'):
            cursor.execute("""
                UPDATE products 
                SET stock_quantity = MAX(0, stock_quantity - ?) 
                WHERE id = ?
            """, (int(item['quantity']), item['product_id']))
            
    conn.commit()
    conn.close()
    return order_id

def get_order(order_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order_row = cursor.fetchone()
    if not order_row:
        conn.close()
        return None
    order = dict(order_row)
    
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    order['items'] = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return order

def get_all_orders(status: Optional[str] = None, limit: int = 100):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM orders WHERE 1=1"
    params = []
    if status and status != "ALL":
        query += " AND order_status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    orders = [dict(r) for r in cursor.fetchall()]
    
    for o in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (o['id'],))
        o['items'] = [dict(r) for r in cursor.fetchall()]
        
    conn.close()
    return orders

def update_order_status(order_id: str, new_status: str):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE orders 
        SET order_status = ?, updated_at = ? 
        WHERE id = ?
    """, (new_status, now_str, order_id))
    conn.commit()
    conn.close()
    return True

# Societies (Fortune Residency only as base)
def get_societies(active_only: bool = True):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM societies"
    if active_only:
        query += " WHERE is_active = 1"
    query += " ORDER BY name ASC"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_society(name: str, delivery_mins: int = 8):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO societies (name, estimated_delivery_mins) VALUES (?, ?)", (name.strip(), delivery_mins))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    conn.close()
    return success

def delete_society(society_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM societies WHERE id = ?", (society_id,))
    conn.commit()
    conn.close()
    return True

# Settings
def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM store_settings")
    rows = cursor.fetchall()
    conn.close()
    return {r['key']: r['value'] for r in rows}

def update_setting(key: str, value: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO store_settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, str(value)))
    conn.commit()
    conn.close()
    return True

# Analytics / Stats
def get_store_stats():
    conn = get_db()
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales FROM orders WHERE created_at LIKE ?", (f"{today_str}%",))
    today_data = cursor.fetchone()
    
    cursor.execute("SELECT COUNT(*) as pending_orders FROM orders WHERE order_status IN ('RECEIVED', 'PACKING', 'OUT_FOR_DELIVERY')")
    pending = cursor.fetchone()['pending_orders']
    
    cursor.execute("SELECT COUNT(*) as total_products, SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as in_stock_products FROM products")
    prod_data = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) as active_coupons FROM coupons WHERE is_active = 1")
    coupons_count = cursor.fetchone()['active_coupons']
    
    conn.close()
    return {
        "today_orders": today_data['total_orders'],
        "today_sales": round(today_data['total_sales'], 2),
        "pending_orders": pending,
        "total_products": prod_data['total_products'] or 0,
        "in_stock_products": prod_data['in_stock_products'] or 0,
        "active_coupons": coupons_count
    }

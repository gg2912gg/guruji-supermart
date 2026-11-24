from database import (
    init_db, get_db, add_product, add_society, update_setting, 
    set_delivery_tiers, add_coupon
)

# Fortune Residency ONLY as requested by the vendor
INITIAL_SOCIETIES = [
    ("Fortune Residency", 8),
]

DEFAULT_DELIVERY_TIERS = [
    {"min_cart": 0, "max_cart": 99, "fee": 15.0, "label": "₹15 Delivery Fee (Small Cart)"},
    {"min_cart": 100, "max_cart": 199, "fee": 10.0, "label": "₹10 Delivery Fee"},
    {"min_cart": 200, "max_cart": 999999, "fee": 0.0, "label": "FREE Delivery (Above ₹200)"}
]

DEFAULT_COUPONS = [
    {
        "code": "GURUJI20",
        "title": "Flat ₹20 OFF",
        "description": "Save ₹20 on daily essentials",
        "discount_type": "FLAT",
        "discount_val": 20.0,
        "min_order_amount": 99.0,
        "max_discount": 20.0,
        "terms": "Valid on minimum cart value of ₹99. Exclusive to Fortune Residency residents.",
        "is_active": 1,
        "expiry_date": "2027-12-31"
    },
    {
        "code": "WELCOME50",
        "title": "Flat ₹50 OFF",
        "description": "Special Fortune Residency welcome discount",
        "discount_type": "FLAT",
        "discount_val": 50.0,
        "min_order_amount": 249.0,
        "max_discount": 50.0,
        "terms": "Valid on orders above ₹249. Flat-to-flat delivery to Fortune Residency.",
        "is_active": 1,
        "expiry_date": "2027-12-31"
    },
    {
        "code": "SUPER10",
        "title": "10% Super Discount",
        "description": "10% off up to ₹30 on orders above ₹149",
        "discount_type": "PERCENT",
        "discount_val": 10.0,
        "min_order_amount": 149.0,
        "max_discount": 30.0,
        "terms": "10% discount capped at ₹30 maximum savings. Minimum order ₹149.",
        "is_active": 1,
        "expiry_date": "2027-12-31"
    }
]

INITIAL_PRODUCTS = [
    # Dairy, Bread & Eggs
    {
        "name": "Amul Taaza Homogenised Toned Milk",
        "category": "Dairy, Bread & Eggs",
        "unit": "500 ml pouch",
        "price": 27.0,
        "mrp": 27.0,
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 40,
        "featured": 1
    },
    {
        "name": "Amul Gold Full Cream Fresh Milk",
        "category": "Dairy, Bread & Eggs",
        "unit": "500 ml pouch",
        "price": 33.0,
        "mrp": 33.0,
        "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 50,
        "featured": 1
    },
    {
        "name": "Mother Dairy Ultimate Dahi (Curd)",
        "category": "Dairy, Bread & Eggs",
        "unit": "400 g cup",
        "price": 35.0,
        "mrp": 35.0,
        "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },
    {
        "name": "Amul Fresh Malai Paneer",
        "category": "Dairy, Bread & Eggs",
        "unit": "200 g pack",
        "price": 90.0,
        "mrp": 95.0,
        "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 1
    },
    {
        "name": "Amul Pasteurised Salted Butter",
        "category": "Dairy, Bread & Eggs",
        "unit": "100 g pack",
        "price": 58.0,
        "mrp": 60.0,
        "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 0
    },
    {
        "name": "Harvest Gold White Bread",
        "category": "Dairy, Bread & Eggs",
        "unit": "400 g loaf",
        "price": 30.0,
        "mrp": 30.0,
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 1
    },
    {
        "name": "Britannia 100% Whole Wheat Brown Bread",
        "category": "Dairy, Bread & Eggs",
        "unit": "400 g loaf",
        "price": 45.0,
        "mrp": 50.0,
        "image_url": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 15,
        "featured": 0
    },
    {
        "name": "Fresh Farm White Eggs (Tray)",
        "category": "Dairy, Bread & Eggs",
        "unit": "6 pcs pack",
        "price": 45.0,
        "mrp": 50.0,
        "image_url": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 1
    },

    # Daily Staples & Atta
    {
        "name": "Aashirvaad Shudh Chakki Atta (100% Whole Wheat)",
        "category": "Daily Staples & Atta",
        "unit": "5 kg bag",
        "price": 245.0,
        "mrp": 265.0,
        "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },
    {
        "name": "Fortune Sunlite Refined Sunflower Oil",
        "category": "Daily Staples & Atta",
        "unit": "1 Litre pouch",
        "price": 145.0,
        "mrp": 160.0,
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 1
    },
    {
        "name": "Fortune Premium Kachi Ghani Mustard Oil",
        "category": "Daily Staples & Atta",
        "unit": "1 Litre bottle",
        "price": 155.0,
        "mrp": 170.0,
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 0
    },
    {
        "name": "Tata Salt Vacuum Evaporated Iodised Salt",
        "category": "Daily Staples & Atta",
        "unit": "1 kg pack",
        "price": 28.0,
        "mrp": 30.0,
        "image_url": "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 50,
        "featured": 1
    },
    {
        "name": "Madhur Pure & Hygienic Sugar",
        "category": "Daily Staples & Atta",
        "unit": "1 kg pack",
        "price": 48.0,
        "mrp": 52.0,
        "image_url": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 0
    },
    {
        "name": "India Gate Feast Rozzana Basmati Rice",
        "category": "Daily Staples & Atta",
        "unit": "1 kg pack",
        "price": 95.0,
        "mrp": 115.0,
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 1
    },
    {
        "name": "Tata Sampann Unpolished Toor / Arhar Dal",
        "category": "Daily Staples & Atta",
        "unit": "1 kg pack",
        "price": 170.0,
        "mrp": 190.0,
        "image_url": "https://images.unsplash.com/photo-1585994192701-f1a505c817ea?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 0
    },

    # Biscuits & Munchies
    {
        "name": "Maggi 2-Minute Masala Instant Noodles",
        "category": "Biscuits & Munchies",
        "unit": "4-in-1 pack (280g)",
        "price": 56.0,
        "mrp": 60.0,
        "image_url": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 40,
        "featured": 1
    },
    {
        "name": "Lay's India's Magic Masala Potato Chips",
        "category": "Biscuits & Munchies",
        "unit": "50 g pack",
        "price": 20.0,
        "mrp": 20.0,
        "image_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 1
    },
    {
        "name": "Kurkure Masala Munch Namkeen",
        "category": "Biscuits & Munchies",
        "unit": "75 g pack",
        "price": 20.0,
        "mrp": 20.0,
        "image_url": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 0
    },
    {
        "name": "Parle-G Original Gluco Biscuits",
        "category": "Biscuits & Munchies",
        "unit": "250 g family pack",
        "price": 25.0,
        "mrp": 25.0,
        "image_url": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 40,
        "featured": 1
    },
    {
        "name": "Britannia Good Day Cashew Cookies",
        "category": "Biscuits & Munchies",
        "unit": "200 g pack",
        "price": 40.0,
        "mrp": 45.0,
        "image_url": "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 0
    },
    {
        "name": "Haldiram's Nagpur Aloo Bhujia",
        "category": "Biscuits & Munchies",
        "unit": "200 g pack",
        "price": 55.0,
        "mrp": 60.0,
        "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },

    # Cold Drinks & Beverages
    {
        "name": "Thums Up Soft Drink Bottle",
        "category": "Cold Drinks & Instant Mix",
        "unit": "750 ml bottle",
        "price": 40.0,
        "mrp": 40.0,
        "image_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },
    {
        "name": "Sprite Lime Soft Drink Bottle",
        "category": "Cold Drinks & Instant Mix",
        "unit": "750 ml bottle",
        "price": 40.0,
        "mrp": 40.0,
        "image_url": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 0
    },
    {
        "name": "Bisleri Packaged Drinking Water",
        "category": "Cold Drinks & Instant Mix",
        "unit": "1 Litre bottle",
        "price": 20.0,
        "mrp": 20.0,
        "image_url": "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 60,
        "featured": 1
    },
    {
        "name": "Tata Tea Gold Leaf & Dust Blend",
        "category": "Cold Drinks & Instant Mix",
        "unit": "250 g carton",
        "price": 140.0,
        "mrp": 155.0,
        "image_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 1
    },

    # Cleaning & Household
    {
        "name": "Vim Dishwash Bar with Lemon Fragrance",
        "category": "Cleaning & Household",
        "unit": "200 g bar (Pack of 3)",
        "price": 35.0,
        "mrp": 40.0,
        "image_url": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 1
    },
    {
        "name": "Surf Excel Easy Wash Detergent Powder",
        "category": "Cleaning & Household",
        "unit": "1 kg bag",
        "price": 140.0,
        "mrp": 150.0,
        "image_url": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },
    {
        "name": "Harpic Power Plus Original Toilet Cleaner",
        "category": "Cleaning & Household",
        "unit": "500 ml bottle",
        "price": 99.0,
        "mrp": 105.0,
        "image_url": "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 20,
        "featured": 0
    },
    {
        "name": "Oxo-Biodegradable Garbage Bags (Medium)",
        "category": "Cleaning & Household",
        "unit": "Roll of 30 bags",
        "price": 85.0,
        "mrp": 100.0,
        "image_url": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },

    # Pooja Needs & Mandir
    {
        "name": "Mangaldeep Sandalwood Agarbatti",
        "category": "Pooja Needs & Spices",
        "unit": "Box of 40 sticks",
        "price": 30.0,
        "mrp": 30.0,
        "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 30,
        "featured": 1
    },
    {
        "name": "Bhimseni Pure Camphor (Kapoor) Tablets",
        "category": "Pooja Needs & Spices",
        "unit": "50 g jar",
        "price": 60.0,
        "mrp": 70.0,
        "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 25,
        "featured": 1
    },
    {
        "name": "Handmade Cotton Wicks (Diya Phool Batti)",
        "category": "Pooja Needs & Spices",
        "unit": "Pack of 100 wicks",
        "price": 25.0,
        "mrp": 30.0,
        "image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80",
        "is_available": 1,
        "stock_quantity": 40,
        "featured": 0
    }
]

BUCKET_PRESETS = {
    "morning_dairy": {
        "title": "🥛 Morning Breakfast & Dairy Bucket",
        "description": "Essential morning rush: Milk, Curd, Bread, Butter & Eggs",
        "items": [
            {"name": "Amul Taaza Toned Milk", "category": "Dairy, Bread & Eggs", "unit": "500 ml", "price": 27.0, "mrp": 27.0, "stock_quantity": 40},
            {"name": "Amul Gold Full Cream Milk", "category": "Dairy, Bread & Eggs", "unit": "500 ml", "price": 33.0, "mrp": 33.0, "stock_quantity": 40},
            {"name": "Mother Dairy Dahi Cup", "category": "Dairy, Bread & Eggs", "unit": "400 g", "price": 35.0, "mrp": 35.0, "stock_quantity": 25},
            {"name": "Harvest Gold White Bread", "category": "Dairy, Bread & Eggs", "unit": "400 g", "price": 30.0, "mrp": 30.0, "stock_quantity": 20},
            {"name": "Fresh Farm Eggs (6 pcs)", "category": "Dairy, Bread & Eggs", "unit": "6 pcs", "price": 45.0, "mrp": 50.0, "stock_quantity": 30},
            {"name": "Amul Butter 100g", "category": "Dairy, Bread & Eggs", "unit": "100 g", "price": 58.0, "mrp": 60.0, "stock_quantity": 20}
        ]
    },
    "chai_nashta": {
        "title": "☕ Evening Chai & Snacks Bucket",
        "description": "Biscuits, Namkeen, Rusk, Maggi and Tea for society evening cravings",
        "items": [
            {"name": "Tata Tea Gold 250g", "category": "Cold Drinks & Instant Mix", "unit": "250 g", "price": 140.0, "mrp": 155.0, "stock_quantity": 20},
            {"name": "Parle-G Family Pack", "category": "Biscuits & Munchies", "unit": "250 g", "price": 25.0, "mrp": 25.0, "stock_quantity": 40},
            {"name": "Good Day Cashew Cookies", "category": "Biscuits & Munchies", "unit": "200 g", "price": 40.0, "mrp": 45.0, "stock_quantity": 30},
            {"name": "Maggi 2-Min Noodles (Pack of 4)", "category": "Biscuits & Munchies", "unit": "4-pack", "price": 56.0, "mrp": 60.0, "stock_quantity": 35},
            {"name": "Haldiram Aloo Bhujia", "category": "Biscuits & Munchies", "unit": "200 g", "price": 55.0, "mrp": 60.0, "stock_quantity": 25},
            {"name": "Lay's Magic Masala Chips", "category": "Biscuits & Munchies", "unit": "50 g", "price": 20.0, "mrp": 20.0, "stock_quantity": 40}
        ]
    },
    "pooja_daily": {
        "title": "🪔 Daily Mandir / Pooja Bucket",
        "description": "Agarbatti, Pure Kapoor, Cotton Wicks and Matchbox",
        "items": [
            {"name": "Mangaldeep Sandal Agarbatti", "category": "Pooja Needs & Spices", "unit": "40 sticks", "price": 30.0, "mrp": 30.0, "stock_quantity": 30},
            {"name": "Bhimseni Pure Camphor 50g", "category": "Pooja Needs & Spices", "unit": "50 g", "price": 60.0, "mrp": 70.0, "stock_quantity": 25},
            {"name": "Cotton Diya Wicks (Phool Batti)", "category": "Pooja Needs & Spices", "unit": "100 pcs", "price": 25.0, "mrp": 30.0, "stock_quantity": 40}
        ]
    },
    "kitchen_cleaning": {
        "title": "🧼 Emergency Kitchen & Cleaning Bucket",
        "description": "Vim, Surf, Harpic, and Garbage Bags for urgent house needs",
        "items": [
            {"name": "Vim Dishwash Bar 3-in-1", "category": "Cleaning & Household", "unit": "3 bars", "price": 35.0, "mrp": 40.0, "stock_quantity": 30},
            {"name": "Surf Excel Easy Wash 1kg", "category": "Cleaning & Household", "unit": "1 kg", "price": 140.0, "mrp": 150.0, "stock_quantity": 25},
            {"name": "Harpic Toilet Cleaner 500ml", "category": "Cleaning & Household", "unit": "500 ml", "price": 99.0, "mrp": 105.0, "stock_quantity": 20},
            {"name": "Garbage Bags Medium Roll", "category": "Cleaning & Household", "unit": "30 bags", "price": 85.0, "mrp": 100.0, "stock_quantity": 25}
        ]
    }
}

def seed():
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Reset Societies to Fortune Residency ONLY as requested
    cursor.execute("DELETE FROM societies")
    conn.commit()
    conn.close()

    for soc_name, mins in INITIAL_SOCIETIES:
        add_society(soc_name, mins)
        
    # 2. Seed Store Settings
    default_settings = {
        "store_name": "Guruji Supermart",
        "store_tagline": "Located in Fortune Residency • 5-8 Min Society Delivery",
        "store_open": "1",
        "min_order_value": "0",
        "store_phone": "+91 98188 54321",
        "whatsapp_number": "919818854321",
        "delivery_area": "Fortune Residency, Rajnagar Extension",
        "delivery_eta": "5 - 8 Mins",
        "admin_pin": "2607"
    }
    for k, v in default_settings.items():
        update_setting(k, v)
        
    # 3. Seed Delivery Tiers
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM delivery_tiers")
    tiers_count = cursor.fetchone()['count']
    conn.close()
    if tiers_count == 0:
        set_delivery_tiers(DEFAULT_DELIVERY_TIERS)

    # 4. Seed Coupons
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM coupons")
    coupons_count = cursor.fetchone()['count']
    conn.close()
    if coupons_count == 0:
        for c in DEFAULT_COUPONS:
            add_coupon(c)

    # 5. Seed Products if empty
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM products")
    prods_count = cursor.fetchone()['count']
    conn.close()
    if prods_count == 0:
        for p in INITIAL_PRODUCTS:
            add_product(p)

if __name__ == "__main__":
    seed()
    print("Database seeding completed for Guruji Supermart (Fortune Residency only).")

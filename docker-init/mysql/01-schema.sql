-- MySQL Schema - Food Industry Database
-- File: 01-schema.sql

CREATE DATABASE IF NOT EXISTS food_industry;
USE food_industry;

-- Categories Table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_category (parent_category_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products Table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT,
    description TEXT,
    ingredients TEXT,
    nutritional_info JSON,
    allergens VARCHAR(255),
    weight DECIMAL(10,2),
    unit VARCHAR(20),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    expiration_days INT,
    storage_temperature VARCHAR(50),
    certifications VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_sku (sku),
    INDEX idx_stock (stock_quantity),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers Table
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    vat_number VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Italia',
    payment_terms VARCHAR(100),
    quality_rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_quality_rating (quality_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Suppliers (Many-to-Many)
CREATE TABLE product_suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    lead_time_days INT,
    minimum_order_quantity INT,
    price_per_unit DECIMAL(10,2),
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_supplier (product_id, supplier_id),
    INDEX idx_product (product_id),
    INDEX idx_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production Batches Table
CREATE TABLE production_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    production_date DATE NOT NULL,
    expiration_date DATE,
    quantity_produced INT NOT NULL,
    quality_check_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    quality_notes TEXT,
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_batch_number (batch_number),
    INDEX idx_product (product_id),
    INDEX idx_status (quality_check_status),
    INDEX idx_expiration (expiration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers Table
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200),
    vat_number VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Italia',
    customer_type ENUM('retailer', 'wholesaler', 'restaurant', 'individual') NOT NULL,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_name (company_name),
    INDEX idx_customer_type (customer_type),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders Table
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    delivery_address TEXT,
    status ENUM('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_order_number (order_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date),
    INDEX idx_delivery_date (delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order Items Table
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id),
    INDEX idx_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory Movements Table (bonus feature)
CREATE TABLE inventory_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    batch_id INT,
    movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_batch (batch_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create views for common queries

-- View: Low Stock Products
CREATE VIEW low_stock_products AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.reorder_level,
    c.name AS category_name,
    (p.reorder_level - p.stock_quantity) AS shortage_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock_quantity <= p.reorder_level;

-- View: Products expiring soon
CREATE VIEW expiring_batches AS
SELECT 
    pb.id AS batch_id,
    pb.batch_number,
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    pb.expiration_date,
    pb.quantity_produced,
    pb.storage_location,
    DATEDIFF(pb.expiration_date, CURDATE()) AS days_to_expiration
FROM production_batches pb
JOIN products p ON pb.product_id = p.id
WHERE pb.expiration_date IS NOT NULL 
  AND pb.expiration_date > CURDATE()
  AND DATEDIFF(pb.expiration_date, CURDATE()) <= 30
  AND pb.quality_check_status = 'approved'
ORDER BY pb.expiration_date ASC;

-- View: Order Summary
CREATE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.order_date,
    o.delivery_date,
    o.status,
    c.company_name AS customer_name,
    c.customer_type,
    COUNT(oi.id) AS total_items,
    SUM(oi.quantity) AS total_quantity,
    o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.order_date, o.delivery_date, o.status, c.company_name, c.customer_type, o.total_amount;

DELIMITER //

-- Trigger to update order total amount
CREATE TRIGGER update_order_total_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
END//

CREATE TRIGGER update_order_total_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
END//

CREATE TRIGGER update_order_total_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0) 
        FROM order_items 
        WHERE order_id = OLD.order_id
    )
    WHERE id = OLD.order_id;
END//

-- Trigger to update stock quantity after production
CREATE TRIGGER update_stock_after_batch_approval
AFTER UPDATE ON production_batches
FOR EACH ROW
BEGIN
    IF NEW.quality_check_status = 'approved' AND OLD.quality_check_status != 'approved' THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + NEW.quantity_produced
        WHERE id = NEW.product_id;
        
        INSERT INTO inventory_movements (product_id, batch_id, movement_type, quantity, reference_type, reference_id, notes)
        VALUES (NEW.product_id, NEW.id, 'in', NEW.quantity_produced, 'production_batch', NEW.id, 'Batch approved and added to inventory');
    END IF;
END//

DELIMITER ;

-- Insert initial admin user or system data if needed
-- (This can be extended based on requirements)

COMMIT;

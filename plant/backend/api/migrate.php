<?php
try {
    $conn = new PDO('mysql:host=127.0.0.1;dbname=plant_db', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec('ALTER TABLE products ADD COLUMN gallery_images TEXT, ADD COLUMN biological_specs TEXT, ADD COLUMN customer_reviews TEXT, ADD COLUMN rating DECIMAL(3,1) DEFAULT 4.5');
    echo "Columns added successfully";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "Columns already exist";
    } else {
        echo "Error: " . $e->getMessage();
    }
}

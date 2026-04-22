const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 połączenie z bazą (z Render ENV)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error("Błąd połączenia z bazą:", err);
    } else {
        console.log("Połączono z bazą danych");
    }
});


// 📦 GET produkty
app.get("/api/products", (req, res) => {
    db.query("SELECT * FROM products", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});


// 🔐 POST login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE username=? AND password=?",
        [username, password],
        (err, results) => {
            if (err) return res.status(500).json({ error: err });

            res.json({ success: results.length > 0 });
        }
    );
});


// 📉 PATCH stock
app.patch("/api/products/:id/stock", (req, res) => {
    const productId = req.params.id;
    const { quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Nieprawidłowe dane." });
    }

    db.query(
        "SELECT * FROM products WHERE id=?",
        [productId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err });

            const product = results[0];

            if (!product) {
                return res.status(404).json({ message: "Produkt nie istnieje." });
            }

            if (product.stock < quantity) {
                return res.status(409).json({
                    message: "Brak wystarczającej liczby sztuk."
                });
            }

            const newStock = product.stock - quantity;

            db.query(
                "UPDATE products SET stock=? WHERE id=?",
                [newStock, productId],
                (err) => {
                    if (err) return res.status(500).json({ error: err });

                    res.json({
                        id: productId,
                        stock: newStock
                    });
                }
            );
        }
    );
});


// ❤️ test endpoint (żeby sprawdzić czy działa)
app.get("/", (req, res) => {
    res.send("API działa 🚀");
});


// 🚀 start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server działa na porcie", PORT);
});
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 DB
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// 📦 produkty
app.get("/api/products", (req, res) => {
    db.query("SELECT * FROM products", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 🔐 login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE username=? AND password=?",
        [username, password],
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json({ success: results.length > 0 });
        }
    );
});

// 📉 stock
app.patch("/api/products/:id/stock", (req, res) => {
    const { quantity } = req.body;
    const id = req.params.id;

    if (!id || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Nieprawidłowe dane." });
    }

    db.query("SELECT * FROM products WHERE id=?", [id], (err, results) => {
        if (err) return res.status(500).json(err);

        const product = results[0];
        if (!product) return res.status(404).json({ message: "Produkt nie istnieje." });

        if (product.stock < quantity) {
            return res.status(409).json({ message: "Brak w magazynie." });
        }

        const newStock = product.stock - quantity;

        db.query(
            "UPDATE products SET stock=? WHERE id=?",
            [newStock, id],
            (err) => {
                if (err) return res.status(500).json(err);
                res.json({ id, stock: newStock });
            }
        );
    });
});

// 🚀 start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server działa:", PORT));
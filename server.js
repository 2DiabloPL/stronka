const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

require("dotenv").config(); // lokalnie (na hostingu ENV i tak działa)

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 pool połączeń (DUŻO lepsze niż createConnection)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 📦 GET produkty
app.get("/api/products", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// 🔐 POST login
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query(
            "SELECT * FROM users WHERE username=? AND password=?",
            [username, password]
        );

        res.json({ success: rows.length > 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// 📉 PATCH stock
app.patch("/api/products/:id/stock", async (req, res) => {
    const productId = parseInt(req.params.id);
    const { quantity } = req.body;

    // ✅ poprawiona walidacja
    if (!productId || quantity === undefined || quantity <= 0) {
        return res.status(400).json({ message: "Nieprawidłowe dane." });
    }

    try {
        const [rows] = await db.query(
            "SELECT * FROM products WHERE id=?",
            [productId]
        );

        const product = rows[0];

        if (!product) {
            return res.status(404).json({ message: "Produkt nie istnieje." });
        }

        if (product.stock < quantity) {
            return res.status(409).json({
                message: "Brak wystarczającej liczby sztuk."
            });
        }

        const newStock = product.stock - quantity;

        await db.query(
            "UPDATE products SET stock=? WHERE id=?",
            [newStock, productId]
        );

        res.json({
            id: productId,
            stock: newStock
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// ❤️ test endpoint
app.get("/", (req, res) => {
    res.send("API działa 🚀");
});

// 🚀 start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server działa na porcie", PORT);
});
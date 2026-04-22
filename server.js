// 🧾 POST order
app.post("/api/orders", async (req, res) => {
    const { customer, summary, items, discount } = req.body;

    if (!customer || !summary || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Brak danych zamówienia." });
    }

    const {
        fullName,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentMethod,
        notes
    } = customer;

    if (
        !fullName ||
        !email ||
        !phone ||
        !address ||
        !city ||
        !postalCode ||
        !paymentMethod
    ) {
        return res.status(400).json({ message: "Brak wymaganych danych klienta." });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Sprawdzenie magazynu dla wszystkich produktów
        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (!productId || !quantity || quantity <= 0) {
                throw new Error("Nieprawidłowe dane produktu w zamówieniu.");
            }

            const [rows] = await connection.query(
                "SELECT * FROM products WHERE id=? FOR UPDATE",
                [productId]
            );

            const product = rows[0];

            if (!product) {
                throw new Error(`Produkt o id ${productId} nie istnieje.`);
            }

            if (product.stock < quantity) {
                throw new Error(`Brak wystarczającej liczby sztuk produktu: ${product.name}`);
            }
        }

        // 2. Zapis zamówienia głównego
        const [orderResult] = await connection.query(
            `
            INSERT INTO orders (
                full_name,
                email,
                phone,
                address,
                city,
                postal_code,
                payment_method,
                notes,
                discount_code,
                discount_pct,
                subtotal,
                delivery,
                discount_amount,
                total,
                total_qty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                fullName,
                email,
                phone,
                address,
                city,
                postalCode,
                paymentMethod,
                notes || null,
                discount?.code || null,
                Number(discount?.pct || 0),
                Number(summary.subtotal || 0),
                Number(summary.delivery || 0),
                Number(summary.discountAmount || 0),
                Number(summary.total || 0),
                Number(summary.totalQty || 0)
            ]
        );

        const orderId = orderResult.insertId;

        // 3. Zapis produktów w zamówieniu + aktualizacja magazynu
        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice || 0);
            const lineTotal = Number(item.lineTotal || 0);

            await connection.query(
                `
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    category,
                    unit_price,
                    quantity,
                    line_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    orderId,
                    productId,
                    item.name,
                    item.category,
                    unitPrice,
                    quantity,
                    lineTotal
                ]
            );

            await connection.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [quantity, productId]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            orderId
        });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({
            message: err.message || "Nie udało się zapisać zamówienia."
        });
    } finally {
        connection.release();
    }
});

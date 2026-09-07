const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    let cart = await prisma.cart.findUnique({
        where: { userId: userId },
        include: { items: { include: { product: true } } },
      });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: userId },
        include: { items: { include: { product: true } } },
      });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart" });
  }
});

router.post("/add", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { productId, quantity = 1, size, color } = req.body;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, size, color },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + Number(quantity) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: Number(quantity),
          size,
          color,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });

    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: "Error adding item to cart" });
  }
});

router.delete("/item/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    res.json({ message: "Item removed" });
  } catch (error) {
    res.status(500).json({ message: "Error removing item" });
  }
});

router.post("/merge", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { localItems = [] } = req.body;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    for (const item of localItems) {
      const pId = item.id || item.productId;
      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: pId },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: pId,
            quantity: item.quantity || 1,
          },
        });
      }
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });

    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: "Error merging cart" });
  }
});

module.exports = router;
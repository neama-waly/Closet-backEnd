const express = require("express");
const {PrismaClient} = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.post("/checkout",authMiddleware,async(req , res )=>{
    try{
        const userId = req.userId;
        const{customerName , email , phone , address , city , items , totalAmount ,paymentMethod } = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: "User authentication failed. Please login again." });
        }

        if(!items || items.length === 0 ){
            return res.status(400).json({message : "Cart is empty "});
        }
        const newOrder = await prisma.$transaction(async(tx)=>{
            for(const item of items ){
                const pId = item.id || item._id || item.productId ;

                const product = await tx.product.findUnique({
                    where : {id : pId }
                });
                if(!product) {
                    throw new Error(`Product not found`);
                }
                if (product.stock < item.quantity) {
                    throw new Error(`Only ${product.stock} items available for ${product.name || 'this product'}`);
                }

                await tx.product.update({
                    where : {id : pId },
                    data : {
                        stock : product.stock - Number(item.quantity)
                    }
                })
            }
            const order = await tx.order.create({
            data : {
                customerName ,
                email ,
                phone ,
                address ,
                city ,
                totalAmount : Number(totalAmount) ,
                paymentMethod : paymentMethod || "CASH_ON_DELIVERY",
                user: {
                    connect: { id: userId },
                },
                items : {
                    create : items.map((item)=>({
                        productId : String(item.id || item._id),
                        quantity: Number(item.quantity) || 1,
                        price: Number(item.price) || 0,
                    })),
                },
            },
            include : {
                items : true ,
            }
        });
        await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });
        return order ;
        })
        res.status(201).json({success : true , order : newOrder });
    }catch(error){
        console.error('Error creating order:', error);
        res.status(500).json({ message: ' ERROR CONFIRM ORDER ' });
    }
});
router.get("/my-orders",authMiddleware,async(req , res)=>{
    try{
        const userId = req.userId;
        const myOrders = await prisma.order.findMany({
      where: { userId: userId }, 
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(myOrders);
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Error fetching user orders" });
    }
});

router.get("/",authMiddleware,async(req , res)=>{
    try{
        const orders = await prisma.order.findMany({
            include : {
                items : { include: { product: true } },
            },
            orderBy : {
                createdAt : "desc",
            },
        });
        res.json(orders) ;
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Error fetching orders" });
    }
})


router.get("/:id",authMiddleware,async(req , res )=>{
    try{
        const {id} = req.params ;
        const order = await prisma.order.findUnique({
            where : {id},
            include : {items : true},
        });
        if(!order) return res.status(404).json({message : "order not found" });

        res.json(order);
    }catch(error){
        res.status(500).json({message : "ERROR " })
    }
})

router.patch("/:id/status",authMiddleware,async(req , res)=>{
    try{
        const {id} = req.params ;
        const { status } = req.body;

        const updateOrder = await prisma.order.update({
            where : {id},
            data : {status},
        });
        res.json(updateOrder);

    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Error updating order status" });
    }
})
module.exports = router;
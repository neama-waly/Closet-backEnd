const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const Prisma = require("./prisma/primaConfig");
const upload = require("./middleware/upload")
const categoryRoutes = require("./routers/categoryRouter");
const productRoutes = require("./routers/productRouter");
const authRoutes = require('./routers/authRouter');
const orderRoute = require("./routers/orderRouter")
const cartRouter = require("./routers/cartRouter")

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/categories",categoryRoutes);
app.use("/api/products",productRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoute);
app.use('/api/cart', cartRouter);

app.listen(process.env.PORT,()=>{
    console.log(`Server running on port ${process.env.PORT}`)
})
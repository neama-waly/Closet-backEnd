
const prisma = require("../prisma/primaConfig")
const redisClient = require("../redisClient");

const parseJsonSafely = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};
const clearProductsCache = async () => {
    try {
        const keys = await redisClient.keys('products:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (err) {
        console.error("Error clearing Redis products cache:", err);
    }
};

exports.createProduct = async(req , res)=>{
    try{
        const {title ,description ,price , stock , categoryId , sizes, colors} = req.body;

        if(!title || !description || price === undefined || !categoryId){
            return res.status(400).json({message : "ALL DATA IS REQUIRED"})
        }
        
        const imagesList = req.files 
            ? req.files.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`)
            : [];

 
        const product = await prisma.product.create({
            data : {
                title,
                description,
                price : parseFloat(price),
                stock : parseInt(stock) || 0 ,
                categoryId ,
                sizes: parseJsonSafely(sizes),
                colors: parseJsonSafely(colors),
                images : imagesList
            },
            include : {category : true}
        });
        await clearProductsCache();

        res.json(product);
    }catch(error){
        if(error.code === "P2002"){
            return res.status(500).json({message : "Already exist"})
        }
        res.status(500).json({message : "ERROR APPEND PRODUCT ",error})
    }
};

exports.getProducts = async(req,res)=>{
    try{
        const {categoryId , search }=req.query;

        const cacheKey = `products:cat=${categoryId || 'all'}:search=${search || 'none'}`;
       try {
            const cachedProducts = await redisClient.get(cacheKey);
            if (cachedProducts) {
                return res.json(JSON.parse(cachedProducts));
            }
        } catch (redisError) {
            console.error("Redis error, falling back to DB:", redisError.message);
        }

        const where = {};
        if(categoryId) where.categoryId = categoryId ;
        if(search){
            where.OR = [
                {title : {contains : search , mode : "insensitive"}},
                {description : {contains : search , mode : "insensitive"}}
            ];
        }
        const products = await prisma.product.findMany({
            where,
            include : {category : true },
            orderBy : {createdAt : "desc" }
        });

       try {
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(products));
        } catch (redisError) {
            console.error("Failed to set Redis cache:", redisError.message);
        }

        res.json(products);
    }catch(error){
        res.status(500).json({message : "ERROR GET PRODUCTS ",error})
    }
};

exports.getProductById = async(req,res)=>{
    try{
        const {id} = req.params;
        const cacheKey = `products:id:${id}`;
        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
            return res.json(JSON.parse(cachedProduct));
        }

        const product = await prisma.product.findUnique({
            where : {id : id},
            include : {category : true}
        });
        if(!product){
            return res.status(404).json({message : "PRODUCT NOT FOUND ",error})
        }

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(product));
        res.json(product);

    }catch(error){
        res.status(500).json({message : "ERROR GET PRODUCT ",error})
    }
};

exports.updateProduct = async(req , res)=>{
    try{
        const {id} = req.params;
        const{title,description,price,stock,categoryId , sizes, colors} = req.body;
        let updatedImages ;
        if (req.files && req.files.length > 0) {
            updatedImages = req.files.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
        }

        const updatedProduct = await prisma.product.update({
            where : {id},
            data : {
                ...(title && {title}),
                ...(description && {description}),
                ...(price !== undefined && {price : parseFloat(price)}),
                ...(stock !== undefined && { stock: parseInt(stock) }),
                ...(updatedImages && { images  : updatedImages }),
                ...(categoryId && { categoryId }),
                ...(parseJsonSafely(sizes) && {sizes : parseJsonSafely(sizes)}),
                ...(parseJsonSafely(colors) && {colors : parseJsonSafely(colors)})
            },
            include : {category : true }
        });
        await clearProductsCache();
        await redisClient.del(`products:id:${id}`);
        res.json(updatedProduct);

    }catch(error){
        res.status(500).json({message : "ERROR UPDATING PRODUCT ",error})
    }
};

exports.deleteProduct = async(req,res)=>{
    try{
        const {id} = req.params;
        await prisma.product.delete({where : {id}});
        await clearProductsCache();
        await redisClient.del(`products:id:${id}`);
        res.json({message : "DELETED SUCCESSFULLY"});

    }catch(error){
        res.status(500).json({message : "ERROR DELETE PRODUCT ",error})
    }
}
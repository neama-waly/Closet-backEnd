
const prisma = require("../prisma/primaConfig")
const parseJsonSafely = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};
exports.createProduct = async(req , res)=>{
    try{
        const {title ,description ,price , stock , categoryId , sizes, colors} = req.body;

        if(!title || !description || price === undefined || !categoryId){
            return res.status(400).json({message : "ALL DATA IS REQUIRED"})
        }
        
        const imagesList = req.files 
            ? req.files.map(file => `http://localhost:5010/uploads/${file.filename}`)
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
        res.json(products);
    }catch(error){
        res.status(500).json({message : "ERROR GET PRODUCTS ",error})
    }
};

exports.getProductById = async(req,res)=>{
    try{
        const {id} = req.params;
        const product = await prisma.product.findUnique({
            where : {id : id},
            include : {category : true}
        });
        if(!product){
            return res.status(404).json({message : "PRODUCT NOT FOUND ",error})
        }
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
            updatedImages = req.files.map(file => `http://localhost:5010/uploads/${file.filename}`);
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
        res.json(updatedProduct);

    }catch(error){
        res.status(500).json({message : "ERROR UPDATING PRODUCT ",error})
    }
};

exports.deleteProduct = async(req,res)=>{
    try{
        const {id} = req.params;
        await prisma.product.delete({where : {id}});
        res.json({message : "DELETED SUCCESSFULLY"});

    }catch(error){
        res.status(500).json({message : "ERROR DELETE PRODUCT ",error})
    }
}
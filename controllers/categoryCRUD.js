const prisma = require("../prisma/primaConfig");

exports.createCategory = async(req , res)=>{
    try{
        const {name} = req.body;
        if(!name){
            return res.status(400).json({message : "Category`s name is required" })
        }
        const category = await prisma.category.create({
            data : {name}
        });
        res.status(201).json(category);
    }catch(error){
        if(error.code === "P2002"){
            return res.status(400).json({message : "Already exist"})
        }
        res.status(500).json({message : "ERROR APPEND CATEGORY ",error})
    }
}


exports.getCategory = async(req , res)=>{
    try{
        const categories = await prisma.category.findMany({
            include : {_count : {select : {products : true}}}
        });
        res.json(categories);
    }catch(error){
        res.status(500).json({message : "ERROR GET CATEGORIES ",error})   
    }
};

exports.deleteCategory = async(req , res)=>{
    try{
        const {id} = req.params;
        await prisma.category.delete({where : {id}})
        res.json({message : "CATEGORY DELETED SUCCESSFULLY"})
    }catch(error){
        res.status(500).json({message : "ERROR DELETING CATEGORY ",error})
    }
}
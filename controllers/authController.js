const {prismaClient, PrismaClient} = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

exports.signup = async(req , res)=>{
    try{
        const {email,password,name,role} = req.body;
        const existingUser = await prisma.user.findUnique({where : {email}});
        if(existingUser) return res.status(400).json({message : "Email is already in use"}) ;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data : {
                email,
                password : hashedPassword,
                name,
                role : "CUSTOMER",
            },
        });
        const token = jwt.sign(
            {userId : newUser.id , role : newUser.role },
            JWT_SECRET,
            {expiresIn : "7d"}
        );
        res.status(201).json({
            message : "User created successfully",
            token,
            user : {
                id : newUser.id ,
                name : newUser.name,
                email : newUser.email,
                role : newUser.role,
            },
        });
    }catch(error){
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error during signup" });    
    }
};

exports.login = async(req , res)=>{
    try{
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(200).json({
            message: "Logged in successfully",
            token,
            user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role, 
      },
    });
    }catch(error){
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
};
 

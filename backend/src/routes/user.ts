import { Router } from "express";
import { Request, Response } from "express";

import { User } from "../db/db";

const userRouter = Router();

userRouter.post('/signup', async (req : Request, res : Response) => {
    const { email, password } = req.body;

    try {

        const userExists = await User.findOne({email});

        if(userExists) return res.status(400).json({msg : "User exists!"})

        const newUser = await User.create({
            email, password
        })

        return res.status(200).json({msg : "Account created succesfully!"})

    } catch (e) {
        return res.status(500).json({msg : "Server Error!"});
    }    
});

userRouter.post('/signin', async (req : Request, res : Response) => {
    const 
})
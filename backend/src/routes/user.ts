import { Router } from "express";
import { Request, Response } from "express";

import { User } from "../db/db";

import userMiddleware from "../middlewares/user.middleware";

import Jwt, {type JwtPayload} from "jsonwebtoken";

const JWT_SECRET = "JW999";

const userRouter = Router();

userRouter.post('/signup', async (req : Request, res : Response) => {
    const { email, password } = req.body;

    try {

        const userExists = await User.findOne({email});

        if(userExists) return res.status(400).json({msg : "User exists!"})

        const newUser = await User.create({
            email, password
        })

        const token = await Jwt.sign({
            id: newUser._id
        }, JWT_SECRET);

        return res.status(200).json({
            msg : "Account created succesfully!",
            token: token
        })

    } catch (e) {
        return res.status(500).json({msg : "Error signing up!"});
    }    
});

userRouter.post('/signin', async (req : Request, res : Response) => {
    const { email, password } = req.body;

    try {
        const userExists = await User.findOne({email, password});

        if(!userExists) return res.status(400).json({msg: 'User does not Exists'});

        const token = await Jwt.sign({
            id: userExists._id
        }, JWT_SECRET)

        return res.status(200).json({
            msg: "Signed in Succesfully",
            token: token
        })

    } catch (e) {
        return res.status(400).json({msg: "Error Signing in!"})
    }
})

export default userRouter;
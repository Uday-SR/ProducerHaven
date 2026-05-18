"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db/db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = "JW999";
const userRouter = (0, express_1.Router)();
userRouter.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userExists = await db_1.User.findOne({ email });
        if (userExists)
            return res.status(400).json({ msg: "User exists!" });
        const newUser = await db_1.User.create({
            email, password
        });
        const token = await jsonwebtoken_1.default.sign({
            id: newUser._id
        }, JWT_SECRET);
        return res.status(200).json({
            msg: "Account created succesfully!",
            token: token
        });
    }
    catch (e) {
        return res.status(500).json({ msg: "Error signing up!" });
    }
});
userRouter.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userExists = await db_1.User.findOne({ email, password });
        if (!userExists)
            return res.status(400).json({ msg: 'User does not Exists' });
        const token = await jsonwebtoken_1.default.sign({
            id: userExists._id
        }, JWT_SECRET);
        return res.status(200).json({
            msg: "Signed in Succesfully",
            token: token
        });
    }
    catch (e) {
        return res.status(400).json({ msg: "Error Signing in!" });
    }
});
exports.default = userRouter;
//# sourceMappingURL=user.js.map
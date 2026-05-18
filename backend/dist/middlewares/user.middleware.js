"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function userMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).json({
            msg: "No token provided"
        });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ msg: "Token Missing" });
    }
    const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
    req.userId = decoded.id;
    next();
}
exports.default = userMiddleware;
//# sourceMappingURL=user.middleware.js.map
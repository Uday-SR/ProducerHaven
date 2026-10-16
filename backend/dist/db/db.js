"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Usage = exports.User = void 0;
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("./model/user.model"));
exports.User = user_model_1.default;
const usage_model_1 = __importDefault(require("./model/usage.model"));
exports.Usage = usage_model_1.default;
async function connectDB() {
    try {
        const MONGO_KEY = process.env.MONGO_KEY;
        if (!MONGO_KEY) {
            throw new Error("MONGO_KEY is missing from environment variables");
        }
        if (!MONGO_KEY.startsWith("mongodb://") &&
            !MONGO_KEY.startsWith("mongodb+srv://")) {
            throw new Error("Invalid MongoDB connection string format");
        }
        await mongoose_1.default.connect(MONGO_KEY);
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}
//# sourceMappingURL=db.js.map
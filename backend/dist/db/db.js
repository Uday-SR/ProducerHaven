"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Usage = exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("./model/user.model"));
exports.User = user_model_1.default;
const usage_model_1 = __importDefault(require("./model/usage.model"));
exports.Usage = usage_model_1.default;
const MONGO_KEY = process.env.MONGO_KEY;
async function connect() {
    await mongoose_1.default.connect("mongodb+srv://Kutt:Nalla321@cluster0.ravbc.mongodb.net/ProdHaven");
    console.log("Connected to db");
}
connect();
//# sourceMappingURL=db.js.map
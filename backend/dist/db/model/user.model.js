"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = mongoose_1.default.Schema;
const userSchema = new schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isSubscribed: {
        type: Boolean,
        default: false,
    },
    plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free",
    },
    subscriptionEnd: {
        type: Date,
    },
}, {
    timestamps: true,
});
const User = mongoose_1.default.model("user", userSchema);
exports.default = User;
//# sourceMappingURL=user.model.js.map
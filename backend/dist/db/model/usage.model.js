"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schema = mongoose_1.default.Schema;
const usageSchema = new schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    feature: {
        type: String,
        required: true,
    },
    count: {
        type: Number,
        default: 0,
    },
    date: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});
const Usage = mongoose_1.default.model("usage", usageSchema);
exports.default = Usage;
//# sourceMappingURL=usage.model.js.map
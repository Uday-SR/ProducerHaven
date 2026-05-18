"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const user_1 = __importDefault(require("./routes/user"));
const PORT = 3000;
const ORIGIN = process.env.ORIGIN;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, cors_1.default)({
    origin: [
        ORIGIN
    ],
    credentials: true,
}));
app.use("/api/v1/user", user_1.default);
app.listen(PORT, () => {
    console.log(`Server is listening on Port: ${PORT}`);
});
//# sourceMappingURL=index.js.map
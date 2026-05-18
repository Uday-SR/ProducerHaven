"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT = exports.ORIGIN = exports.MONGO_KEY = exports.JWT_SECRET = void 0;
const JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_SECRET = JWT_SECRET;
const MONGO_KEY = process.env.MONGO_KEY;
exports.MONGO_KEY = MONGO_KEY;
const ORIGIN = process.env.ORIGIN;
exports.ORIGIN = ORIGIN;
const PORT = process.env.PORT;
exports.PORT = PORT;
//# sourceMappingURL=config.js.map
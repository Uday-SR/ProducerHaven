
import mongoose from "mongoose";

import User from "./model/user.model";
import Usage from "./model/usage.model";

export async function connectDB(): Promise<void> {
    try {
        const MONGO_KEY = process.env.MONGO_KEY;

        if (!MONGO_KEY) {
            throw new Error("MONGO_KEY is missing from environment variables");
        }

        if (
            !MONGO_KEY.startsWith("mongodb://") &&
            !MONGO_KEY.startsWith("mongodb+srv://")
        ) {
            throw new Error("Invalid MongoDB connection string format");
        }

        await mongoose.connect(MONGO_KEY);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

export { User, Usage };

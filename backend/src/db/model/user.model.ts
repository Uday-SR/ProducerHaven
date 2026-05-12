import mongoose, { Model, Schema } from "mongoose";

const schema = mongoose.Schema;

const userSchema = new schema(
    {
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
    },
    {
        timestamps: true,
    }
)

const User = mongoose.model("user", userSchema);

export default User;

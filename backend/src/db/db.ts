import mongoose, { Model } from "mongoose";

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

const usageSchema = new schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
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
    },
    {
        timestamps: true,
    }
)

const userModel = mongoose.model("user", userSchema);
const usageModel = mongoose.model("usage", usageSchema);

module.exports = {
    userModel
}


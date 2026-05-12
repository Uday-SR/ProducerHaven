import mongoose, {Model, Schema } from "mongoose";

const schema = mongoose.Schema;

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

const Usage = mongoose.model("usage", usageSchema);

export default Usage;




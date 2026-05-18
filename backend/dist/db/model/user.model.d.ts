import mongoose from "mongoose";
declare const User: mongoose.Model<{
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    email: string;
    password: string;
    isVerified: boolean;
    isSubscribed: boolean;
    plan: "free" | "pro";
    subscriptionEnd?: NativeDate | null;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export default User;
//# sourceMappingURL=user.model.d.ts.map
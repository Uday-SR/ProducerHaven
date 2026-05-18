import mongoose from "mongoose";
declare const Usage: mongoose.Model<{
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    date: string;
    userId: mongoose.Types.ObjectId;
    feature: string;
    count: number;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export default Usage;
//# sourceMappingURL=usage.model.d.ts.map
import mongoose from 'mongoose'

import User from './model/user.model'
import Usage from './model/usage.model'

const MONGO_KEY = process.env.MONGO_KEY!

async function connect() {
    await mongoose.connect(`${MONGO_KEY}`);
    console.log("Connected to db")
}

connect();

export {
    User,
    Usage
}

import express, { Request, Response } from "express";
import cors from "cors";

import userRouter from "./routes/user";

const PORT = 3000
const ORIGIN = process.env.ORIGIN!

const app = express();
app.use(express.json());
app.use(cors());

app.use(cors({
    origin: [
      ORIGIN
    ],
    credentials: true,
}))

app.use("/api/v1/user", userRouter);

app.listen(PORT, () => {
    console.log(`Server is listening on Port: ${PORT}`);
});
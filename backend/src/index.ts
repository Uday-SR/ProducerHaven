import express, { Request, Response } from "express";
import cors from "cors";

import userRouter from "./routes/auth/user";
import samplerRouter from "./routes/services/sampler/sampler.routes"
import eqRouter from "./routes/services/ffmpeg/equalizer.routes"

const PORT = 3000
const ORIGIN = process.env.ORIGIN!

const app = express();
app.use(express.json());
//app.use(cors());

app.use(cors({
    origin: [
      ORIGIN
    ],
    credentials: true,
}))

app.use("/api/v1/auth/user", userRouter);
app.use("/api/v1/services/sampler", samplerRouter);
app.use("/api/v1/services/equalizer", eqRouter);

app.listen(PORT, () => {
    console.log(`Server is listening on Port: ${PORT}`);
});
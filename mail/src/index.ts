import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { sendOtpConsumer } from "./consumer.js";
dotenv.config()

sendOtpConsumer()
const app = express();
app.use(cors({
  origin:"https://chat2-peer.vercel.app"
}))


app.listen(5001, () => {
  console.log(`Server running on 5001`)
})
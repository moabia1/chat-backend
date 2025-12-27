import express from "express"
import dotenv from "dotenv"
import { sendOtpConsumer } from "./consumer.js";
dotenv.config()

sendOtpConsumer()
const app = express();



app.listen(5001, () => {
  console.log(`Server running on 5001`)
})
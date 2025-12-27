import express from "express"
import connectDB from "./config/db.js";
import dotenv from "dotenv"
import cors from "cors"
dotenv.config()
import { createClient } from "redis"
import userRoutes from "./routes/user.route.js"
import { connectRabbitMQ } from "./config/rabbitmq.js";

const app = express()
app.use(express.json())
app.use(cors())
const port = process.env.PORT;
connectDB();
connectRabbitMQ()

// heee
export const redisClient = createClient({
  url:process.env.REDIS_URL as string
})
redisClient.connect().then(() => console.log("Redis Connected")).catch((err) => console.log(err))




app.use("/api/v1",userRoutes)
app.listen(port, () => {
  console.log(`Server Running on port ${port}`)
})
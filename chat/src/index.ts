import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import chatRoutes from "./routes/chat.route.js"
dotenv.config()
import cors from "cors"
import { app, server } from "./config/socket.js"


app.use(express.json())
app.use(cors())

app.use("/api/v1",chatRoutes)

connectDB()
server.listen(5002, () => {
  console.log("Server running on port 5002")
})
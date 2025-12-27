import mongoose from "mongoose"
const connectDB = async () => {
  const url = process.env.MONGO_URI
  if (!url) {
    throw new Error ("MONGO_URI not found")
  }

  try {
    await mongoose.connect(url)
    console.log("MongoDb Connected")
  } catch (error) {
    console.log("MONGO Connection Error : ",error)
  }
}
export default connectDB
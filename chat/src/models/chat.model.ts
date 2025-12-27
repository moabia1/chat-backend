import mongoose from "mongoose"

export interface Ichat{
  users: string[],
  latestMessage: {
    text: string,
    sender:string
  },
  createdAt: Date,
  updatedAt:Date
}

const chatSchema = new mongoose.Schema<Ichat>({
  users: [{ type: String, required: true }],
  latestMessage: {
    text: String,
    sender:String
  }
}, { timestamps: true })

export const Chat = mongoose.model("Chat",chatSchema)
import mongoose, { mongo, Types } from "mongoose"

export interface IMessage {
  chatId: Types.ObjectId,
  sender: string,
  text?: string,
  image?: {
    url: string,
    publicId:string
  },
  messageType: "text" | "image",
  seen: Boolean,
  seenAt?: Date,
  createdAt: Date,
  updatedAt:Date
}

const messageSchema = new mongoose.Schema<IMessage>({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required:true
  },
  sender: {
    type: String,
    required:true
  },
  text: {
    type:String
  },
  image: {
    url: String,
    publicId:String
  },
  messageType: {
    type: String,
    enum: ["text", "image"],
    default:"text"
  },
  seen: {
    type: Boolean,
    default:false
  },
  seenAt: {
    type: Date,
    default:null
  },

}, { timestamps: true })


export const Messages = mongoose.model("Messages",messageSchema)
import mongoose from "mongoose"

export interface IUser{
  _id?:string,
  name: string,
  email:string
}

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required:true
  },
  email: {
    type: String,
    required:true
  }
}, { timestamps: true })

export const User = mongoose.model("User",userSchema)
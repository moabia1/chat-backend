import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"

interface IUser{
  _id: string,
  name: string,
  email:string
}

export interface AuthenticatedRequest extends Request{
  user?:IUser | null
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction):  Promise < void> => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({message:"Please login - No auth Header"})
        return
      }

      const token = authHeader.split(" ")[1] as string
      const decode = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
      
      if (!decode || !decode.user) {
      res.status(401).json({ message: "unauthorized user" })
      return
      }
      
      req.user = decode.user
      next()
    } catch (error) {
      console.log("Chat middleware :", error)
    }
}

export default isAuth
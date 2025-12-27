import axios from "axios";
import tryCatch from "../config/try-catch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.model.js";
import { Messages } from "../models/messages.model.js";
import mongoose from "mongoose";
import { getRecieverSocketId, io } from "../config/socket.js";

export const createNewChat = tryCatch(async (req:AuthenticatedRequest, res) => {
  const userId = req.user?._id
  const { otherUserId } = req.body
  
  if (!otherUserId) {
    res.status(400).json({ message: "Other user is required" })
    return
  }

  const existingChat = await Chat.findOne({
    users:{$all:[userId,otherUserId],$size:2}
  })

  if (existingChat) {
    res.json({ message: "chat already exists", chatId: existingChat._id })
    return
  }
  
  const newChat = await Chat.create({
    users: [userId, otherUserId],
    
  })

  res.status(201).json({ message: "New chat created", chatId: newChat._id })
  
}) 

export const getAllChats = tryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id
  if (!userId) {
    res.status(400).json({ message: "UserId missing" })
    return
  }

  const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 })
  
  const chatWithUserData = await Promise.all(
    chats.map(async (chat) => {
      const otherUserId = chat.users.find(id => id !== userId);
      
      const unseenCount = await Messages.countDocuments({
        chatId: new mongoose.Types.ObjectId(chat._id),
        sender: { $ne: userId },
        seen:false
      })

      try {
        const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`)
        return {
          user: data,
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount
          }
        }
      } catch (error) {
        console.log(error)
        return {
          user: {_id:otherUserId, name:"Unknown user"},
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount
          }
        }
      }
    })
  )

  res.json({
    chats:chatWithUserData
  })
})

export const sendMessage = tryCatch(async (req: AuthenticatedRequest, res) => {
  const senderId = req.user?._id
  const { chatId, text } = req.body
  const imageFile = req.file

  if (!senderId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  if (!chatId) {
    res.status(400).json({ message: "ChatId required" })
    return
  }

  if (!text && !imageFile) {
    res.status(400).json({ message: "Either text or image required" })
    return
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message:"Chat not found"
    })
    return 
  }

  const isUserInChat = chat.users.some(
    (userId) => userId.toString() === senderId.toString()
  )
  if (!isUserInChat) {
    res.status(403).json({ message: "you are not a participant of this chat" })
    return
  }

  const otherUserId = chat.users.find(id => id !== senderId)
  if (!otherUserId) {
    res.status(401).json({ message: "no other user" })
    return
  }

  // Socket setup
  const receiverSocketId = getRecieverSocketId(otherUserId.toString())
  let isReceiverInChatRoom = false;

  if (receiverSocketId) {
    const recceiverSocket = io.sockets.sockets.get(receiverSocketId)
    if (recceiverSocket && recceiverSocket.rooms.has(chatId)) {
      isReceiverInChatRoom = true
    }
  }

  let messageData = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom ? new Date() : undefined
  } as any
  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId:imageFile.filename
    }
    messageData.messageType = "image",
    messageData.text = text || ""
  } else {
    messageData.text = text,
    messageData.messageType = "text"
  }

  const message = new Messages(messageData)

  const savedMessage = await message.save()

  const latestMessage = imageFile ? "📷 Image" : text;

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: {
      text: latestMessage,
      sender:senderId
    },
    updatedAt:new Date()
  }, { new: true })
  
  //emit to socket
  // Emit the new message to the chat room so connected participants receive it
  io.to(chatId).emit("newMessage", savedMessage)

  // If the receiver has a socket but is NOT currently in the chat room,
  // notify them directly so they still get the new message notification.
  if (receiverSocketId && !isReceiverInChatRoom) {
    io.to(receiverSocketId).emit("newMessage", savedMessage)
  }

  if (isReceiverInChatRoom && senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen",{
      chatId: chatId,
      seenBy: otherUserId,
      messageIds:[savedMessage._id]
    })
  }

  res.status(201).json({
    message: savedMessage,
    sender:senderId
  })
})

export const getMessagesByChat = tryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id
  const { chatId } = req.params
  
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }
  if (!chatId) {
    res.status(401).json({ message: "chatId required" })
    return
  }

  const chat = await Chat.findById(chatId)
  if (!chat) {
    res.status(404).json({ message: "chat not found" })
    return
  }

  const isUserInChat = chat.users.some(
    (user)=> user === userId
  ) 
  if (!isUserInChat) {
    res.status(403).json({ message: "you are not a participant of this chat" })
    return
  }

  const messageMarkSeen = await Messages.find({
    chatId: chatId,
    sender: { $ne: userId },
    seen:false
  })

  await Messages.updateMany({ chatId: chatId, sender: { $ne: userId }, seen: false }, {
    seen: true,
    seenAt:new Date()
  })

  const messages = await Messages.find({ chatId: chatId }).sort({ createdAt: 1 })
  
  const otherUserId = chat.users.find(id => id !== userId)

  try {
    if (!otherUserId) {
      res.status(400).json({ message: "No Other user" })
      return
    }
    const { data } = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`);

    // socket work
    if (messageMarkSeen.length>0) {
      const otherUserSocketId = getRecieverSocketId(otherUserId.toString())
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("messagesSeen", {
          chatId: chatId,
          seenBy: userId,
          messageIds:messageMarkSeen.map((msg)=>msg._id)
        })
      }
    }
    res.json({
      messages,
      user:data
    })
    
  } catch (error) {
    console.log(error)
    res.json({
      messages,
      user:{_id:otherUserId, name:"Unknowm user"}
    })
  }
  
})
import amqp from "amqplib"
import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

export const sendOtpConsumer = async () => {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.RABBITMQ_HOST,
      port: 5672,
      username: process.env.RABBITMQ_USERNAME,
      password:process.env.RABBITMQ_PASSWORD
    })

    const channel = await connection.createChannel()

    const queueName = "send-otp"

    await channel.assertQueue(queueName, { durable: true })
    console.log("Consumer mail service started or listening for otp emails")

    channel.consume(queueName, async (msg) => { 
      if (msg) {
        try {
          const {to,subject,body} = JSON.parse(msg.content.toString())

          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: process.env.EMAIL_USER,
              clientId: process.env.CLIENT_ID,
              clientSecret: process.env.CLIENT_SECRET,
              refreshToken: process.env.REFRESH_TOKEN,
            },
          });

          await transporter.sendMail({
            from: "chat-app",
            to,
            subject,
            text:body
          })

          console.log(`OTP mail sent to ${to}`)
          channel.ack(msg)
        } catch (error) {
          console.log("failed to send otp :",error)
        }
      }
    })
  } catch (error) {
    console.log("Failed to start rabbitmq consumer :",error)
  }
}
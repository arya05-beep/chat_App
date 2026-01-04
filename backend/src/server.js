//const express= new require('express');
import express from "express";
//import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

//dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

const __dirname = path.resolve();

//console.log(process.env.PORT);
const PORT = ENV.PORT || 3000;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json({limit: "10mb"}));
app.use(cookieParser());

// Make io accessible to routes
app.set('io', io);

// Store online users
const onlineUsers = new Map();

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    
    // Handle user joining
    socket.on("user-online", (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit("update-online-users", Array.from(onlineUsers.keys()));
    });
    
    // Handle sending messages
    socket.on("send-message", (message) => {
        const receiverSocketId = onlineUsers.get(message.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive-message", message);
            // Mark as delivered if receiver is online
            io.to(receiverSocketId).emit("message-delivered", { messageId: message._id });
        }
    });
    
    // Handle message delivered
    socket.on("message-delivered", ({ messageId, senderId }) => {
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("message-status-update", { messageId, status: "delivered" });
        }
    });
    
    // Handle message read
    socket.on("message-read", ({ messageId, senderId }) => {
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("message-status-update", { messageId, status: "read" });
        }
    });
    
    // Handle typing indicator
    socket.on("typing", ({ userId, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("user-typing", userId);
        }
    });
    
    socket.on("stop-typing", ({ userId, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("user-stop-typing", userId);
        }
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Remove user from online users
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                io.emit("update-online-users", Array.from(onlineUsers.keys()));
                break;
            }
        }
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if(ENV.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "../frontend/vitemern/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/vitemern/dist/index.html"));
    });
}

server.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
    connectDB();
});
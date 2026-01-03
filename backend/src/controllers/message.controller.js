import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllContacts = async (req, res) => {
    try{
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");
        res.status(200).json(filteredUsers);
    }catch(error){
        console.log("Error fetching contacts:", error.message);
        res.status(500).json({message: "Server error"});
    }
};

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId=req.user._id;
        const {id:userToChatId}= req.params;

        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error fetching messages:", error.message);
        res.status(500).json({message: "Server error"});
    }
};

export const sendMessage = async (req, res) => {
    try {
        const{text,image}= req.body;
        const senderId= req.user._id;
        const {id:receiverId}= req.params;
        
        if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }
    
        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error sending message:", error.message);
        res.status(500).json({message: "Server error"});
    }
};

export const getChatPartners = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        });

        const chatPartnerIds = [...new Set(
            messages.map(msg => 
                msg.senderId.toString() === loggedInUserId.toString()
                ? msg.receiverId.toString() : msg.senderId.toString()))];

        const chatPartners = await User.find({_id: {$in: chatPartnerIds}}).select("-password");

        res.status(200).json(chatPartners);
    } catch (error) {
        console.log("Error fetching chat partners:", error.message);
        res.status(500).json({message: "Server error"});
    }
};
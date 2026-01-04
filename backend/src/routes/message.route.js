import express from "express";
import { get } from "http";
import { getAllContacts,getMessagesByUserId,sendMessage,getChatPartners,markMessagesAsRead} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetMiddleware } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetMiddleware,protectRoute);
router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id",getMessagesByUserId);

router.post("/send/:id",sendMessage);
router.put("/read/:id", markMessagesAsRead);

export default router;

import { create } from "zustand";
import axios from "axios";
import { socket } from "../lib/socket";

const API_URL = "http://localhost:5001/api/messages";

axios.defaults.withCredentials = true;

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  onlineUsers: [],
  isTyping: false,
  typingUser: null,

  subscribeToMessages: () => {
    const { selectedUser } = get();
    
    socket.on("receive-message", (newMessage) => {
      const { messages, selectedUser } = get();
      // Only add message if it's for the current conversation
      if (selectedUser && (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)) {
        set({ messages: [...messages, newMessage] });
      }
    });

    socket.on("update-online-users", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("user-typing", (userId) => {
      const { selectedUser } = get();
      if (selectedUser && userId === selectedUser._id) {
        set({ isTyping: true, typingUser: userId });
      }
    });

    socket.on("user-stop-typing", (userId) => {
      const { selectedUser } = get();
      if (selectedUser && userId === selectedUser._id) {
        set({ isTyping: false, typingUser: null });
      }
    });
  },

  unsubscribeFromMessages: () => {
    socket.off("receive-message");
    socket.off("update-online-users");
    socket.off("user-typing");
    socket.off("user-stop-typing");
  },

  emitTyping: (receiverId) => {
    socket.emit("typing", { userId: get().selectedUser?._id, receiverId });
  },

  emitStopTyping: (receiverId) => {
    socket.emit("stop-typing", { userId: get().selectedUser?._id, receiverId });
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axios.get(`${API_URL}/contacts`);
      set({ users: res.data });
    } catch (error) {
      console.log("Error in getUsers:", error);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axios.get(`${API_URL}/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.log("Error in getMessages:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axios.post(`${API_URL}/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
      
      // Emit socket event for real-time delivery
      socket.emit("send-message", {
        ...res.data,
        receiverId: selectedUser._id
      });
    } catch (error) {
      console.log("Error in sendMessage:", error);
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));

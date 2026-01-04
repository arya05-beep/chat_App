import { create } from "zustand";
import axios from "axios";
import { connectSocket, disconnectSocket } from "../lib/socket";

const API_URL = "http://localhost:5001/api/auth";

axios.defaults.withCredentials = true;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axios.get(`${API_URL}/check`);
      set({ authUser: res.data });
      // Connect socket if user is authenticated
      if (res.data) {
        connectSocket(res.data._id);
      }
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axios.post(`${API_URL}/signup`, data);
      set({ authUser: res.data });
      // Connect socket after signup
      connectSocket(res.data._id);
    } catch (error) {
      console.log("Error in signup:", error);
      throw error;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axios.post(`${API_URL}/login`, data);
      set({ authUser: res.data });
      // Connect socket after login
      connectSocket(res.data._id);
    } catch (error) {
      console.log("Error in login:", error);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_URL}/logout`);
      set({ authUser: null });
      // Disconnect socket on logout
      disconnectSocket();
    } catch (error) {
      console.log("Error in logout:", error);
    }
  },

  updateProfile: async (profilePic) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axios.post(`${API_URL}/update-profile`, { profilePic });
      set({ authUser: res.data });
    } catch (error) {
      console.log("Error in updateProfile:", error);
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));
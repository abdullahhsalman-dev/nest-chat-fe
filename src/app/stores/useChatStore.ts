import { create } from "zustand";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Types
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatState {
  socket: Socket | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: string[];
  loading: boolean;
  error: string | null;

  // Socket actions
  connectSocket: () => void;
  disconnectSocket: () => void;

  // Fetch data
  fetchConversations: () => Promise<void>;
  fetchMessages: (userId: string) => Promise<void>;

  // Message actions
  sendMessage: (receiverId: string, content: string) => Promise<Message>;
  markMessageAsRead: (messageId: string) => Promise<void>;

  // Helpers
  isUserOnline: (userId: string) => boolean;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: [],
  loading: false,
  error: null,

  connectSocket: () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    try {
      const socket = io(API_URL, {
        auth: { token },
      });

      // Socket event listeners
      socket.on("connect", () => {
        console.log("Socket connected");
      });

      socket.on("newMessage", (message: Message) => {
        const { conversations, currentConversation } = get();

        console.log("conversation is ", conversations);
        // Update messages if in current conversation
        if (
          currentConversation &&
          (message.senderId === currentConversation.user.id ||
            message.receiverId === currentConversation.user.id)
        ) {
          set((state) => ({
            messages: [...state.messages, message],
          }));

          // Mark message as read if from current conversation partner
          if (message.senderId === currentConversation.user.id) {
            get().markMessageAsRead(message.id).catch(console.error);
          }
        }

        // Update conversations list with latest message
        const { user } = useAuthStore.getState();
        if (!user) return;

        const otherUserId =
          message.senderId === user.id ? message.receiverId : message.senderId;

        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.user.id === otherUserId) {
              return {
                ...conv,
                lastMessage: message,
                unreadCount:
                  message.senderId === user.id
                    ? conv.unreadCount
                    : conv.unreadCount + 1,
              };
            }
            return conv;
          }),
        }));
      });

      socket.on(
        "userStatus",
        ({
          userId,
          status,
        }: {
          userId: string;
          status: "online" | "offline";
        }) => {
          set((state) => ({
            onlineUsers:
              status === "online"
                ? [...state.onlineUsers, userId]
                : state.onlineUsers.filter((id) => id !== userId),
          }));
        }
      );

      socket.on("onlineUsers", (users: string[]) => {
        set({ onlineUsers: users });
      });

      socket.on("error", (error) => {
        set({ error: error.message || "Socket connection error" });
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      set({ socket });
    } catch (error) {
      console.log("error", error);

      set({
        error: "Failed to connect to chat server",
        socket: null,
      });
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchConversations: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      set({ loading: true, error: null });

      const response = await axios.get<Conversation[]>(
        `${API_URL}/chat/conversations`
      );

      set({
        conversations: response.data,
        loading: false,
      });
    } catch (error) {
      console.log("error", error);

      set({
        error: "Failed to fetch conversations",
        loading: false,
      });
    }
  },

  fetchMessages: async (userId: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      set({ loading: true, error: null });

      const response = await axios.get<{ messages: Message[]; user: User }>(
        `${API_URL}/chat/conversations/${userId}`
      );

      // Find existing conversation or create a new one
      const existingConv = get().conversations.find(
        (c) => c.user.id === userId
      );
      const conversation: Conversation = existingConv || {
        id: `conv_${userId}`, // Temporary ID
        user: response.data.user,
        unreadCount: 0,
      };

      set({
        messages: response.data.messages,
        currentConversation: conversation,
        loading: false,
      });

      // Mark unread messages as read
      if (existingConv?.unreadCount) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.user.id === userId ? { ...c, unreadCount: 0 } : c
          ),
        }));

        // Mark messages as read on the server
        response.data.messages
          .filter((m) => !m.read && m.senderId === userId)
          .forEach((m) => get().markMessageAsRead(m.id));
      }
    } catch (error) {
      console.log("error", error);
      set({
        error: "Failed to fetch messages",
        loading: false,
      });
    }
  },

  sendMessage: async (receiverId: string, content: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw new Error("You must be logged in to send messages");
    }

    try {
      const response = await axios.post<Message>(`${API_URL}/chat/messages`, {
        receiverId,
        content,
      });

      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  markMessageAsRead: async (messageId: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      await axios.post(`${API_URL}/chat/messages/${messageId}/read`);

      // Update the local message status
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, read: true } : m
        ),
      }));
    } catch (error) {
      console.error("Failed to mark message as read", error);
    }
  },

  isUserOnline: (userId: string) => {
    return get().onlineUsers.includes(userId);
  },

  clearError: () => {
    set({ error: null });
  },
}));

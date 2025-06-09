"use client";

import { create } from "zustand";
import axios, { type AxiosError } from "axios";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./useAuthStore";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Configure axios to always send cookies
axios.defaults.withCredentials = true;

// Error Interfaces
export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

interface ConversationApiResponse {
  id?: string;
  user: {
    id: string;
    username: string;
    email?: string;
    password?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  lastMessage?: {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    timestamp: string;
    __v?: number;
  };
  unreadCount?: number;
}

interface SocketError {
  message: string;
  type?: string;
  description?: string;
}

interface ChatError {
  message: string;
  code?: string | number;
  type?: "network" | "auth" | "validation" | "server" | "socket";
}

// Main Types
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
}

// Socket Event Types
interface UserStatusEvent {
  userId: string;
  status: "online" | "offline";
}

interface TypingEvent {
  userId: string;
  isTyping: boolean;
}

interface ChatState {
  socket: Socket | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: string[];
  typingUsers: string[];
  loading: boolean;
  error: ChatError | null;

  // Socket actions
  connectSocket: () => void;
  disconnectSocket: () => void;
  emitTyping: (receiverId: string) => void;

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

// Utility function to create standardized errors
const createChatError = (
  message: string,
  type: ChatError["type"] = "server",
  code?: string | number
): ChatError => ({
  message,
  type,
  code,
});

// Utility function to handle axios errors
const handleAxiosError = (error: unknown): ChatError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (axiosError.response) {
      return createChatError(
        axiosError.response.data?.message || axiosError.message,
        axiosError.response.status === 401 ? "auth" : "server",
        axiosError.response.status
      );
    } else if (axiosError.request) {
      return createChatError(
        "Network error - no response from server",
        "network"
      );
    } else {
      return createChatError(axiosError.message, "network");
    }
  } else if (error instanceof Error) {
    return createChatError(error.message, "server");
  } else {
    return createChatError("An unknown error occurred", "server");
  }
};

// Utility function to handle socket errors
const handleSocketError = (error: unknown): ChatError => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const socketError = error as SocketError;
    return createChatError(
      socketError.message || "Socket connection error",
      "socket"
    );
  } else if (typeof error === "string") {
    return createChatError(error, "socket");
  } else {
    return createChatError("Socket connection error", "socket");
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: [],
  typingUsers: [],
  loading: false,
  error: null,

  connectSocket: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      const socket = io(API_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("Socket connected");
        set({ error: null });
      });

      socket.on("newMessage", (message: Message) => {
        const { conversations, currentConversation } = get();
        console.log("conversation is ", conversations);

        if (
          currentConversation &&
          (message.senderId === currentConversation.user.id ||
            message.receiverId === currentConversation.user.id)
        ) {
          set((state) => ({
            messages: [...state.messages, message],
          }));

          if (message.senderId === currentConversation.user.id) {
            get()
              .markMessageAsRead(message._id)
              .catch((error) => {
                console.error("Failed to mark message as read:", error);
              });
          }
        }

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

      socket.on("userStatus", (data: UserStatusEvent) => {
        const { userId, status } = data;
        console.log(`User ${userId} is now ${status}`);

        set((state) => ({
          onlineUsers:
            status === "online"
              ? [...state.onlineUsers.filter((id) => id !== userId), userId]
              : state.onlineUsers.filter((id) => id !== userId),
        }));
      });

      socket.on("typing", (data: TypingEvent) => {
        const { userId, isTyping } = data;
        set((state) => ({
          typingUsers: isTyping
            ? [...state.typingUsers.filter((id) => id !== userId), userId]
            : state.typingUsers.filter((id) => id !== userId),
        }));
      });

      socket.on("onlineUsers", (users: string[]) => {
        console.log("Online users:", users);
        set({ onlineUsers: users });
      });

      socket.on("error", (error: unknown) => {
        console.error("Socket error:", error);
        const chatError = handleSocketError(error);
        set({ error: chatError });
      });

      socket.on("disconnect", (reason: string) => {
        console.log("Socket disconnected:", reason);
        if (reason === "io server disconnect") {
          socket.connect();
        }
      });

      socket.on("connect_error", (error: unknown) => {
        console.error("Socket connection error:", error);
        const chatError = handleSocketError(error);
        set({
          error: chatError,
          socket: null,
        });
      });

      set({ socket });
    } catch (error) {
      console.error("Socket initialization error:", error);
      const chatError = handleSocketError(error);
      set({
        error: chatError,
        socket: null,
      });
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [], typingUsers: [] });
    }
  },

  emitTyping: (receiverId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit("typing", { receiverId, isTyping: true });
      setTimeout(() => {
        socket.emit("typing", { receiverId, isTyping: false });
      }, 3000);
    }
  },

  fetchConversations: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      set({ loading: true, error: null });

      const response = await axios.get<{
        success: boolean;
        conversations: ConversationApiResponse[];
        users: Record<string, User>;
      }>(`${API_URL}/chat/conversations`, {
        withCredentials: true,
      });

      const conversations: Conversation[] = response.data.conversations.map(
        (conv: ConversationApiResponse) => ({
          id: conv.id || `conv_${conv.user.id}`,
          user: {
            id: conv.user.id,
            username: conv.user.username,
            email: conv.user.email || "",
          },
          lastMessage: conv.lastMessage
            ? {
                _id: conv.lastMessage._id,
                senderId: conv.lastMessage.senderId,
                receiverId: conv.lastMessage.receiverId,
                content: conv.lastMessage.content,
                read: conv.lastMessage.read,
                timestamp: conv.lastMessage.timestamp,
              }
            : undefined,
          unreadCount: conv.unreadCount || 0,
        })
      );

      set({
        conversations,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);

      const chatError = handleAxiosError(error);
      set({
        error: chatError,
        loading: false,
      });

      if (chatError.code === 401) {
        useAuthStore.getState().logout();
      }
    }
  },

  fetchMessages: async (userId: string) => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || !user) return;
    // const loggedUserId = user?.id || null;

    try {
      set({ loading: true, error: null });

      // Fetch messages for the specific user conversation
      const response = await axios.get<{ messages: Message[] }>(
        `${API_URL}/chat/conversations/${userId}`,
        {
          withCredentials: true,
        }
      );

      const existingConv = get().conversations.find(
        (c) => c.user.id === userId
      );
      const conversation: Conversation = existingConv || {
        id: `conv_${userId}`,
        user: {
          id: userId,
          username: "Unknown", // Fallback, ideally fetched from users object or another endpoint
          email: "",
        },
        unreadCount: 0,
      };

      set({
        messages: response.data.messages,
        currentConversation: conversation,
        loading: false,
      });

      if (existingConv?.unreadCount) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.user.id === userId ? { ...c, unreadCount: 0 } : c
          ),
        }));

        const unreadMessages = response.data.messages.filter(
          (m) => !m.read && m.senderId === userId
        );

        for (const message of unreadMessages) {
          try {
            await get().markMessageAsRead(message._id);
          } catch (error) {
            console.error(
              `Failed to mark message ${message._id} as read:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);

      const chatError = handleAxiosError(error);
      set({
        error: chatError,
        loading: false,
      });

      if (chatError.code === 401) {
        useAuthStore.getState().logout();
      }
    }
  },

  sendMessage: async (receiverId: string, content: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw createChatError("You must be logged in to send messages", "auth");
    }

    try {
      const response = await axios.post<Message>(
        `${API_URL}/chat/messages`,
        {
          receiverId,
          content,
        },
        {
          withCredentials: true,
        }
      );

      const message = response.data;
      const { currentConversation } = get();

      if (currentConversation && currentConversation.user.id === receiverId) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      }

      set((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv.user.id === receiverId) {
            return {
              ...conv,
              lastMessage: message,
            };
          }
          return conv;
        }),
      }));

      return response.data;
    } catch (error) {
      console.error("Failed to send message:", error);

      const chatError = handleAxiosError(error);
      set({ error: chatError });

      if (chatError.code === 401) {
        useAuthStore.getState().logout();
      }

      throw chatError;
    }
  },

  markMessageAsRead: async (messageId: string) => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      await axios.post(
        `${API_URL}/chat/messages/${messageId}/read`,
        {},
        {
          withCredentials: true,
        }
      );

      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, read: true } : m
        ),
      }));
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      const chatError = handleAxiosError(error);

      if (chatError.code === 401) {
        useAuthStore.getState().logout();
      }
    }
  },

  isUserOnline: (userId: string) => {
    return get().onlineUsers.includes(userId);
  },

  clearError: () => {
    set({ error: null });
  },
}));

export const initializeChat = () => {
  const { isAuthenticated } = useAuthStore.getState();
  const { connectSocket, fetchConversations } = useChatStore.getState();

  if (isAuthenticated) {
    connectSocket();
    fetchConversations();
  }
};

export const cleanupChat = () => {
  const { disconnectSocket } = useChatStore.getState();

  disconnectSocket();

  useChatStore.setState({
    conversations: [],
    currentConversation: null,
    messages: [],
    onlineUsers: [],
    typingUsers: [],
    loading: false,
    error: null,
  });
};

export type { ChatError, SocketError };

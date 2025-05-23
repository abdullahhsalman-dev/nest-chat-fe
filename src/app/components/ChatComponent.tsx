"use client";

import { useEffect, useRef, useState, KeyboardEvent, FormEvent } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore, Message } from "../stores/useChatStore";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import { FiSend, FiLogOut, FiUser } from "react-icons/fi"; // Icons for better UX

export default function ChatComponent() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    isUserOnline,
    connectSocket,
    typingUsers,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    connectSocket();
    fetchConversations();
    return () => {
      useChatStore.getState().disconnectSocket();
    };
  }, [connectSocket, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Emit typing status
    if (isTyping && currentConversation) {
      useChatStore.getState().emitTyping(currentConversation.user.id);
    }
  }, [isTyping, currentConversation]);

  const handleSelectConversation = (userId: string) => {
    fetchMessages(userId);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation) return;
    try {
      await sendMessage(currentConversation.user.id, messageInput);
      setMessageInput("");
      setIsTyping(false);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
    setIsTyping(true);
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, yyyy h:mm a");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((groups: Record<string, Message[]>, message) => {
      const date = message.createdAt
        ? format(
            typeof message.createdAt === "string"
              ? parseISO(message.createdAt) // Parse ISO string if it's a string
              : new Date(message.createdAt), // Use directly if it's a Date object
            "yyyy-MM-dd"
          )
        : "N/A";
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
      return groups;
    }, {});
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white shadow-lg flex flex-col transition-all duration-300 md:w-64 sm:w-full sm:max-w-[80%] sm:absolute sm:z-10">
        <div className="p-4 flex justify-between items-center border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h2 className="text-lg font-bold">{user?.username || "Chat"}</h2>
          <button
            onClick={logout}
            className="text-sm px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2"
            aria-label="Logout"
          >
            <FiLogOut />
            Logout
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex justify-center items-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <p className="text-center text-gray-500 mt-4">No conversations</p>
          )}
          <AnimatePresence>
            {!loading &&
              conversations.map((convo) => (
                <motion.div
                  key={convo.user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSelectConversation(convo.user.id)}
                  className={`cursor-pointer p-4 hover:bg-gray-100 flex items-center gap-3 transition-colors ${
                    currentConversation?.user.id === convo.user.id
                      ? "bg-blue-50"
                      : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      handleSelectConversation(convo.user.id);
                  }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                      {convo.user.username.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(convo.user.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold truncate">
                        {convo.user.username}
                      </h4>
                      {convo.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(convo.lastMessage.createdAt), "p")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {convo.lastMessage?.content || "No messages yet"}
                    </div>
                  </div>
                  {convo.unreadCount > 0 && (
                    <div className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                      {convo.unreadCount}
                    </div>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <div className="p-4 border-b bg-white shadow-sm flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {currentConversation.user.username.charAt(0).toUpperCase()}
                </div>
                {isUserOnline(currentConversation.user.id) && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {currentConversation.user.username}
                </h3>
                <p className="text-xs text-gray-500">
                  {isUserOnline(currentConversation.user.id)
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  No messages. Start chatting!
                </div>
              ) : (
                <AnimatePresence>
                  {Object.entries(groupMessagesByDate(messages)).map(
                    ([date, grouped]) => (
                      <div key={date} className="mb-4">
                        <div className="text-center text-xs text-gray-500 bg-gray-200 rounded-full px-3 py-1 mx-auto w-fit">
                          {date
                            ? format(
                                typeof date === "string"
                                  ? parseISO(date)
                                  : new Date(date),
                                "MMMM d, yyyy"
                              )
                            : "N/A"}
                        </div>
                        {grouped.map((msg) => {
                          const isOwn = msg.senderId === user?.id;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`mb-3 flex ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                                  isOwn
                                    ? "bg-blue-600 text-white"
                                    : "bg-white border text-gray-900"
                                }`}
                              >
                                <div className="text-sm">{msg.content}</div>
                                <div className="text-xs mt-1 text-right opacity-75">
                                  {formatMessageDate(msg.createdAt)}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )
                  )}
                </AnimatePresence>
              )}
              {typingUsers.includes(currentConversation.user.id) && (
                <div className="flex justify-start mb-3">
                  <div className="bg-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-600">
                    <span className="animate-pulse">Typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t flex gap-2 items-center"
            >
              <textarea
                rows={1}
                className="flex-1 border rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                aria-label="Message input"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  messageInput.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
                aria-label="Send message"
              >
                <FiSend />
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-center">
            <div>
              <FiUser className="mx-auto text-4xl mb-2" />
              <p className="text-lg font-medium">No conversation selected</p>
              <p className="text-sm">
                Choose a user from the sidebar to begin chatting.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

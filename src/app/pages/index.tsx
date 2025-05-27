import { useEffect, useRef, useState, KeyboardEvent, FormEvent } from "react";
import { format } from "date-fns";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore, Message } from "../stores/useChatStore";

export default function ChatPage() {
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
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (userId: string) => {
    fetchMessages(userId);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !currentConversation) return;

    try {
      await sendMessage(currentConversation.user.id, messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format date for messages
  const formatMessageDate = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  // Group messages by date for better UI organization
  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((groups: Record<string, Message[]>, message) => {
      const date = format(new Date(message.createdAt), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversations */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{user?.username || "Chat"}</h2>
          <button
            onClick={logout}
            className="px-3 py-1 bg-gray-200 rounded-md text-gray-700 text-sm hover:bg-gray-300"
          >
            Logout
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading conversations...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">No conversations yet</div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.user.id}
                onClick={() => handleSelectConversation(conversation.user.id)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center ${
                  currentConversation?.user.id === conversation.user.id
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-700">
                      {conversation.user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Online indicator */}
                  {isUserOnline(conversation.user.id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.user.username}
                    </h3>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-500">
                        {format(
                          new Date(conversation.lastMessage.createdAt),
                          "h:mm a"
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage?.content || "No messages yet"}
                    </p>

                    {conversation.unreadCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        {currentConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-md font-semibold text-gray-700">
                    {currentConversation.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Online indicator */}
                {isUserOnline(currentConversation.user.id) && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentConversation.user.username}
                </h3>
                <p className="text-sm text-gray-500">
                  {isUserOnline(currentConversation.user.id)
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">
                    No messages yet. Start a conversation!
                  </div>
                </div>
              ) : (
                Object.entries(groupMessagesByDate(messages)).map(
                  ([date, dateMessages]) => (
                    <div key={date} className="mb-6">
                      <div className="flex justify-center mb-4">
                        <div className="bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-700">
                          {format(new Date(date), "MMMM d, yyyy")}
                        </div>
                      </div>

                      {dateMessages.map((message) => {
                        const isOwn = message.senderId === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`mb-4 flex ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                                isOwn
                                  ? "bg-blue-600 text-white rounded-br-none"
                                  : "bg-white text-gray-800 rounded-bl-none"
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                              <div
                                className={`text-xs mt-1 flex items-center ${
                                  isOwn
                                    ? "text-blue-200 justify-end"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatMessageDate(message.createdAt)}
                                {isOwn && (
                                  <span className="ml-1">
                                    {message.read ? (
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9 5.173l1.414-1.414 6.364 6.364-1.414 1.414L9 5.173zM7.5 9.914L3.914 6.328l-1.414 1.414 3.586 3.586 1.414-1.414z" />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )
              )}

              {/* Auto-scroll reference element */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center">
                <textarea
                  className="flex-1 border border-gray-300 rounded-lg resize-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type a message..."
                  rows={1}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className={`ml-2 rounded-full p-2 ${
                    messageInput.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    ></path>
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                ></path>
              </svg>
              <h3 className="mt-2 text-xl font-medium text-gray-900">
                No conversation selected
              </h3>
              <p className="mt-1 text-gray-500">
                Choose a conversation from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

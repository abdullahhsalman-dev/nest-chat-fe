"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { format, isToday, isYesterday, parseISO, isValid } from "date-fns";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore, type User, type Message } from "../stores/useChatStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiLogOut,
  FiUser,
  FiMenu,
  FiX,
  FiSearch,
  FiMoreVertical,
  FiPhone,
  FiVideo,
  FiPaperclip,
  FiSmile,
  FiCheck,
  FiCheckCircle,
  FiSettings,
  FiEdit3,
  FiAlertCircle,
  FiUserPlus,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface AllUser {
  id: string;
  username: string;
  email: string;
}

export default function ChatComponent() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    isUserOnline,
    connectSocket,
    disconnectSocket,
    typingUsers,
    emitTyping,
    clearError,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // New states for user modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    connectSocket();
    fetchConversations();
    return () => {
      disconnectSocket();
    };
  }, [connectSocket, fetchConversations, disconnectSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isTyping && currentConversation) {
      emitTyping(currentConversation.user.id);

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000);

      setTypingTimeout(timeout);
    }

    // Cleanup function
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [isTyping, currentConversation, emitTyping]); // Remove typingTimeout from dependencies

  // Add this new useEffect after the existing ones
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, []);

  // Fetch all users function
  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(`${API_URL}/auth/users`, {
        withCredentials: true,
      });

      // Filter out current user from the list
      const filteredUsers: AllUser[] = response.data.users.filter(
        (u: User) => u.id !== user?.id
      );
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle opening user modal
  const handleOpenUserModal = () => {
    setIsUserModalOpen(true);
    fetchAllUsers();
  };

  // Handle starting conversation with a user
  const handleStartConversation = async (selectedUser: AllUser) => {
    console.log("------------------", selectedUser.id);

    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(
        (conv) => conv.user.id === selectedUser.id
      );

      if (existingConversation) {
        // If conversation exists, just select it
        await handleSelectConversation(selectedUser.id);
      } else {
        console.log("------------------", selectedUser.id);
        // If no conversation exists, fetch messages (this will create the conversation)
        await fetchMessages(selectedUser.id);
      }

      setIsUserModalOpen(false);
      setUserSearchQuery("");

      toast({
        title: "Conversation started",
        description: `Started conversation with ${selectedUser.username}`,
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const handleSelectConversation = async (userId: string) => {
    try {
      await fetchMessages(userId);
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation) return;
    console.log("===================", currentConversation);

    try {
      await sendMessage(currentConversation.user.id, messageInput);
      setMessageInput("");
      setIsTyping(false);

      toast({
        title: "Message sent",
        description: `Message sent to ${currentConversation.user.username}`,
      });
    } catch (error) {
      console.error("Failed to send message", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }

    if (!isTyping) {
      setIsTyping(true);
    }
  };

  const formatMessageDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "N/A";
    const date =
      typeof dateInput === "string" ? parseISO(dateInput) : new Date(dateInput);
    if (!isValid(date)) return "N/A";
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, yyyy h:mm a");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    return messages.reduce((groups: Record<string, Message[]>, message) => {
      const dateInput = message.createdAt;
      if (!dateInput) {
        groups["N/A"] = groups["N/A"] || [];
        groups["N/A"].push(message);
        return groups;
      }
      const date =
        typeof dateInput === "string"
          ? parseISO(dateInput)
          : new Date(dateInput);
      if (!isValid(date)) {
        groups["N/A"] = groups["N/A"] || [];
        groups["N/A"].push(message);
        return groups;
      }
      const dateKey = format(date, "yyyy-MM-dd");
      groups[dateKey] = groups[dateKey] || [];
      groups[dateKey].push(message);
      return groups;
    }, {});
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <FiX /> : <FiMenu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`
        bg-card border-r flex flex-col w-80 
        fixed md:static h-full z-40 transition-transform duration-300
        ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }
      `}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messages</h1>
            <div className="flex gap-2">
              {/* New Chat Button */}
              <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenUserModal}
                  >
                    <FiEdit3 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Select a user to start messaging with
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Search Users */}
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Users List */}
                    <ScrollArea className="h-[300px]">
                      {loadingUsers ? (
                        <div className="flex justify-center items-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {userSearchQuery
                            ? "No users found"
                            : "No users available"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                              onClick={() => handleStartConversation(u)}
                            >
                              <Avatar>
                                <AvatarFallback>
                                  {u.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {u.username}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {u.email}
                                </p>
                              </div>
                              {isUserOnline(u.id) && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <FiMoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <FiSettings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <FiLogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mb-4 p-2 bg-muted rounded-lg">
            <Avatar>
              <AvatarFallback>
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <FiAlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2 h-auto p-0 text-xs"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading && conversations.length === 0 && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FiUserPlus className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">
                  {searchQuery
                    ? "No conversations found"
                    : "No conversations yet"}
                </p>
                <p className="text-xs mt-1">
                  Click the <FiEdit3 className="inline h-3 w-3" /> button to
                  start a new chat
                </p>
              </div>
            )}

            <AnimatePresence>
              {filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors mb-1
                    hover:bg-accent
                    ${
                      currentConversation?.user.id === conversation.user.id
                        ? "bg-accent"
                        : ""
                    }
                  `}
                  onClick={() => handleSelectConversation(conversation.user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                          {conversation.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(conversation.user.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">
                          {conversation.user.username}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatMessageDate(
                              conversation.lastMessage.createdAt
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.content ||
                            "No messages yet"}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>
                        {currentConversation.user.username
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(currentConversation.user.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      {currentConversation.user.username}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {isUserOnline(currentConversation.user.id)
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <FiPhone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <FiVideo className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <FiMoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {loading && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FiUser className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                  <p className="text-muted-foreground">
                    Start a conversation with{" "}
                    {currentConversation.user.username}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupMessagesByDate(messages)).map(
                    ([date, groupedMessages]) => (
                      <div key={date}>
                        <div className="flex justify-center mb-4">
                          <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                            {date === "N/A"
                              ? "Unknown Date"
                              : format(parseISO(date), "MMMM d, yyyy")}
                          </span>
                        </div>

                        <AnimatePresence>
                          {groupedMessages.map((message) => {
                            const isOwn = message.senderId === user?.id;
                            return (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex mb-4 ${
                                  isOwn ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={`
                                max-w-[70%] px-4 py-2 rounded-2xl
                                ${
                                  isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }
                              `}
                                >
                                  <p className="text-sm">{message.content}</p>
                                  <div
                                    className={`
                                  flex items-center gap-1 mt-1 text-xs
                                  ${
                                    isOwn
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  }
                                `}
                                  >
                                    <span>
                                      {formatMessageDate(message.createdAt)}
                                    </span>
                                    {isOwn &&
                                      (message.read ? (
                                        <FiCheckCircle className="h-3 w-3" />
                                      ) : (
                                        <FiCheck className="h-3 w-3" />
                                      ))}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )
                  )}

                  {typingUsers.includes(currentConversation.user.id) && (
                    <div className="flex justify-start">
                      <div className="bg-muted px-4 py-2 rounded-2xl">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Button type="button" variant="ghost" size="icon">
                  <FiPaperclip className="h-4 w-4" />
                </Button>

                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[40px] max-h-32 resize-none pr-12"
                    rows={1}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <FiSmile className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={!messageInput.trim()}
                  size="icon"
                >
                  <FiSend className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FiUser className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Select a conversation
              </h2>
              <p className="text-muted-foreground mb-4">
                Choose a conversation from the sidebar to start messaging
              </p>
              <Button onClick={handleOpenUserModal} variant="outline">
                <FiUserPlus className="mr-2 h-4 w-4" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { format, isToday, isYesterday, isValid } from "date-fns";

import {
  FiSearch,
  FiUserPlus,
  FiEdit3,
  FiSettings,
  FiLogOut,
  FiMoreVertical,
  FiAlertCircle,
} from "react-icons/fi";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UserModal from "./UserModal";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  const { user, logout } = useAuthStore();
  const {
    conversations,
    currentConversation,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    isUserOnline,
    clearError,
  } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (userId: string) => {
    try {
      await fetchMessages(userId);
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const formatMessageDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "N/A";
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (!isValid(date)) return "N/A";
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, yyyy h:mm a");
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsUserModalOpen(true)}
            >
              <FiEdit3 className="h-4 w-4" />
            </Button>
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
                Click the <FiEdit3 className="inline h-3 w-3" /> button to start
                a new chat
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
                        {conversation.lastMessage?.content || "No messages yet"}
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

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        onSelectUser={handleSelectConversation}
      />
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FiSearch } from "react-icons/fi";
import { useChatStore } from "../stores/useChatStore";

interface AllUser {
  id: string;
  username: string;
  email: string;
}

interface UserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function UserModal({
  isOpen,
  onOpenChange,
  onSelectUser,
}: UserModalProps) {
  const { conversations, fetchMessages, isUserOnline } = useChatStore();
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    }
  }, [isOpen]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(`${API_URL}/auth/users`, {
        withCredentials: true,
      });
      setAllUsers(response.data.users);
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

  const handleStartConversation = async (selectedUser: AllUser) => {
    try {
      const existingConversation = conversations.find(
        (conv) => conv.user.id === selectedUser.id
      );

      if (existingConversation) {
        onSelectUser(selectedUser.id);
      } else {
        await fetchMessages(selectedUser.id);
      }

      onOpenChange(false);
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

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                {userSearchQuery ? "No users found" : "No users available"}
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
                      <p className="font-medium truncate">{u.username}</p>
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
  );
}

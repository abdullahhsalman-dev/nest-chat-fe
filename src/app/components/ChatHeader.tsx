"use client";

import { useChatStore } from "../stores/useChatStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FiPhone, FiVideo, FiMoreVertical } from "react-icons/fi";

export default function ChatHeader() {
  const { currentConversation, isUserOnline } = useChatStore();

  if (!currentConversation) return null;

  return (
    <div className="p-4 border-b bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar>
              <AvatarFallback>
                {currentConversation.user.username.charAt(0).toUpperCase()}
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
              {isUserOnline(currentConversation.user.id) ? "Online" : "Offline"}
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
  );
}

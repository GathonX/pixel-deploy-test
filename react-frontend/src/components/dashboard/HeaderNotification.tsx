
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderNotificationProps {
  isMobile: boolean;
}

export function HeaderNotification({ isMobile }: HeaderNotificationProps) {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    </Button>
  );
}

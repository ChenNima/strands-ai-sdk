"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "./ui/button";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="p-2 flex flex-row gap-2 justify-between items-center border-b">
      <Link href="/chat">
        <h1 className="text-lg font-semibold">Strands AI SDK</h1>
      </Link>
      
      {isAuthenticated && user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <User className="mr-2 h-4 w-4" />
              {user.profile?.name || user.profile?.email || 'User'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.profile?.email && (
              <>
                <DropdownMenuLabel className="font-normal text-sm text-muted-foreground">
                  {user.profile.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

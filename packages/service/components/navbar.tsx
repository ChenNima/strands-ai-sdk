"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("navbar");
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="p-2 flex flex-row gap-2 justify-between items-center border-b">
      <Link href="/chat">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
      </Link>

      {isAuthenticated && user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <User className="mr-2 h-4 w-4" />
              {user.profile?.name || user.profile?.email || t("user")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
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
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

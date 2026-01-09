"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";

export const Navbar = () => {
  const t = useTranslations();

  return (
    <div className="p-2 flex flex-row gap-2 justify-between items-center border-b">
      <Link href="/chat">
        <h1 className="text-lg font-semibold">{t("navbar.title")}</h1>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AuthButton />
      </div>
    </div>
  );
};

"use client";

import { LogOutIcon, SettingsIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Account menu in the header. There are no accounts until authentication (task 04), so it
 * shows a generic avatar and sign-out is disabled.
 */
function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="grid size-10 cursor-pointer place-content-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-raised transition-[color,box-shadow,scale] duration-200 outline-none hover:text-foreground hover:shadow-floating focus-visible:ring-4 focus-visible:ring-ring/30 active:scale-95 data-popup-open:text-foreground"
      >
        <UserRoundIcon aria-hidden className="size-[1.125rem]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu };

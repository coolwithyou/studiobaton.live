"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarClient } from "./sidebar-client";
import type { MenuSection } from "./sidebar";

interface MobileNavProps {
  sections: MenuSection[];
}

export function MobileNav({ sections }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="lg:hidden sticky top-14 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 min-h-[44px] min-w-[44px]">
              <Menu className="h-5 w-5" />
              <span>메뉴</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>메뉴</SheetTitle>
              <SheetDescription className="sr-only">
                사이트 탐색 메뉴
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-60px)] px-4">
              <SidebarClient
                sections={sections}
                onLinkClick={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

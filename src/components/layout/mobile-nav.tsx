"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Navigation">
      <nav className="flex flex-col gap-4">
        <Link
          href="/"
          onClick={onClose}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 border-b border-border/50"
        >
          Catalogue
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 border-b border-border/50"
        >
          New Arrivals
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 border-b border-border/50"
        >
          Best Sellers
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 border-b border-border/50"
        >
          Fragrance Finder
        </Link>
        <Link
          href="/account/participation"
          onClick={onClose}
          className="text-sm font-medium text-foreground hover:text-accent transition-colors py-2 border-b border-border/50"
        >
          Rewards &amp; Participation
        </Link>
      </nav>
    </Drawer>
  );
}
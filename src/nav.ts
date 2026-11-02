import type { NavItem } from "@kit";

export const BRAND = {
  name: "Umakes.cloud",
  url: "https://umakes.cloud",
  email: "umakescloud@gmail.com",
};

export const PERSONA = {
  name: "Tessa Brannigan",
  role: "Medical records specialist",
};

export const PRACTICE = {
  name: "Larkfield Injury & Spine Group",
  type: "Injury-first multi-specialty practice: orthopedics, spine, interventional pain, physiatry and physical therapy, paid mostly through PIP, letters of protection and workers' comp",
};

export const NAV: NavItem[] = [
  { label: "Start here", to: "/" },
  { label: "Requests", to: "/requests" },
  { label: "Exceptions", to: "/exceptions" },
  { label: "Release review", to: "/approvals" },
  { label: "Costs", to: "/costs" },
  { label: "How it works", to: "/architecture" },
];

import type { Icon } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconFolders,
  IconUsers,
  IconSettings,
  IconListCheck,
  IconEye,
  IconSitemap,
  IconTicket,
} from "@tabler/icons-react";

export type ViewerRole =
  | "org_admin"
  | "project_manager"
  | "technical_lead"
  | "member"
  | "client"
  | "super_user";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const DASHBOARD: NavItem = { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard };
const PROJECTS: NavItem = { href: "/projects", label: "Projects", icon: IconFolders };
const RESOURCES: NavItem = { href: "/resources", label: "Resources", icon: IconUsers };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: IconSettings };
const ARCHITECTURE: NavItem = { href: "/architecture", label: "Architecture", icon: IconSitemap };
const MY_WORK: NavItem = { href: "/my-work", label: "My work", icon: IconListCheck };
const CLIENT_VIEW: NavItem = { href: "/client", label: "Project status", icon: IconEye };
const MY_TICKETS: NavItem = { href: "/my-tickets", label: "My tickets", icon: IconTicket };

export const NAV_BY_ROLE: Record<ViewerRole, NavItem[]> = {
  org_admin: [DASHBOARD, PROJECTS, RESOURCES, SETTINGS, ARCHITECTURE],
  project_manager: [DASHBOARD, PROJECTS, RESOURCES, SETTINGS, ARCHITECTURE],
  technical_lead: [DASHBOARD, PROJECTS, RESOURCES, SETTINGS, ARCHITECTURE],
  member: [MY_WORK],
  client: [CLIENT_VIEW],
  super_user: [MY_TICKETS],
};

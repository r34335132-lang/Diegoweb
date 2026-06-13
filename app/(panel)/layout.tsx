import { DashboardShell } from "@/components/dashboard-shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

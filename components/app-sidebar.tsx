"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Brain, CreditCard, Globe, Home, Map, PiggyBank, Receipt, Settings, User, Banknote, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/context/AuthContext"
import useUserSettings from "@/hooks/use-user-settings"
import { Button } from "@/components/ui/button"

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { settings } = useUserSettings()
  
  const displayName = settings?.displayName || user?.displayName || user?.email?.split("@")[0] || "User"
  
  // Create initials from display name
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  const mainNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Transactions",
      href: "/dashboard/transactions",
      icon: CreditCard,
    },
    {
      title: "Currencies",
      href: "/dashboard/currencies", 
      icon: Banknote,
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
    },
  ]

  const nomadNavItems = [
    {
      title: "Locations",
      href: "/dashboard/location",
      icon: Map,
    },
    {
      title: "COL Planner",
      href: "/dashboard/col-planner",
      icon: Globe,
    },
    {
      title: "Budget Insights",
      href: "/dashboard/budget-insights",
      icon: Brain,
    },
  ]

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="flex flex-col items-center justify-center py-4">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-full blur-sm opacity-75 pulse-glow"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-background rounded-full border border-primary/20">
                <span className="text-primary font-bold text-lg">S</span>
              </div>
            </div>
            <span className="font-bold text-xl">SpendX</span>
          </div>
        </div>
      </SidebarHeader>
      <div className="px-2 md:hidden">
        <SidebarTrigger className="w-full h-9 justify-between rounded-md px-3">
          <span>Menu</span>
        </SidebarTrigger>
      </div>
      <SidebarSeparator />
      <SidebarContent className="px-1.5">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)} 
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Nomad Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nomadNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)} 
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Settings" 
                  isActive={pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/")}
                >
                  <Link href="/dashboard/settings">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <div className="p-3 flex items-center gap-3">
          <Avatar>
            <AvatarImage src={settings?.avatar || user?.photoURL || `https://ui-avatars.com/api/?name=${displayName}`} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium leading-none truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-8 w-8"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

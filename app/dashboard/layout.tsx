"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { Menu, Bell, Settings, Search } from 'lucide-react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="space-y-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen max-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 
          transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 transition-transform duration-300 ease-in-out
        `}>
        <AppSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full min-w-0">
          {/* Header */}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 dark:text-gray-300 lg:hidden hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">
                Dashboard
              </h1>
            </div>

            {/* Center Section - Search */}
            <div className={`
              absolute left-0 right-0 top-0 bg-white dark:bg-gray-800 px-4 
              transition-all duration-300 ease-in-out
              ${isSearchOpen ? 'opacity-100 h-16 z-50' : 'opacity-0 h-0 -z-10'}
              lg:static lg:opacity-100 lg:h-auto lg:z-auto lg:w-1/3 lg:mx-4
            `}>
              <div className="relative h-full flex items-center">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-10 px-4 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 
                           bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3 md:space-x-4">
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-gray-600 dark:text-gray-300 lg:hidden hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
              
              <button className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              
              <button className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings className="h-5 w-5" />
              </button>

              {user && (
                <div className="flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                  <div className="relative group">
                    <button className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white 
                                    ring-2 ring-white dark:ring-gray-800 transition-transform hover:scale-105">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:inline-block">
                        {user.email}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 transition-all duration-200">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Breadcrumb */}
              <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                <ol className="list-none p-0 inline-flex">
                  <li className="flex items-center">
                    <span>Dashboard</span>
                    <svg className="h-4 w-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                  <li>Overview</li>
                </ol>
              </nav>

              {/* Content Container */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 
                            transition-all duration-200 hover:shadow-md">
                <div className="p-4 md:p-6 lg:p-8">
            {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
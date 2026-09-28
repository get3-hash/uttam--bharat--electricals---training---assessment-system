import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useGoogleSheetsAutoSync } from "../context/GoogleSheetsAutoSyncContext";
import { CompanyLogo } from "./CompanyLogo";
import {
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  BarChart3,
  LogOut,
  LogIn,
  PlusCircle,
  QrCode,
  Settings,
  Sun,
  Moon
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { isAdmin, logout, currentAdmin, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAutoSyncEnabled, secondsRemaining } = useGoogleSheetsAutoSync();
  const location = useLocation();
  const navigate = useNavigate();

  const isEmployeeFlow = location.pathname.startsWith("/employee/");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Trainings", path: "/admin/trainings", icon: BookOpen },
    { label: "New Training", path: "/admin/create-training", icon: PlusCircle },
    { label: "Reports", path: "/admin/reports", icon: FileSpreadsheet },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { label: "Settings", path: "/admin/settings", icon: Settings }
  ];

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 sticky top-0 z-40 shadow-xs dark:shadow-lg transition-colors">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0 shrink-0">
            <Link
              to={isEmployeeFlow ? location.pathname : (isAdmin ? "/admin/dashboard" : "/")}
              className="flex items-center gap-2 sm:gap-2.5 group shrink-0"
            >
              <div className="bg-slate-50 dark:bg-slate-800/90 px-2 py-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700/50 flex items-center shrink-0 group-hover:scale-105 transition-transform">
                <CompanyLogo variant="compact" darkBg={theme === "dark"} />
              </div>
              <div className="hidden sm:flex flex-col justify-center border-l border-slate-200 dark:border-slate-800 pl-2.5 shrink-0">
                <h1 className="text-slate-900 dark:text-white font-bold text-xs leading-tight uppercase tracking-wide whitespace-nowrap">
                  Uttam (Bharat) Electricals
                </h1>
                <p className="hidden 2xl:block text-blue-600 dark:text-blue-400 text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
                  Power & Distribution Transformers
                </p>
              </div>
            </Link>

            {/* In Employee Assessment Flow, show active flow badge and optional Exit button */}
            {isEmployeeFlow ? (
              <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 whitespace-nowrap">
                  Employee Training & Assessment Portal
                </span>
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 whitespace-nowrap"
                  >
                    ← Exit to Admin Dashboard
                  </Link>
                )}
              </div>
            ) : (
              /* Desktop Navigation Links - Shown on 2xl screens to avoid crowding with right controls */
              isAdmin && (
                <div className="hidden 2xl:flex items-center gap-1.5 shrink-0 ml-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                          isActive
                            ? "bg-active-bg text-active-text shadow-sm shadow-blue-500/25"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Right Action Controls: Theme Switcher, Auto-Sync Status, Admin State, Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {!isAdmin ? (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all shrink-0 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Admin Login
              </Link>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {isAutoSyncEnabled && (
                  <Link
                    to="/admin/settings"
                    title={`Google Sheets Auto-Sync is ON (10 min). Next sync in ${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s`}
                    className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Sheets Auto-Sync</span>
                  </Link>
                )}
                <Link
                  to="/admin/settings?tab=admins"
                  title={`Logged in as ${currentAdmin?.name || "Admin"} (${currentAdmin?.email || ""}) - ${isSuperAdmin ? "Super Admin" : "Admin"}`}
                  className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate max-w-[130px] font-bold">{currentAdmin?.name || "Admin"}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    {isSuperAdmin ? "(Super)" : ""}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/50 text-slate-700 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile, Tablet & Standard Laptop Submenu for Admin (Clean row, no overlap with header controls) */}
        {isAdmin && !isEmployeeFlow && (
          <div className="2xl:hidden flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 border-t border-slate-200 dark:border-slate-800/80 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all ${
                    isActive
                      ? "bg-active-bg text-active-text shadow-xs"
                      : "text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

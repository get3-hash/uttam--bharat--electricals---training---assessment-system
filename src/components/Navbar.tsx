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
    <nav className="bg-[#2B2A28] border-b border-[#403F3E] text-white sticky top-0 z-40 shadow-md transition-colors">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0 shrink-0">
            <Link to={isAdmin ? "/admin/dashboard" : "/"} className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="bg-[#403F3E] px-2 py-1 rounded-xl shadow-xs border border-[#52514E] flex items-center shrink-0 group-hover:scale-105 transition-transform">
                <CompanyLogo variant="compact" darkBg={true} />
              </div>
              <div className="hidden sm:flex flex-col justify-center border-l border-[#403F3E] pl-2.5 shrink-0">
                <h1 className="text-white font-bold text-xs leading-tight uppercase tracking-wide whitespace-nowrap">
                  Uttam (Bharat) Electricals
                </h1>
                <p className="hidden 2xl:block text-[#59B5E2] text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
                  Power & Distribution Transformers
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links - Shown on 2xl screens to avoid crowding with right controls */}
            {isAdmin && (
              <div className="hidden 2xl:flex items-center gap-1 shrink-0 ml-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? "bg-[#008DD2] text-white font-bold shadow-xs"
                          : "text-[#D5D4D4] hover:text-white hover:bg-[#403F3E]"
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

          {/* Right Action Controls: Theme Switcher, Auto-Sync Status, Admin State, Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl bg-[#403F3E] hover:bg-[#52514E] text-[#EAEAEA] border border-[#52514E] transition-all flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[#59B5E2]" />
              ) : (
                <Moon className="w-4 h-4 text-[#59B5E2]" />
              )}
            </button>

            {!isAdmin ? (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-white flex items-center gap-1.5 shadow-md shadow-[#008DD2]/20 transition-all shrink-0 whitespace-nowrap"
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
                    className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#403F3E] text-[#59B5E2] border border-[#52514E] shadow-xs hover:bg-[#52514E] transition-colors whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008DD2] animate-ping" />
                    <span>Sheets Auto-Sync</span>
                  </Link>
                )}
                <Link
                  to="/admin/settings?tab=admins"
                  title={`Logged in as ${currentAdmin?.name || "Admin"} (${currentAdmin?.email || ""}) - ${isSuperAdmin ? "Super Admin" : "Admin"}`}
                  className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#403F3E] text-white border border-[#52514E] hover:bg-[#52514E] transition-colors whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008DD2] animate-pulse shrink-0" />
                  <span className="truncate max-w-[130px] font-bold">{currentAdmin?.name || "Admin"}</span>
                  <span className="text-[10px] text-[#59B5E2] font-normal">
                    {isSuperAdmin ? "(Super)" : ""}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#403F3E] hover:bg-[#006393] text-[#EAEAEA] hover:text-white border border-[#52514E] transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile, Tablet & Standard Laptop Submenu for Admin (Clean row, no overlap with header controls) */}
        {isAdmin && (
          <div className="2xl:hidden flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 border-t border-[#403F3E] no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all ${
                    isActive
                      ? "bg-[#008DD2] text-white shadow-xs font-bold"
                      : "text-[#D5D4D4] bg-[#403F3E] hover:bg-[#52514E] hover:text-white border border-[#52514E]"
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

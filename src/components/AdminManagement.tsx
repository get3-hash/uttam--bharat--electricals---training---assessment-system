import React, { useState, useEffect } from "react";
import { AdminAccount, AdminRole } from "../types";
import { useAuth } from "../context/AuthContext";
import { GlassCard } from "./GlassCard";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCw,
  Search,
  Check,
  X
} from "lucide-react";

export const AdminManagement: React.FC = () => {
  const { currentAdmin, isSuperAdmin, refreshAdminSession } = useAuth();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Selected Target for Edit / Password / Delete
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);

  // Preset role titles for quick selection
  const ROLE_TITLE_PRESETS = [
    "Quality & Management Admin",
    "Training & Assessment Admin",
    "Quality Assurance Admin",
    "HR & Admin",
    "Plant Quality Admin",
    "Operations Admin",
    "Super Admin",
  ];

  // Form State: Add Admin
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [addRole, setAddRole] = useState<AdminRole>("admin");
  const [addRoleTitle, setAddRoleTitle] = useState("Quality & Management Admin");
  const [addStatus, setAddStatus] = useState<"active" | "inactive">("active");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Form State: Edit Admin
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("admin");
  const [editRoleTitle, setEditRoleTitle] = useState("Quality & Management Admin");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Quick Change Role Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTargetAdmin, setRoleTargetAdmin] = useState<AdminAccount | null>(null);
  const [changeRoleValue, setChangeRoleValue] = useState<AdminRole>("admin");
  const [changeRoleTitleValue, setChangeRoleTitleValue] = useState("Quality & Management Admin");
  const [changeRoleLoading, setChangeRoleLoading] = useState(false);
  const [changeRoleError, setChangeRoleError] = useState("");

  // Form State: Reset Password
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Delete Action State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/list");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
      } else {
        throw new Error(data.error || "Failed to load admin list.");
      }
    } catch (err: any) {
      console.error("Failed to fetch admins:", err);
      showToast("error", err.message || "Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Handler: Add New Admin
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!addName.trim()) {
      setAddError("Please enter the administrator's name.");
      return;
    }
    if (!addEmail.trim()) {
      setAddError("Please enter an email address or username.");
      return;
    }
    if (addPassword.length < 6) {
      setAddError("Password must be at least 6 characters long.");
      return;
    }
    if (addPassword !== addConfirmPassword) {
      setAddError("Passwords do not match. Please verify.");
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          confirmPassword: addConfirmPassword,
          role: addRole,
          roleTitle: addRoleTitle.trim(),
          status: addStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create administrator account.");
      }

      showToast("success", data.message || `Admin "${addName}" created successfully!`);
      setShowAddModal(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddConfirmPassword("");
      setAddRole("admin");
      setAddRoleTitle("Quality & Management Admin");
      setAddStatus("active");
      fetchAdmins();
    } catch (err: any) {
      setAddError(err.message || "Failed to create administrator.");
    } finally {
      setAddLoading(false);
    }
  };

  // Handler: Open Edit Modal
  const openEditModal = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditRole(admin.role);
    setEditRoleTitle(admin.roleTitle || (admin.role === "super_admin" ? "Super Admin" : "Quality & Management Admin"));
    setEditStatus(admin.status);
    setEditError("");
    setShowEditModal(true);
  };

  // Handler: Save Edit
  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setEditError("");

    if (!editName.trim()) {
      setEditError("Name cannot be empty.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email / Username cannot be empty.");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch("/api/admin/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": currentAdmin?.role || (isSuperAdmin ? "super_admin" : "admin"),
          "x-admin-email": currentAdmin?.email || "",
          "x-admin-id": currentAdmin?.id || "",
        },
        body: JSON.stringify({
          id: selectedAdmin.id,
          name: editName.trim(),
          email: editEmail.trim(),
          role: selectedAdmin.id === "super-admin-primary" ? "super_admin" : editRole,
          roleTitle: editRoleTitle.trim(),
          status: (selectedAdmin.role === "super_admin" || editRole === "super_admin") ? "active" : editStatus,
          requesterId: currentAdmin?.id,
          requesterEmail: currentAdmin?.email,
          requesterRole: currentAdmin?.role || (isSuperAdmin ? "super_admin" : "admin"),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update administrator.");
      }

      showToast("success", data.message || `Admin "${editName}" updated successfully.`);
      setShowEditModal(false);
      fetchAdmins();
      refreshAdminSession();
    } catch (err: any) {
      setEditError(err.message || "Failed to update admin.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handler: Open Quick Change Role Modal (Only Super Admin)
  const openRoleModal = (admin: AdminAccount) => {
    if (!isSuperAdmin) {
      showToast("error", "Access Denied: Only Super Admins are authorized to change administrator roles.");
      return;
    }
    setRoleTargetAdmin(admin);
    setChangeRoleValue(admin.role);
    setChangeRoleTitleValue(admin.roleTitle || (admin.role === "super_admin" ? "Super Admin" : "Quality & Management Admin"));
    setChangeRoleError("");
    setShowRoleModal(true);
  };

  // Handler: Submit Quick Change Role (Only Super Admin)
  const handleChangeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTargetAdmin) return;
    if (!isSuperAdmin) {
      setChangeRoleError("Access Denied: Only Super Admins can change roles.");
      return;
    }
    setChangeRoleError("");
    setChangeRoleLoading(true);

    try {
      const res = await fetch("/api/admin/change-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": currentAdmin?.role || (isSuperAdmin ? "super_admin" : "admin"),
          "x-admin-email": currentAdmin?.email || "",
          "x-admin-id": currentAdmin?.id || "",
        },
        body: JSON.stringify({
          id: roleTargetAdmin.id,
          role: changeRoleValue,
          roleTitle: changeRoleTitleValue.trim(),
          requesterId: currentAdmin?.id,
          requesterEmail: currentAdmin?.email,
          requesterRole: currentAdmin?.role || (isSuperAdmin ? "super_admin" : "admin"),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change admin role.");
      }

      showToast("success", data.message || `Role updated successfully.`);
      setShowRoleModal(false);
      fetchAdmins();
      refreshAdminSession();
    } catch (err: any) {
      setChangeRoleError(err.message || "Failed to change role.");
    } finally {
      setChangeRoleLoading(false);
    }
  };

  // Handler: Open Reset Password Modal
  const openResetPasswordModal = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setResetNewPass("");
    setResetConfirmPass("");
    setResetError("");
    setShowPasswordModal(true);
  };

  // Handler: Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setResetError("");

    if (resetNewPass.length < 6) {
      setResetError("New password must be at least 6 characters long.");
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setResetError("New passwords do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAdmin.id,
          newPassword: resetNewPass,
          confirmPassword: resetConfirmPass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password.");
      }

      showToast("success", data.message || `Password for "${selectedAdmin.name}" has been updated.`);
      setShowPasswordModal(false);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  // Handler: Toggle Active / Inactive Status
  const handleToggleStatus = async (admin: AdminAccount) => {
    if (admin.role === "super_admin") {
      showToast("error", "The Super Admin account cannot be deactivated.");
      return;
    }

    const nextStatus = admin.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change admin status.");
      }

      showToast("success", data.message || `Admin "${admin.name}" status updated to ${nextStatus.toUpperCase()}.`);
      fetchAdmins();
    } catch (err: any) {
      showToast("error", err.message || "Failed to toggle status.");
    }
  };

  // Handler: Open Delete Confirmation Modal
  const openDeleteModal = (admin: AdminAccount) => {
    if (admin.role === "super_admin") {
      showToast("error", "The primary Super Admin account cannot be deleted.");
      return;
    }
    setSelectedAdmin(admin);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Handler: Confirm Delete Admin
  const handleConfirmDelete = async () => {
    if (!selectedAdmin) return;
    if (selectedAdmin.role === "super_admin") {
      setDeleteError("Super Admin account cannot be deleted.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/delete/${selectedAdmin.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete admin.");
      }

      showToast("success", data.message || `Admin "${selectedAdmin.name}" has been removed.`);
      setShowDeleteModal(false);
      fetchAdmins();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete administrator.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered Admins
  const filteredAdmins = admins.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term) ||
      (a.username && a.username.toLowerCase().includes(term)) ||
      a.role.toLowerCase().includes(term)
    );
  });

  const activeCount = admins.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 border ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100"
              : "bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-600 text-rose-900 dark:text-rose-100"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main GlassCard Container */}
      <GlassCard className="p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-slate-800 shadow-md">
        {/* Header with Title and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                Multi-User Access Control
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                {activeCount} of {admins.length} Active
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Admin Accounts Management
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage authorized administrative logins, roles, credentials, and access statuses across the organization.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAdmins}
              title="Refresh list"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold flex items-center justify-center cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setAddError("");
                  setShowAddModal(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Add New Admin
              </button>
            )}
          </div>
        </div>

        {/* Search & Statistics Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, role..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 font-medium"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-center font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAdmins.length}</strong> admin accounts
          </div>
        </div>

        {/* Admins Table / Responsive List */}
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Loading admin accounts...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Admin Accounts Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm ? "No administrators match your search query." : "Click 'Add New Admin' to register a new administrator."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Admin Name</th>
                  <th className="py-3.5 px-4">Email / Username</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAdmins.map((admin) => {
                  const isSuper = admin.role === "super_admin";
                  const isActive = admin.status === "active";
                  const isCurrent = currentAdmin?.id === admin.id;

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200 dark:border-blue-700/50">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              {admin.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {admin.id.slice(0, 14)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email / Username */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-white">{admin.email}</span>
                          {admin.username && admin.username !== admin.email && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              @{admin.username}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge & Designation */}
                      <td className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => openRoleModal(admin)}
                            title="Click to Change Role (Super Admin only)"
                            className="flex flex-col gap-1 items-start text-left group cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-transparent hover:border-purple-300 dark:hover:border-purple-700/60 transition-all"
                          >
                            <div className="flex items-center gap-1.5">
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                                  <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  SUPER ADMIN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 shadow-xs">
                                  <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  ADMIN
                                </span>
                              )}
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold opacity-75 group-hover:opacity-100 underline decoration-dotted">
                                Change Role
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {admin.roleTitle || (isSuper ? "Super Admin" : "Quality & Management Admin")}
                            </span>
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                                <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                SUPER ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 shadow-xs">
                                <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                ADMIN
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {admin.roleTitle || (isSuper ? "Super Admin" : "Quality & Management Admin")}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 shadow-xs">
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(admin.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Role Button (Super Admin Only) */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => openRoleModal(admin)}
                              title="Change Role & Access Level (Super Admin only)"
                              className="px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Change Role</span>
                            </button>
                          )}

                          {/* Activate / Deactivate Toggle (Super Admin only, not self) */}
                          {isSuperAdmin && !isSuper && (
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              title={isActive ? "Deactivate Account" : "Activate Account"}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isActive
                                  ? "bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-900/50 text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 border-slate-200 dark:border-slate-700"
                                  : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                              }`}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}

                          {/* Reset Password */}
                          {(isSuperAdmin || isCurrent) && (
                            <button
                              onClick={() => openResetPasswordModal(admin)}
                              title="Reset Password"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Details */}
                          {(isSuperAdmin || isCurrent) && (
                            <button
                              onClick={() => openEditModal(admin)}
                              title="Edit Admin"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/50 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Admin (Super Admin only, never Super Admin self) */}
                          {isSuperAdmin && !isSuper && (
                            <button
                              onClick={() => openDeleteModal(admin)}
                              title="Delete Admin"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ============================================================== */}
      {/* MODAL 1: ADD NEW ADMIN */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Administrator</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Create an authorized admin account</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddAdminSubmit} className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Vikas Sharma"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Email / Username *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. vikas@uttambharat.com or vikas_admin"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Can be a full email address or unique login username.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Password * (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showAddPassword ? "text" : "password"}
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showAddConfirmPassword ? "text" : "password"}
                    required
                    value={addConfirmPassword}
                    onChange={(e) => setAddConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showAddConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection & Manual Custom Role Title */}
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Admin Role & Access Level *
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {addRole === "super_admin" ? "Super Admin Access" : "Standard Admin"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddRole("admin");
                      if (addRoleTitle === "Super Admin") setAddRoleTitle("Quality & Management Admin");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addRole === "admin"
                        ? "bg-active-soft-bg border-active-bg text-slate-900 dark:text-white ring-2 ring-blue-500/50 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Admin
                      </span>
                      {addRole === "admin" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Standard access to trainings, tests & reports
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddRole("super_admin");
                      if (addRoleTitle === "Quality & Management Admin") setAddRoleTitle("Super Admin");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addRole === "super_admin"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-500" /> Super Admin
                      </span>
                      {addRole === "super_admin" && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Full control + can manage admin accounts
                    </p>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Role Title / Designation (Manual Entry)
                    </label>
                    <span className="text-[10px] text-slate-400">Type or pick preset</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={addRoleTitle}
                    onChange={(e) => setAddRoleTitle(e.target.value)}
                    placeholder="e.g. Quality & Management Admin, HR & Admin, Training Head..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ROLE_TITLE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAddRoleTitle(preset)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
                          addRoleTitle === preset
                            ? "bg-active-bg text-active-text border-active-border shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active / Inactive Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddStatus("active")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      addStatus === "active"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Active (Can Login)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddStatus("inactive")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      addStatus === "inactive"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" /> Inactive
                  </button>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {addLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Save Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT ADMIN */}
      {/* ============================================================== */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Administrator</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Update account details</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Email / Username *
                </label>
                <input
                  type="text"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Role Selection & Custom Role Title (Only Super Admin can change) */}
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Role & Permissions {selectedAdmin.id === "super-admin-primary" && "(Root Super Admin)"}
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {isSuperAdmin
                      ? editRole === "super_admin" ? "Super Admin Access" : "Standard Admin"
                      : "🔒 Locked (Super Admin Only)"}
                  </span>
                </div>

                {!isSuperAdmin && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
                    Only a Super Admin can change administrator roles or designations.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isSuperAdmin || selectedAdmin.id === "super-admin-primary"}
                    onClick={() => {
                      if (!isSuperAdmin) return;
                      setEditRole("admin");
                      if (editRoleTitle === "Super Admin") setEditRoleTitle("Quality & Management Admin");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      editRole === "admin"
                        ? "bg-active-soft-bg border-active-bg text-slate-900 dark:text-white ring-2 ring-blue-500/50 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    } ${(!isSuperAdmin || selectedAdmin.id === "super-admin-primary") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Admin
                      </span>
                      {editRole === "admin" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Standard management access
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => {
                      if (!isSuperAdmin) return;
                      setEditRole("super_admin");
                      if (editRoleTitle === "Quality & Management Admin") setEditRoleTitle("Super Admin");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      editRole === "super_admin"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    } ${!isSuperAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-amber-500" /> Super Admin
                      </span>
                      {editRole === "super_admin" && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Full control + admin management
                    </p>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Role Title / Designation (Manual Entry)
                    </label>
                    {isSuperAdmin && <span className="text-[10px] text-slate-400">Type or pick preset</span>}
                  </div>
                  <input
                    type="text"
                    required
                    disabled={!isSuperAdmin}
                    value={editRoleTitle}
                    onChange={(e) => setEditRoleTitle(e.target.value)}
                    placeholder="e.g. Quality & Management Admin, HR & Admin, Training Head..."
                    className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium ${
                      !isSuperAdmin ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""
                    }`}
                  />
                  {/* Preset chips */}
                  {isSuperAdmin && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ROLE_TITLE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditRoleTitle(preset)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
                            editRoleTitle === preset
                              ? "bg-active-bg text-active-text border-active-border shadow-xs"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status (disabled for Super Admin) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Account Status {selectedAdmin.role === "super_admin" && "(Locked for Super Admin)"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={selectedAdmin.role === "super_admin"}
                    onClick={() => setEditStatus("active")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editStatus === "active"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    } ${selectedAdmin.role === "super_admin" ? "opacity-75 cursor-not-allowed" : ""}`}
                  >
                    <Check className="w-3.5 h-3.5" /> Active
                  </button>
                  <button
                    type="button"
                    disabled={selectedAdmin.role === "super_admin"}
                    onClick={() => setEditStatus("inactive")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      editStatus === "inactive"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    } ${selectedAdmin.role === "super_admin" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <X className="w-3.5 h-3.5" /> Inactive
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Update Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: RESET / CHANGE ADMIN PASSWORD */}
      {/* ============================================================== */}
      {showPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAdmin.name}</span> ({selectedAdmin.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  New Password * (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showResetNewPass ? "text" : "password"}
                    required
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPass(!showResetNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showResetNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showResetConfirmPass ? "text" : "password"}
                    required
                    value={resetConfirmPass}
                    onChange={(e) => setResetConfirmPass(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showResetConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {resetLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" /> Save Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DELETE ADMIN CONFIRMATION */}
      {/* ============================================================== */}
      {showDeleteModal && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Administrator Account?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete the admin account for{" "}
                <strong className="text-slate-900 dark:text-white">{selectedAdmin.name}</strong> ({selectedAdmin.email})?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800/40 text-left">
                • This administrator will immediately lose access to the portal.<br />
                • Their credentials and active sessions will be terminated.<br />
                • Existing training programs and quiz attempts created will not be affected.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: QUICK CHANGE ROLE & PERMISSIONS */}
      {/* ============================================================== */}
      {showRoleModal && roleTargetAdmin && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Admin Role</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For <span className="font-semibold text-slate-800 dark:text-slate-200">{roleTargetAdmin.name}</span> ({roleTargetAdmin.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changeRoleError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{changeRoleError}</span>
              </div>
            )}

            <form onSubmit={handleChangeRoleSubmit} className="space-y-4">
              {/* Role Level Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Select Permission Level *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={roleTargetAdmin.id === "super-admin-primary"}
                    onClick={() => {
                      setChangeRoleValue("admin");
                      if (changeRoleTitleValue === "Super Admin") setChangeRoleTitleValue("Quality & Management Admin");
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      changeRoleValue === "admin"
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    } ${roleTargetAdmin.id === "super-admin-primary" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Standard Admin
                      </span>
                      {changeRoleValue === "admin" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Standard access to trainings, questions, analytics
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChangeRoleValue("super_admin");
                      if (changeRoleTitleValue === "Quality & Management Admin") setChangeRoleTitleValue("Super Admin");
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      changeRoleValue === "super_admin"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-500" /> Super Admin
                      </span>
                      {changeRoleValue === "super_admin" && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Master control + manage other admins
                    </p>
                  </button>
                </div>
              </div>

              {/* Custom Role Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Custom Role Title / Designation (Manual Entry)
                  </label>
                  <span className="text-[10px] text-slate-400">Type or pick preset</span>
                </div>
                <input
                  type="text"
                  required
                  value={changeRoleTitleValue}
                  onChange={(e) => setChangeRoleTitleValue(e.target.value)}
                  placeholder="e.g. Quality & Management Admin, HR & Admin, Training Head..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-medium"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ROLE_TITLE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setChangeRoleTitleValue(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        changeRoleTitleValue === preset
                          ? "bg-purple-600 text-white border-purple-600 font-semibold shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeRoleLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {changeRoleLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

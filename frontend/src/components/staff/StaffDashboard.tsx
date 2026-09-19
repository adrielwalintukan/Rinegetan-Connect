"use client";

import React, { useState } from "react";
import {
  Bell,
  Calendar,
  Clock,
  Building,
  History,
  Plus,
  LogOut,
  Shield,
  UserCheck,
  Image as ImageIcon,
  LayoutTemplate,
} from "lucide-react";
import { ContentFilterBar } from "./ContentFilterBar";
import { ContentTable, type ContentItem } from "./ContentTable";
import { ContentMutationDialog } from "./ContentMutationDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { AuditLogViewer, type AuditEntry } from "./AuditLogViewer";
import { MediaManager } from "./MediaManager";
import { SectionMediaManager } from "./SectionMediaManager";
import type { ContentStatus } from "@/types/content";
import type { MediaAsset, MediaAlbum } from "@/types/media";
import type { SiteSectionMediaMap } from "@/lib/public/queries";

interface StaffDashboardProps {
  userEmail: string;
  role: "admin" | "editor";
  initialAnnouncements: ContentItem[];
  initialEvents: ContentItem[];
  initialSchedules: ContentItem[];
  initialDepartments: ContentItem[];
  initialAuditLogs: AuditEntry[];
  initialMediaAssets?: MediaAsset[];
  initialMediaAlbums?: MediaAlbum[];
  initialSectionMedia?: SiteSectionMediaMap;
}

type TabType =
  | "announcements"
  | "events"
  | "schedules"
  | "departments"
  | "media"
  | "banners"
  | "audit";

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  userEmail,
  role,
  initialAnnouncements,
  initialEvents,
  initialSchedules,
  initialDepartments,
  initialAuditLogs,
  initialMediaAssets = [],
  initialMediaAlbums = [],
  initialSectionMedia = {},
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("announcements");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [announcements, setAnnouncements] = useState<ContentItem[]>(initialAnnouncements);
  const [events, setEvents] = useState<ContentItem[]>(initialEvents);
  const [schedules, setSchedules] = useState<ContentItem[]>(initialSchedules);
  const [departments, setDepartments] = useState<ContentItem[]>(initialDepartments);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(initialAuditLogs);

  // Dialog states
  const [isMutationOpen, setIsMutationOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ContentItem | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Get current active items
  const getCurrentItems = (): ContentItem[] => {
    switch (activeTab) {
      case "announcements":
        return announcements;
      case "events":
        return events;
      case "schedules":
        return schedules;
      case "departments":
        return departments;
      default:
        return [];
    }
  };

  const updateCurrentItems = (updater: (prev: ContentItem[]) => ContentItem[]) => {
    switch (activeTab) {
      case "announcements":
        setAnnouncements(updater);
        break;
      case "events":
        setEvents(updater);
        break;
      case "schedules":
        setSchedules(updater);
        break;
      case "departments":
        setDepartments(updater);
        break;
    }
  };

  // Filter items
  const currentItems = getCurrentItems();
  const filteredItems = currentItems.filter((item) => {
    // Status filter
    if (currentFilter !== "all" && item.status !== currentFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (item.title || item.name || "").toLowerCase();
      const slug = item.slug.toLowerCase();
      return title.includes(q) || slug.includes(q);
    }
    return true;
  });

  const counts = {
    all: currentItems.length,
    draft: currentItems.filter((i) => i.status === "draft").length,
    published: currentItems.filter((i) => i.status === "published").length,
    archived: currentItems.filter((i) => i.status === "archived").length,
  };

  // Handle status update
  const handleStatusChange = async (id: string, newStatus: ContentStatus) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/content/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeTab,
          id,
          status: newStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status");
      }

      updateCurrentItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );

      // Add local audit entry
      setAuditLogs((prev) => [
        {
          id: String(Date.now()),
          actor_id: userEmail,
          action: `${activeTab}.status_changed`,
          entity_type: activeTab,
          entity_id: id,
          changes: { new_status: newStatus },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      showNotification("success", `Status berhasil diubah menjadi ${newStatus}`);
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save (create or update)
  const handleSave = async (formData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeTab,
          id: editingItem?.id || null,
          data: formData,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan konten");
      }

      const savedItem = json.data as ContentItem;

      if (editingItem?.id) {
        updateCurrentItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...savedItem } : item))
        );
        showNotification("success", "Konten berhasil diperbarui");
      } else {
        updateCurrentItems((prev) => [savedItem, ...prev]);
        showNotification("success", "Konten baru berhasil ditambahkan");
      }

      setEditingItem(null);
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Gagal menyimpan");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle permanent delete
  const handleDeleteConfirm = async (reason: string) => {
    if (!deletingItem) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/content/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeTab,
          id: deletingItem.id,
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menghapus konten");
      }

      updateCurrentItems((prev) => prev.filter((item) => item.id !== deletingItem.id));

      setAuditLogs((prev) => [
        {
          id: String(Date.now()),
          actor_id: userEmail,
          action: `${activeTab}.deleted`,
          entity_type: activeTab,
          entity_id: deletingItem.id,
          changes: { reason, title: deletingItem.title || deletingItem.name },
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      showNotification("success", "Konten berhasil dihapus permanen");
      setDeletingItem(null);
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Gagal menghapus");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: "announcements" as TabType, label: "Pengumuman", icon: Bell },
    { id: "events" as TabType, label: "Kegiatan", icon: Calendar },
    { id: "schedules" as TabType, label: "Jadwal Rutin", icon: Clock },
    { id: "departments" as TabType, label: "Departemen", icon: Building },
    { id: "media" as TabType, label: "Media & Galeri", icon: ImageIcon },
    { id: "banners" as TabType, label: "Banner Halaman", icon: LayoutTemplate },
    { id: "audit" as TabType, label: "Log Audit", icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="container-site flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-navy">GMAHK Rinegetan</h1>
              <p className="text-[0.6875rem] text-slate-500">Portal Manajemen Konten (CMS)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role indicator badge */}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <UserCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span className="font-mono text-xs text-slate-600">{userEmail}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase ${
                  role === "admin"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {role}
              </span>
            </div>

            {/* Logout button */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-navy transition"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="container-site mt-8">
        {/* Toast notification banner */}
        {notification && (
          <div
            className={`mb-6 flex items-center justify-between rounded-xl p-3 text-xs font-semibold shadow-sm ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Header & Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <nav className="flex flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentFilter("all");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    isActive
                      ? "bg-navy text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100/70 hover:text-navy"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Create Button (only for content tabs) */}
          {activeTab !== "audit" && activeTab !== "media" && activeTab !== "banners" && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsMutationOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-navy/90 transition"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah {tabs.find((t) => t.id === activeTab)?.label}</span>
            </button>
          )}
        </div>

        {/* Tab Content Section */}
        <div className="mt-6">
          {activeTab === "audit" ? (
            <AuditLogViewer logs={auditLogs} />
          ) : activeTab === "media" ? (
            <MediaManager
              initialAssets={initialMediaAssets}
              initialAlbums={initialMediaAlbums}
              role={role}
              userEmail={userEmail}
              onNotification={showNotification}
            />
          ) : activeTab === "banners" ? (
            <SectionMediaManager
              initialSectionMedia={initialSectionMedia}
              mediaAssets={initialMediaAssets}
              mediaAlbums={initialMediaAlbums}
            />
          ) : (
            <div className="space-y-4">
              <ContentFilterBar
                currentFilter={currentFilter}
                onFilterChange={setCurrentFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                counts={counts}
              />

              <ContentTable
                items={filteredItems}
                role={role}
                entityType={activeTab}
                onStatusChange={handleStatusChange}
                onEdit={(item) => {
                  setEditingItem(item);
                  setIsMutationOpen(true);
                }}
                onDeletePrompt={(item) => {
                  setDeletingItem(item);
                  setIsDeleteOpen(true);
                }}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {activeTab !== "audit" && activeTab !== "media" && activeTab !== "banners" && (
        <ContentMutationDialog
          key={`${activeTab}_${editingItem?.id || "new"}`}
          isOpen={isMutationOpen}
          onClose={() => {
            setIsMutationOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          entityType={activeTab}
          initialData={editingItem}
          isSaving={isLoading}
        />
      )}

      {activeTab !== "audit" && activeTab !== "media" && activeTab !== "banners" && (
        <DeleteConfirmationDialog
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeletingItem(null);
          }}
          onConfirm={handleDeleteConfirm}
          itemTitle={deletingItem ? deletingItem.title || deletingItem.name || "" : ""}
          entityName={tabs.find((t) => t.id === activeTab)?.label || "Konten"}
          isDeleting={isLoading}
        />
      )}
    </div>
  );
};

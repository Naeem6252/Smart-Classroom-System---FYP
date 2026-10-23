"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect, type ReactNode } from "react"
import {
  AlertCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  LayoutDashboard,
  Megaphone,
  Banknote,
  BookOpen,
  FileText,
  BarChart3,
  Video,
  Smile,
  LayoutList,
  UserSquare2,
} from "lucide-react"
import {
  AdminDataManager,
  type AdminDataManagerTab,
} from "@/components/admin/admin-data-manager"
import { AnnouncementsManager } from "@/components/admin/announcements-manager"
import { FeeManager } from "@/components/admin/fee-manager"
import { cn } from "@/lib/utils"

interface AdminData {
  classes: any[]
  sections: any[]
  students: any[]
}

type AdminPanelRoute =
  | "dashboard"
  | "announcements"
  | "fees"
  | AdminDataManagerTab

const SETTINGS_TABS: { id: AdminDataManagerTab; label: string; icon: ReactNode }[] = [
  { id: "faculty", label: "Faculty", icon: <Users className="w-4 h-4 shrink-0" /> },
  { id: "classes", label: "Manage Classes", icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: "sections", label: "Manage Sections", icon: <LayoutList className="w-4 h-4 shrink-0" /> },
  { id: "students", label: "Manage Students", icon: <UserSquare2 className="w-4 h-4 shrink-0" /> },
  { id: "enrollment", label: "Course Enrollment", icon: <Users className="w-4 h-4 shrink-0" /> },
  { id: "todaysclasses", label: "Today's Classes", icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: "facial", label: "Facial Recognition", icon: <Smile className="w-4 h-4 shrink-0" /> },
  { id: "cameras", label: "Camera Setup", icon: <Video className="w-4 h-4 shrink-0" /> },
  { id: "analytics", label: "Student Analytics", icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
  { id: "reports", label: "Reports", icon: <FileText className="w-4 h-4 shrink-0" /> },
]

export function AdminDashboard() {
  const [adminData, setAdminData] = useState<AdminData>({
    classes: [],
    sections: [],
    students: [],
  })
  const [route, setRoute] = useState<AdminPanelRoute>("dashboard")
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 })
  const [studentQuery, setStudentQuery] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem("adminData")
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      setAdminData({
        classes: parsed.classes ?? [],
        sections: parsed.sections ?? [],
        students: parsed.students ?? [],
      })
    } catch (e) {
      console.error("[v0] Failed to load admin data:", e)
    }
  }, [])

  useEffect(() => {
    const loadAttendance = () => {
      const records = localStorage.getItem("attendanceRecords")
      const today = new Date().toISOString().split("T")[0]

      if (records && adminData) {
        try {
          const parsed = JSON.parse(records)
          const todayRecords = parsed.filter((r: any) => r.date === today)
          const presentIds = new Set(todayRecords.map((r: any) => r.studentId))
          const presentCount = presentIds.size
          const absentCount = Math.max(0, (adminData.students?.length || 0) - presentCount)

          setAttendanceStats({ present: presentCount, absent: absentCount })
        } catch (e) {
          console.error("[v0] Failed to load attendance:", e)
        }
      }
    }

    loadAttendance()
    const interval = setInterval(loadAttendance, 3000)
    return () => clearInterval(interval)
  }, [adminData])

  const sidebarBtn = (active: boolean) =>
    cn(
      "w-full justify-start gap-3 rounded-xl transition-all text-left h-auto py-2.5 px-3 whitespace-normal",
      active
        ? "shadow-sm"
        : "hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]",
    )

  const renderMain = () => {
    switch (route) {
      case "dashboard":
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">Total Students</p>
                    <p className="text-2xl font-bold text-foreground">{adminData.students?.length || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/40" />
                </div>
              </Card>
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">Total Classes</p>
                    <p className="text-2xl font-bold text-foreground">{adminData.classes.length || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary/40" />
                </div>
              </Card>
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">Present Today</p>
                    <p className="text-2xl font-bold text-primary">{attendanceStats.present}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-primary/40" />
                </div>
              </Card>
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/60">Absent Today</p>
                    <p className="text-2xl font-bold text-destructive">{attendanceStats.absent}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-destructive/40" />
                </div>
              </Card>
            </div>

            <Card variant="glass" className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-foreground">Today’s attendance</p>
                  <p className="text-xs text-foreground/60">Search by name or roll number.</p>
                </div>
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Search students…"
                  className="w-72 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="glass" className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Present Students</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adminData &&
                    (() => {
                      const q = studentQuery.trim().toLowerCase()
                      const records = localStorage.getItem("attendanceRecords")
                      const today = new Date().toISOString().split("T")[0]
                      if (!records) return <p className="text-foreground/60 text-sm">No attendance records yet</p>

                      const parsed = JSON.parse(records)
                      const todayRecords = parsed.filter((r: any) => r.date === today)
                      const presentIds = new Set(todayRecords.map((r: any) => r.studentId))
                      const presentStudents = adminData.students
                        .filter((s: any) => presentIds.has(s.id))
                        .filter((s: any) => {
                          if (!q) return true
                          return `${s.name || ""} ${s.rollNumber || ""}`.toLowerCase().includes(q)
                        })

                      if (presentStudents.length === 0) {
                        return <p className="text-foreground/60 text-sm">No students marked present yet</p>
                      }

                      return presentStudents.map((student: any) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/15"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{student.name}</p>
                            <p className="text-xs text-foreground/50">{student.rollNumber || "N/A"}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary">✓ Present</span>
                        </div>
                      ))
                    })()}
                </div>
              </Card>

              <Card variant="glass" className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Absent Students</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adminData &&
                    (() => {
                      const q = studentQuery.trim().toLowerCase()
                      const records = localStorage.getItem("attendanceRecords")
                      const today = new Date().toISOString().split("T")[0]

                      const parsed = records ? JSON.parse(records) : []
                      const todayRecords = parsed.filter((r: any) => r.date === today)
                      const presentIds = new Set(todayRecords.map((r: any) => r.studentId))
                      const absentStudents = adminData.students
                        .filter((s: any) => !presentIds.has(s.id))
                        .filter((s: any) => {
                          if (!q) return true
                          return `${s.name || ""} ${s.rollNumber || ""}`.toLowerCase().includes(q)
                        })

                      if (absentStudents.length === 0) {
                        return <p className="text-foreground/60 text-sm">All students present</p>
                      }

                      return absentStudents.map((student: any) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/15"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{student.name}</p>
                            <p className="text-xs text-foreground/50">{student.rollNumber || "N/A"}</p>
                          </div>
                          <span className="text-xs font-semibold text-destructive">✗ Absent</span>
                        </div>
                      ))
                    })()}
                </div>
              </Card>
            </div>
          </>
        )
      case "announcements":
        return <AnnouncementsManager />
      case "fees":
        return <FeeManager />
      default:
        return (
          <Card variant="glass" className="p-4">
            <AdminDataManager navigation="none" tab={route} onTabChange={(tab) => setRoute(tab)} />
          </Card>
        )
    }
  }

  const routeTitle = () => {
    if (route === "dashboard") return "Admin Dashboard"
    if (route === "announcements") return "Announcements"
    if (route === "fees") return "Fees"
    return SETTINGS_TABS.find((t) => t.id === route)?.label ?? "Campus Management"
  }

  const routeSubtitle = () => {
    if (route === "dashboard") return "Campus-wide monitoring and analytics"
    if (route === "announcements") return "Post and manage campus notices"
    if (route === "fees") return "Invoices and payment tracking"
    return "Manage classes, sections, students, and reports"
  }

  return (
    <div className="flex gap-8 min-h-[min(720px,calc(100vh-8rem))]">
      <aside
        className={cn(
          "flex w-56 shrink-0 flex-col gap-6 border-r border-[var(--glass-border)] pr-4 md:w-60 lg:w-64 lg:pr-6",
          "max-h-[min(900px,calc(100vh-6rem))] lg:sticky lg:top-0 lg:self-start lg:overflow-y-auto",
        )}
      >
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">Overview</p>
          <Button
            variant={route === "dashboard" ? "default" : "ghost"}
            className={sidebarBtn(route === "dashboard")}
            onClick={() => setRoute("dashboard")}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </Button>
        </div>

        <Separator className="bg-[var(--glass-border)]" />

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">Campus</p>
          <Button
            variant={route === "announcements" ? "default" : "ghost"}
            className={sidebarBtn(route === "announcements")}
            onClick={() => setRoute("announcements")}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            Announcements
          </Button>
          <Button
            variant={route === "fees" ? "default" : "ghost"}
            className={sidebarBtn(route === "fees")}
            onClick={() => setRoute("fees")}
          >
            <Banknote className="w-4 h-4 shrink-0" />
            Fees
          </Button>
        </div>

        <Separator className="bg-[var(--glass-border)]" />

        <div className="space-y-1 pb-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
            Settings & data
          </p>
          <nav className="flex flex-col gap-0.5">
            {SETTINGS_TABS.map(({ id, label, icon }) => (
              <Button
                key={id}
                variant={route === id ? "default" : "ghost"}
                className={sidebarBtn(route === id)}
                onClick={() => setRoute(id)}
              >
                {icon}
                {label}
              </Button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">{routeTitle()}</h2>
            <p className="text-foreground/60">{routeSubtitle()}</p>
          </div>
          {route === "dashboard" ? (
            <Badge variant="outline" className="bg-transparent">
              Students: {adminData.students?.length || 0}
            </Badge>
          ) : null}
        </div>

        <div className="animate-in fade-in-0">{renderMain()}</div>
      </div>
    </div>
  )
}

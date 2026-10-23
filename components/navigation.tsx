"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BarChart3, Users, Shield, User, LogOut, LineChart, Receipt, BookOpen, Megaphone, CalendarClock, Smile } from "lucide-react"

type UserRole = "admin" | "teacher" | "security" | "student"
type StudentSection = "overview" | "academic" | "fees" | "attendance" | "courses" | "announcements"
type TeacherSection = "overview" | "attendance" | "dataset" | "grades" | "students" | "schedule"

interface NavigationProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  onLogout?: () => void
  activeStudentSection?: StudentSection
  onStudentSectionChange?: (section: StudentSection) => void
  activeTeacherSection?: TeacherSection
  onTeacherSectionChange?: (section: TeacherSection) => void
}

export function Navigation({
  currentRole,
  onRoleChange,
  onLogout,
  activeStudentSection = "overview",
  onStudentSectionChange,
  activeTeacherSection = "attendance",
  onTeacherSectionChange,
}: NavigationProps) {
  const [profileVersion, setProfileVersion] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")

  const signedInRole = useMemo(() => {
    try {
      const userRaw = localStorage.getItem("currentUser")
      if (!userRaw) return currentRole
      const parsed = JSON.parse(userRaw)
      return (parsed?.role as UserRole) || currentRole
    } catch {
      return currentRole
    }
  }, [currentRole, profileVersion])

  const signedInUser = useMemo(() => {
    try {
      const userRaw = localStorage.getItem("currentUser")
      if (!userRaw) return null
      const parsed = JSON.parse(userRaw) as { email?: string; name?: string; role?: UserRole } | null
      if (!parsed) return null
      return {
        email: typeof parsed.email === "string" ? parsed.email : "",
        name: typeof parsed.name === "string" ? parsed.name : "",
        role: (parsed.role as UserRole) || signedInRole,
      }
    } catch {
      return null
    }
  }, [signedInRole, profileVersion])

  useEffect(() => {
    if (!profileOpen) return
    setDisplayName(signedInUser?.name || "")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setProfileMessage("")
    setProfileError("")
  }, [profileOpen, signedInUser?.name])

  const saveProfile = () => {
    setProfileError("")
    setProfileMessage("")

    try {
      const userRaw = localStorage.getItem("currentUser")
      if (!userRaw) {
        setProfileError("No active user session found.")
        return
      }
      const current = JSON.parse(userRaw) as {
        role?: UserRole
        email?: string
        name?: string
        teacherId?: string
        studentId?: string
      }
      const role = (current.role || signedInRole) as UserRole
      const cleanedName = displayName.trim()
      if (!cleanedName) {
        setProfileError("Name cannot be empty.")
        return
      }

      const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0
      if (wantsPasswordChange) {
        if (!currentPassword) {
          setProfileError("Enter current password to set a new password.")
          return
        }
        if (newPassword.length < 6) {
          setProfileError("New password must be at least 6 characters.")
          return
        }
        if (newPassword !== confirmPassword) {
          setProfileError("New password and confirm password do not match.")
          return
        }
      }

      const updatedUser = { ...current, name: cleanedName }
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      if (role === "admin") {
        const fallback = { email: "admin@campus.edu", password: "admin123", name: "admin" }
        let auth = fallback
        try {
          const raw = localStorage.getItem("adminAuth")
          if (raw) {
            const parsed = JSON.parse(raw) as { email?: string; password?: string; name?: string }
            auth = {
              email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email : fallback.email,
              password: typeof parsed.password === "string" && parsed.password.trim() ? parsed.password : fallback.password,
              name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : fallback.name,
            }
          }
        } catch {
          auth = fallback
        }

        if (wantsPasswordChange) {
          if (currentPassword !== auth.password) {
            setProfileError("Current password is incorrect.")
            return
          }
          auth.password = newPassword
        }
        auth.name = cleanedName
        auth.email = current.email || auth.email
        localStorage.setItem("adminAuth", JSON.stringify(auth))
      } else {
        const adminRaw = localStorage.getItem("adminData")
        if (!adminRaw) {
          setProfileError("User data store not found.")
          return
        }
        const adminData = JSON.parse(adminRaw) as { teachers?: any[]; students?: any[] }

        if (role === "teacher") {
          const teachers = Array.isArray(adminData.teachers) ? [...adminData.teachers] : []
          const idx = teachers.findIndex(
            (t) =>
              String(t?.id || "") === String(current.teacherId || "") ||
              String(t?.email || "").toLowerCase() === String(current.email || "").toLowerCase(),
          )
          if (idx < 0) {
            setProfileError("Teacher account not found in records.")
            return
          }
          if (wantsPasswordChange && String(teachers[idx]?.password || "") !== currentPassword) {
            setProfileError("Current password is incorrect.")
            return
          }
          teachers[idx] = {
            ...teachers[idx],
            name: cleanedName,
            ...(wantsPasswordChange ? { password: newPassword } : {}),
          }
          localStorage.setItem("adminData", JSON.stringify({ ...adminData, teachers }))
        } else if (role === "student") {
          const students = Array.isArray(adminData.students) ? [...adminData.students] : []
          const idx = students.findIndex(
            (s) =>
              String(s?.id || "") === String(current.studentId || "") ||
              String(s?.email || "").toLowerCase() === String(current.email || "").toLowerCase(),
          )
          if (idx < 0) {
            setProfileError("Student account not found in records.")
            return
          }
          if (wantsPasswordChange && String(students[idx]?.password || "") !== currentPassword) {
            setProfileError("Current password is incorrect.")
            return
          }
          students[idx] = {
            ...students[idx],
            name: cleanedName,
            ...(wantsPasswordChange ? { password: newPassword } : {}),
          }
          localStorage.setItem("adminData", JSON.stringify({ ...adminData, students }))
        }
      }

      setProfileVersion((v) => v + 1)
      window.dispatchEvent(new StorageEvent("storage", { key: "currentUser" }))
      setProfileMessage("Profile updated successfully.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setProfileError("Could not save profile changes.")
    }
  }

  const roles: { id: UserRole; label: string; icon: React.ReactNode }[] = [
    { id: "admin", label: "Admin", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "teacher", label: "Teacher", icon: <Users className="w-5 h-5" /> },
    { id: "security", label: "Security", icon: <Shield className="w-5 h-5" /> },
    { id: "student", label: "Student", icon: <User className="w-5 h-5" /> },
  ]

  return (
    <aside className="w-[280px] shrink-0 border-r border-border/60 bg-[var(--glass-bg)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--glass-bg)]">
      <div className="h-svh p-4 flex flex-col">
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="w-full text-left rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-2xl shadow-sm p-4 hover:border-primary/40 transition-colors"
              title="Open profile settings"
            >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-sidebar-primary">SmartClass</h1>
              <p className="text-xs text-sidebar-foreground/70">Campus Intelligence</p>
            </div>
            <Badge variant="outline" className="bg-transparent">
              {signedInRole}
            </Badge>
          </div>
          {signedInUser?.email || signedInUser?.name ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {signedInUser?.name || signedInUser?.email || "Signed in"}
                </p>
                {signedInUser?.name && signedInUser?.email ? (
                  <p className="text-xs text-foreground/60 truncate">{signedInUser.email}</p>
                ) : null}
              </div>
            </div>
          ) : null}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile settings</DialogTitle>
              <DialogDescription>Update your name and password for this account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-current-password">Current password (required to change password)</Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to keep current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password">Confirm new password</Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
              {profileMessage ? <p className="text-sm text-primary">{profileMessage}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" onClick={saveProfile}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-4 flex-1 overflow-auto">
          <nav className="space-y-1">
            {roles.map((role) => {
              // Admins stay on admin tooling; no direct student/teacher portal switching from the shell.
              if (signedInRole === "admin" && (role.id === "teacher" || role.id === "student")) {
                return null
              }

              // Non-admin users can only access their own portal.
              if (signedInRole !== "admin" && role.id !== signedInRole) {
                return null
              }

              const active = currentRole === role.id
              return (
                <Button
                  key={role.id}
                  variant={active ? "default" : "ghost"}
                  className={
                    "w-full justify-start gap-3 rounded-xl transition-all " +
                    (active
                      ? "shadow-sm"
                      : "hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]")
                  }
                  onClick={() => {
                    if (signedInRole !== "admin" && role.id !== signedInRole) {
                      return
                    }
                    if (role.id === "student") onStudentSectionChange?.("overview")
                    if (role.id === "teacher") onTeacherSectionChange?.("attendance")
                    onRoleChange(role.id)
                  }}
                >
                  {role.icon}
                  {role.label}
                </Button>
              )
            })}

            {signedInRole === "student" && currentRole === "student" ? (
              <div className="pt-2">
                <p className="px-3 py-2 text-[11px] font-semibold text-foreground/60 tracking-wide">Student</p>
                <Button
                  type="button"
                  variant={activeStudentSection === "attendance" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => {
                    onStudentSectionChange?.("attendance")
                  }}
                >
                  <CalendarClock className="w-5 h-5" />
                  Attendance
                </Button>
                <Button
                  type="button"
                  variant={activeStudentSection === "courses" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => {
                    onStudentSectionChange?.("courses")
                  }}
                >
                  <BookOpen className="w-5 h-5" />
                  My courses
                </Button>
                <Button
                  type="button"
                  variant={activeStudentSection === "academic" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => {
                    onStudentSectionChange?.("academic")
                  }}
                >
                  <LineChart className="w-5 h-5" />
                  Academic performance
                </Button>
                <Button
                  type="button"
                  variant={activeStudentSection === "announcements" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => {
                    onStudentSectionChange?.("announcements")
                  }}
                >
                  <Megaphone className="w-5 h-5" />
                  Announcements
                </Button>
                <Button
                  type="button"
                  variant={activeStudentSection === "fees" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => {
                    onStudentSectionChange?.("fees")
                  }}
                >
                  <Receipt className="w-5 h-5" />
                  Fees & invoices
                </Button>
              </div>
            ) : null}

            {signedInRole === "teacher" && currentRole === "teacher" ? (
              <div className="pt-2">
                <p className="px-3 py-2 text-[11px] font-semibold text-foreground/60 tracking-wide">Teacher</p>
                <Button
                  type="button"
                  variant={activeTeacherSection === "attendance" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("attendance")}
                >
                  <CalendarClock className="w-5 h-5" />
                  Attendance
                </Button>
                <Button
                  type="button"
                  variant={activeTeacherSection === "students" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("students")}
                >
                  <Users className="w-5 h-5" />
                  Students
                </Button>
                <Button
                  type="button"
                  variant={activeTeacherSection === "schedule" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("schedule")}
                >
                  <BookOpen className="w-5 h-5" />
                  Schedule
                </Button>
                <Button
                  type="button"
                  variant={activeTeacherSection === "grades" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("grades")}
                >
                  <LineChart className="w-5 h-5" />
                  Grades
                </Button>
                <Button
                  type="button"
                  variant={activeTeacherSection === "dataset" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("dataset")}
                >
                  <Smile className="w-5 h-5" />
                  Dataset
                </Button>
                <Button
                  type="button"
                  variant={activeTeacherSection === "overview" ? "default" : "ghost"}
                  className="w-full justify-start gap-3 rounded-xl hover:bg-[var(--glass-bg-strong)] hover:text-foreground hover:backdrop-blur-xl hover:border hover:border-[var(--glass-border)]"
                  onClick={() => onTeacherSectionChange?.("overview")}
                >
                  <Megaphone className="w-5 h-5" />
                  Overview
                </Button>
              </div>
            ) : null}
          </nav>
        </div>

        <div className="pt-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-xl bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-2xl hover:bg-primary/10 hover:border-primary/30 hover:text-foreground transition-colors"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  )
}

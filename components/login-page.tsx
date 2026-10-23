"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Shield, GraduationCap, Eye, EyeOff, Lock, User, Building2, Users, Moon, Sun } from "lucide-react"

type LoginRole = "admin" | "teacher" | "student"

interface LoginPageProps {
  onLogin: (role: "admin" | "teacher" | "security" | "student") => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRoleCards, setShowRoleCards] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [mounted, setMounted] = useState(false)

  const getAdminAuth = () => {
    const fallback = { email: "admin@campus.edu", password: "admin123", name: "admin" }
    try {
      const raw = localStorage.getItem("adminAuth")
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as { email?: string; password?: string; name?: string }
      return {
        email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email : fallback.email,
        password: typeof parsed.password === "string" && parsed.password.trim() ? parsed.password : fallback.password,
        name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : fallback.name,
      }
    } catch {
      return fallback
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!selectedRole) {
      const id = requestAnimationFrame(() => setShowRoleCards(true))
      return () => cancelAnimationFrame(id)
    }
    setShowRoleCards(false)
  }, [selectedRole])

  useEffect(() => {
    if (selectedRole) {
      setShowLoginForm(false)
      const id = requestAnimationFrame(() => setShowLoginForm(true))
      return () => cancelAnimationFrame(id)
    }
    setShowLoginForm(false)
  }, [selectedRole])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Demo credentials check
    if (selectedRole === "admin") {
      const adminAuth = getAdminAuth()
      if (email.toLowerCase() === adminAuth.email.toLowerCase() && password === adminAuth.password) {
        localStorage.setItem('currentUser', JSON.stringify({ role: 'admin', email: adminAuth.email, name: adminAuth.name }))
        onLogin("admin")
      } else {
        setError("Invalid admin credentials.")
      }
    } else if (selectedRole === "teacher") {
      const adminData = localStorage.getItem('adminData')
      if (adminData) {
        const parsed = JSON.parse(adminData)
        const teacher = parsed.teachers?.find(
          (t: any) => String(t.email || "").toLowerCase() === email.toLowerCase() && t.password === password,
        )

        if (teacher) {
          localStorage.setItem(
            'currentUser',
            JSON.stringify({ role: 'teacher', email, teacherId: teacher.id, name: teacher.name }),
          )
          onLogin("teacher")
        } else {
          setError("Invalid teacher credentials. Check your faculty email and password.")
        }
      } else {
        setError("No faculty accounts available. Ask admin to add one in Faculty tab.")
      }
    } else if (selectedRole === "student") {
      // Authenticate against student data in localStorage
      const adminData = localStorage.getItem('adminData')
      if (adminData) {
        const parsed = JSON.parse(adminData)
        const student = parsed.students?.find((s: any) => s.email === email && s.password === password)
        
        if (student) {
          localStorage.setItem('currentUser', JSON.stringify({ role: 'student', email, studentId: student.id, name: student.name }))
          onLogin("student")
        } else {
          setError("Invalid student credentials. Check your email and password.")
        }
      } else {
        setError("No students registered in the system.")
      }
    }

    setIsLoading(false)
  }

  const handleBack = () => {
    setSelectedRole(null)
    setEmail("")
    setPassword("")
    setError("")
  }

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="fixed right-4 top-4 z-10">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 backdrop-blur-2xl">
            <Sun className="h-4 w-4 text-foreground/60" />
            <Switch
              aria-label="Toggle dark mode"
              checked={mounted ? resolvedTheme === "dark" : false}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
            <Moon className="h-4 w-4 text-foreground/60" />
          </div>
        </div>
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Smart Campus</h1>
            <p className="text-muted-foreground">Attendance, Monitoring & Security System</p>
          </div>

          {/* Admin Login Card */}
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Administrator Access</p>

            <Card
              style={{ transitionDelay: "20ms" }}
              className={`group cursor-pointer border-border/70 transition-all duration-250 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-primary/70 hover:shadow-xl ${
                showRoleCards ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
              onClick={() => setSelectedRole("admin")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/20">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">Administrator Login</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage campus operations and security
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Teacher Login Link */}
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Are you faculty?</p>

            <Card
              onClick={() => setSelectedRole("teacher")}
              style={{ transitionDelay: "80ms" }}
              className={`group cursor-pointer border-primary/20 bg-primary/5 transition-all duration-250 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-primary/60 hover:bg-primary/10 hover:shadow-xl ${
                showRoleCards ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/20">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg text-foreground">Teacher Login</h3>
                  <p className="text-sm text-muted-foreground">Access teacher portal and attendance tools</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Login Link */}
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Are you a student?</p>
            <Card
              onClick={() => setSelectedRole("student")}
              style={{ transitionDelay: "140ms" }}
              className={`group cursor-pointer border-accent/20 bg-accent/5 transition-all duration-250 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-accent/60 hover:bg-accent/10 hover:shadow-xl ${
                showRoleCards ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-accent/20">
                  <GraduationCap className="h-7 w-7 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg text-foreground">Student Login</h3>
                  <p className="text-sm text-muted-foreground">Access your portal, classes, and attendance</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">Protected by AI-powered security monitoring</p>
        </div>
      </div>
    )
  }

  // Login form screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="fixed right-4 top-4 z-10">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 backdrop-blur-2xl">
          <Sun className="h-4 w-4 text-foreground/60" />
          <Switch
            aria-label="Toggle dark mode"
            checked={mounted ? resolvedTheme === "dark" : false}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
          <Moon className="h-4 w-4 text-foreground/60" />
        </div>
      </div>
      <div
        className={`w-full max-w-md space-y-6 transition-all duration-300 ease-out ${
          showLoginForm ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div
              className={`h-16 w-16 rounded-xl flex items-center justify-center ${
                selectedRole === "admin" || selectedRole === "teacher" ? "bg-primary/10" : "bg-accent/10"
              }`}
            >
              {selectedRole === "admin" ? (
                <Shield className="h-8 w-8 text-primary" />
              ) : selectedRole === "teacher" ? (
                <Users className="h-8 w-8 text-primary" />
              ) : (
                <GraduationCap className="h-8 w-8 text-accent" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {selectedRole === "admin" ? "Admin Login" : selectedRole === "teacher" ? "Teacher Login" : "Student Login"}
          </h1>
          <p className="text-muted-foreground text-sm">Enter your credentials to access the dashboard</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              {selectedRole === "admin"
                ? "Access administrative controls and monitoring"
                : selectedRole === "teacher"
                  ? "Access teacher operations and attendance tools"
                  : "View your attendance and class information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={
                      selectedRole === "admin"
                        ? "admin@campus.edu"
                        : selectedRole === "teacher"
                          ? "teacher@campus.edu"
                          : "student@campus.edu"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
                Back to role selection
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

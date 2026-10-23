"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardCheck, Users, BookOpen, Smile, GraduationCap, Megaphone, CalendarDays, ListChecks } from "lucide-react"
import { AttendanceSession } from "@/components/attendance/attendance-session"
import { StudentDatasetManager } from "@/components/attendance/student-dataset-manager"
import { GradesManager } from "@/components/admin/grades-manager"
import type { Announcement } from "@/components/admin/announcements-manager"

type AdminData = {
  classes?: any[]
  students?: any[]
}

export function TeacherPortal({
  activeSection = "attendance",
}: {
  activeSection?: "overview" | "attendance" | "dataset" | "grades" | "students" | "schedule"
}) {
  type AttendanceMethod = "live" | "photo" | "roster"
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [currentTeacherId, setCurrentTeacherId] = useState<string>("")
  const [currentTeacher, setCurrentTeacher] = useState<string>("")
  const [activeTab, setActiveTab] = useState<
    "overview" | "attendance" | "dataset" | "grades" | "students" | "schedule"
  >("attendance")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [datasetClassId, setDatasetClassId] = useState<string>("")
  const [datasetSectionId, setDatasetSectionId] = useState<string>("")
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [selectedAttendanceMethod, setSelectedAttendanceMethod] = useState<AttendanceMethod>("live")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    setActiveTab(activeSection)
  }, [activeSection])

  useEffect(() => {
    const stored = localStorage.getItem("adminData")
    if (stored) {
      try {
        setAdminData(JSON.parse(stored))
      } catch (e) {
        console.error("[v0] Failed to load admin data:", e)
      }
    }

    const user = localStorage.getItem("currentUser")
    if (user) {
      try {
        const parsed = JSON.parse(user)
        setCurrentTeacherId(parsed?.teacherId || "")
        setCurrentTeacher(parsed?.name || parsed?.username || "")
      } catch (e) {
        console.error("[v0] Failed to load current user:", e)
      }
    }
  }, [])

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("announcements")
        if (!raw) {
          setAnnouncements([])
          return
        }
        const parsed = JSON.parse(raw)
        setAnnouncements(Array.isArray(parsed) ? parsed : [])
      } catch {
        setAnnouncements([])
      }
    }
    load()
    const onStorage = () => load()
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const myClasses = useMemo(() => {
    const classes = adminData?.classes || []
    if (!currentTeacherId && !currentTeacher) return classes
    return classes.filter((cls: any) => {
      const assigned = String(cls?.classTeacher || "")
      return assigned === String(currentTeacherId) || assigned === String(currentTeacher)
    })
  }, [adminData, currentTeacherId, currentTeacher])

  const selectedClass = useMemo(() => {
    return myClasses.find((c: any) => String(c?.id) === String(selectedClassId)) || null
  }, [myClasses, selectedClassId])

  const totalStudents = useMemo(() => {
    const students = adminData?.students || []
    if (!myClasses.length) return 0
    const classIds = new Set(myClasses.map((c: any) => c?.id).filter(Boolean))
    return students.filter((s: any) => {
      const ids = Array.isArray(s?.classIds) ? s.classIds : s?.classId ? [s.classId] : []
      return ids.some((id: any) => classIds.has(id))
    }).length
  }, [adminData, myClasses])

  const myStudents = useMemo(() => {
    const students = adminData?.students || []
    if (!myClasses.length) return []
    const classIds = new Set(myClasses.map((c: any) => c?.id).filter(Boolean).map(String))
    return students.filter((s: any) => {
      const ids = Array.isArray(s?.classIds) ? s.classIds : s?.classId ? [s.classId] : []
      return ids.some((id: any) => classIds.has(String(id)))
    })
  }, [adminData, myClasses])

  const selectedDatasetClass = useMemo(
    () => myClasses.find((c: any) => String(c?.id) === String(datasetClassId)) || null,
    [myClasses, datasetClassId],
  )

  const selectedDatasetSection = useMemo(
    () => (selectedDatasetClass?.sections || []).find((s: any) => String(s?.id) === String(datasetSectionId)) || null,
    [selectedDatasetClass, datasetSectionId],
  )

  const studentsByClass = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const cls of myClasses) {
      const classId = String(cls?.id || "")
      if (!classId) continue
      const rows = myStudents.filter((s: any) => {
        const ids = Array.isArray(s?.classIds) ? s.classIds : s?.classId ? [s.classId] : []
        return ids.map(String).includes(classId)
      })
      map.set(classId, rows)
    }
    return map
  }, [myClasses, myStudents])

  const datasetScopedStudentIds = useMemo(() => {
    if (!selectedDatasetClass) return []
    const classId = String(selectedDatasetClass.id)
    const classStudents = myStudents.filter((s: any) => {
      const ids = Array.isArray(s?.classIds) ? s.classIds : s?.classId ? [s.classId] : []
      return ids.map(String).includes(classId)
    })
    if (!datasetSectionId) return classStudents.map((s: any) => String(s.id))

    return classStudents
      .filter((s: any) => {
        const mappedSectionId = s?.sectionAssignments?.[classId]
        if (mappedSectionId) return String(mappedSectionId) === String(datasetSectionId)
        const sectionIds = Array.isArray(s?.sectionIds) ? s.sectionIds.map(String) : []
        const singleSectionId = s?.sectionId ? String(s.sectionId) : ""
        return sectionIds.includes(String(datasetSectionId)) || singleSectionId === String(datasetSectionId)
      })
      .map((s: any) => String(s.id))
  }, [myStudents, selectedDatasetClass, datasetSectionId])

  const datasetScopeLabel = useMemo(() => {
    if (!selectedDatasetClass) return "All teacher classes"
    if (!selectedDatasetSection) return `${selectedDatasetClass.name} (all sections)`
    return `${selectedDatasetClass.name} · ${selectedDatasetSection.name}`
  }, [selectedDatasetClass, selectedDatasetSection])

  const todayAttendanceCount = useMemo(() => {
    const records = localStorage.getItem("attendanceRecords")
    if (!records) return 0
    try {
      const parsed = JSON.parse(records)
      const today = new Date().toISOString().split("T")[0]
      return parsed.filter((r: any) => r?.date === today).length
    } catch {
      return 0
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Teacher Portal</h2>
          <p className="text-foreground/60">{currentTeacher ? `Welcome, ${currentTeacher}` : "Manage class operations"}</p>
        </div>
        <Badge variant="outline" className="bg-transparent">
          {selectedClass ? `Class: ${selectedClass?.name}` : "No class selected"}
        </Badge>
      </div>

      <Card variant="glass" className="p-4">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Quick actions</p>
            <p className="text-xs text-foreground/60">Select a class once and use it for attendance sessions.</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value)
                setSessionStartTime(null)
              }}
              className="w-full sm:w-96 px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl text-foreground"
            >
              <option value="">Select a class...</option>
              {myClasses.map((cls: any) => (
                <option key={String(cls?.id)} value={String(cls?.id)}>
                  {cls?.name || "Untitled Class"}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="rounded-xl sm:self-auto"
              onClick={() => {
                setSelectedClassId("")
                setSessionStartTime(null)
              }}
              disabled={!selectedClassId && !sessionStartTime}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-2xl">
          <TabsTrigger value="overview" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="dataset" className="gap-2">
            <Smile className="w-4 h-4" />
            Dataset
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Grades
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="w-4 h-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="min-w-0 lg:col-span-2 space-y-6">
            {/* ATTENDANCE TAB (restored full facial attendance flow) */}
            <TabsContent value="attendance" className="space-y-6 animate-in fade-in-0">
              <div className="space-y-6">
                <Card variant="glass" className="min-w-0 overflow-hidden p-6">
                  <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
                    <div className="min-w-0 space-y-1 lg:max-w-md xl:max-w-lg">
                      <h3 className="text-lg font-semibold text-foreground">Start Facial Attendance Session</h3>
                      <p className="text-sm text-foreground/60">
                        Pick class + method, then start the attendance session.
                      </p>
                    </div>
                    <div className="grid min-w-0 w-full flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]">
                      <Input
                        value={selectedClass ? String(selectedClass?.name || "") : ""}
                        readOnly
                        placeholder="Select a class above…"
                        className="w-full bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                      <select
                        value={selectedAttendanceMethod}
                        onChange={(e) => setSelectedAttendanceMethod(e.target.value as AttendanceMethod)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl text-foreground"
                      >
                        <option value="live">Live facial attendance</option>
                        <option value="photo">Class photo attendance</option>
                        <option value="roster">Student roster</option>
                      </select>
                      <Button
                        onClick={() => {
                          if (!selectedClassId) return
                          setSessionStartTime(new Date())
                        }}
                        disabled={!selectedClassId}
                        className="whitespace-nowrap md:self-stretch"
                      >
                        Start
                      </Button>
                    </div>
                  </div>
                </Card>
                {sessionStartTime && selectedClass ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
                      <div className="text-sm text-foreground/60">
                        Session running for <span className="font-medium text-foreground">{selectedClass?.name}</span>
                      </div>
                      <Button variant="outline" onClick={() => setSessionStartTime(null)}>
                        Back to class selection
                      </Button>
                    </div>
                    <AttendanceSession
                      classId={String(selectedClass.id)}
                      className={String(selectedClass.name || "Untitled Class")}
                      startTime={sessionStartTime}
                      initialTab={selectedAttendanceMethod}
                    />
                  </div>
                ) : (
                  <Card variant="glass" className="p-6">
                    <p className="text-foreground/60">
                      Select a class, choose a method, and click <span className="font-medium text-foreground">Start</span>{" "}
                      to open attendance.
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* DATASET TAB (faces DB) */}
            <TabsContent value="dataset" className="animate-in fade-in-0">
              <div className="space-y-4">
                <Card variant="glass" className="p-4">
                  <p className="text-sm font-medium text-foreground mb-2">Dataset scope</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={datasetClassId}
                      onChange={(e) => {
                        setDatasetClassId(e.target.value)
                        setDatasetSectionId("")
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl text-foreground"
                    >
                      <option value="">Select class...</option>
                      {myClasses.map((cls: any) => (
                        <option key={String(cls?.id)} value={String(cls?.id)}>
                          {cls?.name || "Untitled Class"}
                        </option>
                      ))}
                    </select>
                    <select
                      value={datasetSectionId}
                      onChange={(e) => setDatasetSectionId(e.target.value)}
                      disabled={!selectedDatasetClass}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl text-foreground disabled:opacity-60"
                    >
                      <option value="">All sections</option>
                      {(selectedDatasetClass?.sections || []).map((sec: any) => (
                        <option key={String(sec?.id)} value={String(sec?.id)}>
                          {sec?.name || "Unnamed Section"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-foreground/60 mt-2">
                    If section-wise student assignment is missing, class-level scope is used.
                  </p>
                </Card>
                <StudentDatasetManager
                  allowedStudentIds={datasetScopedStudentIds}
                  contextLabel={datasetScopeLabel}
                />
              </div>
            </TabsContent>

            {/* GRADES TAB */}
            <TabsContent value="grades" className="animate-in fade-in-0">
              <GradesManager />
            </TabsContent>

            {/* STUDENTS TAB */}
            <TabsContent value="students" className="space-y-4 animate-in fade-in-0">
              <div className="space-y-4">
                {myClasses.length === 0 ? (
                  <Card variant="glass" className="p-6">
                    <p className="text-sm text-foreground/60">No classes assigned yet.</p>
                  </Card>
                ) : (
                  myClasses.map((cls: any) => {
                    const classId = String(cls?.id || "")
                    const classStudents = studentsByClass.get(classId) || []
                    return (
                      <Card key={classId} variant="glass" className="p-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-foreground">{String(cls?.name || "Untitled Class")}</h3>
                          <Badge className="bg-primary/20 text-primary">{classStudents.length}</Badge>
                        </div>
                        {(cls?.sections || []).length > 0 ? (
                          <div className="space-y-3">
                            {(cls.sections || []).map((sec: any) => {
                              const secId = String(sec?.id || "")
                              const sectionStudents = classStudents.filter((s: any) => {
                                const mappedSectionId = s?.sectionAssignments?.[classId]
                                if (mappedSectionId) return String(mappedSectionId) === secId
                                const sectionIds = Array.isArray(s?.sectionIds) ? s.sectionIds.map(String) : []
                                const singleSectionId = s?.sectionId ? String(s.sectionId) : ""
                                return sectionIds.includes(secId) || singleSectionId === secId
                              })
                              return (
                                <div key={secId} className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-foreground">{String(sec?.name || "Unnamed Section")}</p>
                                    <Badge variant="outline" className="bg-transparent">
                                      {sectionStudents.length}
                                    </Badge>
                                  </div>
                                  {sectionStudents.length === 0 ? (
                                    <p className="text-xs text-foreground/60">No students mapped to this section.</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {sectionStudents.map((s: any) => (
                                        <p key={String(s?.id)} className="text-xs text-foreground/80">
                                          {String(s?.name || "Unnamed")} ({String(s?.id || "N/A")})
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3">
                              <p className="text-xs font-semibold text-foreground mb-1">Unassigned section</p>
                              {classStudents.filter((s: any) => {
                                const mappedSectionId = s?.sectionAssignments?.[classId]
                                if (mappedSectionId) return false
                                const sectionIds = Array.isArray(s?.sectionIds) ? s.sectionIds : []
                                const singleSectionId = s?.sectionId
                                return !sectionIds.length && !singleSectionId
                              }).length === 0 ? (
                                <p className="text-xs text-foreground/60">None</p>
                              ) : (
                                classStudents
                                  .filter((s: any) => {
                                    const mappedSectionId = s?.sectionAssignments?.[classId]
                                    if (mappedSectionId) return false
                                    const sectionIds = Array.isArray(s?.sectionIds) ? s.sectionIds : []
                                    const singleSectionId = s?.sectionId
                                    return !sectionIds.length && !singleSectionId
                                  })
                                  .map((s: any) => (
                                    <p key={String(s?.id)} className="text-xs text-foreground/80">
                                      {String(s?.name || "Unnamed")} ({String(s?.id || "N/A")})
                                    </p>
                                  ))
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {classStudents.length === 0 ? (
                              <p className="text-sm text-foreground/60">No students in this class yet.</p>
                            ) : (
                              classStudents.map((s: any) => (
                                <div
                                  key={String(s?.id)}
                                  className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
                                >
                                  <p className="text-sm font-semibold text-foreground">{String(s?.name || "Unnamed Student")}</p>
                                  <p className="text-xs text-foreground/60 mt-1">ID: {String(s?.id || "N/A")}</p>
                                  {s?.rollNumber ? (
                                    <p className="text-xs text-foreground/60">Reg No: {String(s.rollNumber)}</p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* SCHEDULE TAB */}
            <TabsContent value="schedule" className="space-y-4 animate-in fade-in-0">
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Class schedule</h3>
                  <Badge className="bg-primary/20 text-primary">{myClasses.length}</Badge>
                </div>
                {myClasses.length === 0 ? (
                  <p className="text-sm text-foreground/60">No classes found to show schedule.</p>
                ) : (
                  <div className="space-y-3">
                    {myClasses.map((cls: any) => (
                      <div
                        key={String(cls?.id || cls?.name)}
                        className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{String(cls?.name || "Untitled Class")}</p>
                          <ListChecks className="w-4 h-4 text-foreground/50" />
                        </div>
                        <p className="text-xs text-foreground/65 mt-2">
                          Day: {String(cls?.day || "Not set")} · Time:{" "}
                          {cls?.startTime && cls?.endTime
                            ? `${String(cls.startTime)} - ${String(cls.endTime)}`
                            : "Not set"}
                        </p>
                        <p className="text-xs text-foreground/65 mt-1">
                          Room: {String(cls?.room || cls?.location || "Not set")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in-0">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card variant="glass" className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground/60">My Classes</p>
                        <p className="text-2xl font-bold text-foreground">{myClasses.length}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-primary/40" />
                    </div>
                  </Card>
                  <Card variant="glass" className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground/60">Total Students</p>
                        <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                      </div>
                      <Users className="w-8 h-8 text-primary/40" />
                    </div>
                  </Card>
                  <Card variant="glass" className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground/60">Attendance Records Today</p>
                        <p className="text-2xl font-bold text-primary">{todayAttendanceCount}</p>
                      </div>
                      <ClipboardCheck className="w-8 h-8 text-primary/40" />
                    </div>
                  </Card>
                </div>

                <Card variant="glass" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Classes</h3>
                    <Badge className="bg-primary/20 text-primary">{myClasses.length ? "Loaded" : "No classes"}</Badge>
                  </div>
                  {myClasses.length === 0 ? (
                    <p className="text-foreground/60">
                      No class data found yet. Ask an admin to add classes in the Admin Dashboard (Settings & Data).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myClasses.map((cls: any) => (
                        <div
                          key={cls?.id || cls?.name}
                          className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl"
                        >
                          <div>
                            <p className="font-medium text-foreground">{cls?.name || "Untitled Class"}</p>
                            <p className="text-sm text-foreground/60 mt-1">Teacher: {cls?.classTeacher || "Unassigned"}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-accent/20 text-accent">Active</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>
          </div>

          <div className="lg:col-span-1">
            <Card variant="glass" className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  Announcements
                </p>
                <Badge variant="outline" className="bg-transparent">
                  {
                    announcements.filter((a) => a.audience === "all" || a.audience === "teachers").length
                  }
                </Badge>
              </div>
              <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {announcements
                  .filter((a) => a.audience === "all" || a.audience === "teachers")
                  .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                  .slice(0, 20)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 hover:bg-[var(--glass-bg-strong)] transition-colors"
                    >
                      <p className="text-sm font-semibold text-foreground">{a.title}</p>
                      <p className="text-xs text-foreground/70 mt-1 whitespace-pre-wrap">{a.message}</p>
                      <p className="text-[10px] text-foreground/50 mt-2">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                {announcements.filter((a) => a.audience === "all" || a.audience === "teachers").length === 0 ? (
                  <p className="text-sm text-foreground/60">No announcements yet.</p>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

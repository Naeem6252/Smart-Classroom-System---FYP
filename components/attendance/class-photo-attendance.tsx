"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Upload, Image as ImageIcon } from "lucide-react"
import { loadFaceApiModelWeights, loadImageFromUrl } from "@/lib/face-api-models"

interface StudentData {
  studentId: string
  studentName: string
  embedding?: number[]
}

interface MatchResult {
  studentId: string
  studentName: string
  confidence: number
}

interface DetectionPreview {
  label: string
  confidence: number
  matched: boolean
  box: { x: number; y: number; width: number; height: number }
}

interface ClassPhotoAttendanceProps {
  classId: string
  sessionActive: boolean
  enrolledStudentIds?: string[]
  confidenceThreshold?: number
  onAttendanceMarked?: (student: { id: string; name: string; confidence: number; timestamp: Date }) => void
}

const FACE_DISTANCE_THRESHOLD = 0.56
const FACE_AMBIGUITY_MARGIN = 0.035
const MIN_FACE_BOX_SIZE_PX = 36
const MIN_FACE_AREA_RATIO = 0.003
const MIN_DISTANCE_THRESHOLD = 0.5
const MAX_DISTANCE_THRESHOLD = 0.62

function euclideanDistance(a: number[], b: number[]) {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

function getDistanceThreshold(confidenceThreshold: number) {
  const normalized = Math.min(0.95, Math.max(0.4, confidenceThreshold))
  const ratio = (normalized - 0.4) / (0.95 - 0.4)
  return MAX_DISTANCE_THRESHOLD - ratio * (MAX_DISTANCE_THRESHOLD - MIN_DISTANCE_THRESHOLD)
}

export function ClassPhotoAttendance({
  classId,
  sessionActive,
  enrolledStudentIds,
  confidenceThreshold = 0.75,
  onAttendanceMarked,
}: ClassPhotoAttendanceProps) {
  const effectiveDistanceThreshold = getDistanceThreshold(confidenceThreshold)
  const [selectedImageData, setSelectedImageData] = useState<string>("")
  const [annotatedImageData, setAnnotatedImageData] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string>("Upload a class photo to mark attendance.")
  const [lastMatches, setLastMatches] = useState<MatchResult[]>([])

  const rosterKey = useMemo(() => {
    if (enrolledStudentIds === undefined) return "__all__"
    if (enrolledStudentIds.length === 0) return "__empty__"
    return [...enrolledStudentIds].map(String).sort().join("\0")
  }, [enrolledStudentIds])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImageData(String(reader.result || ""))
      setAnnotatedImageData("")
      setMessage("Image loaded. Click 'Process Photo' to detect faces.")
      setLastMatches([])
    }
    reader.readAsDataURL(file)
  }

  const processPhoto = async () => {
    if (!selectedImageData || !sessionActive) return
    setIsProcessing(true)
    setMessage("Processing photo...")
    setLastMatches([])
    setAnnotatedImageData("")

    try {
      const datasetRes = await fetch("/api/students/dataset")
      const datasetJson = (await datasetRes.json()) as { ok: boolean; data?: StudentData[] }
      if (!datasetRes.ok || !datasetJson.ok || !Array.isArray(datasetJson.data)) {
        setMessage("Could not load student dataset.")
        return
      }

      let dataset = datasetJson.data
      if (enrolledStudentIds !== undefined) {
        const allow = new Set(enrolledStudentIds.map((id) => String(id)))
        dataset = dataset.filter((s) => allow.has(String(s.studentId)))
      }
      if (dataset.length === 0) {
        setMessage("No enrolled students with dataset entries found.")
        return
      }

      const withEmbeddings = dataset.filter((s) => Array.isArray(s.embedding) && s.embedding.length > 0)
      if (withEmbeddings.length === 0) {
        setMessage("No facial embeddings found for enrolled students.")
        return
      }

      const faceapi = await import("@vladmandic/face-api")
      await loadFaceApiModelWeights(faceapi)
      const img = await loadImageFromUrl(selectedImageData)
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors()

      if (detections.length === 0) {
        setMessage("No faces detected in the uploaded photo.")
        return
      }

      const matches: MatchResult[] = []
      const previews: DetectionPreview[] = []
      const seenStudentIds = new Set<string>()
      let rejectedSmallFaces = 0
      let rejectedAmbiguousFaces = 0

      for (const det of detections) {
        const box = det.detection.box
        const boxArea = box.width * box.height
        const imageArea = (img.naturalWidth || img.width) * (img.naturalHeight || img.height)
        const faceLargeEnough =
          Math.min(box.width, box.height) >= MIN_FACE_BOX_SIZE_PX &&
          imageArea > 0 &&
          boxArea / imageArea >= MIN_FACE_AREA_RATIO

        const detected = det.descriptor ? Array.from(det.descriptor) : []
        if (detected.length === 0) continue

        if (!faceLargeEnough) {
          rejectedSmallFaces += 1
          previews.push({
            label: "Unknown",
            confidence: 0,
            matched: false,
            box: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            },
          })
          continue
        }

        const candidates: Array<{ studentId: string; studentName: string; distance: number; confidence: number }> = []
        for (const s of withEmbeddings) {
          if (!s.embedding || s.embedding.length !== detected.length) continue
          const distance = euclideanDistance(detected, s.embedding)
          const confidence = Math.max(0, Math.min(1, 1 - distance / MAX_DISTANCE_THRESHOLD))
          candidates.push({
            studentId: s.studentId,
            studentName: s.studentName,
            distance,
            confidence,
          })
        }

        candidates.sort((a, b) => a.distance - b.distance)
        const best = candidates[0]
        const second = candidates[1]
        const withinThreshold = !!best && best.distance <= effectiveDistanceThreshold
        const clearlyBest = !second || (second.distance - (best?.distance ?? 0)) >= FACE_AMBIGUITY_MARGIN
        const matched = !!best && withinThreshold && clearlyBest

        if (matched && best) {
          if (!seenStudentIds.has(best.studentId)) {
            seenStudentIds.add(best.studentId)
            matches.push({
              studentId: best.studentId,
              studentName: best.studentName,
              confidence: best.confidence,
            })
          }
          previews.push({
            label: best.studentName,
            confidence: best.confidence,
            matched: true,
            box: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            },
          })
        } else {
          if (best) rejectedAmbiguousFaces += 1
          previews.push({
            label: "Unknown",
            confidence: best?.confidence ?? 0,
            matched: false,
            box: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
            },
          })
        }
      }

      const previewCanvas = document.createElement("canvas")
      previewCanvas.width = img.naturalWidth || img.width
      previewCanvas.height = img.naturalHeight || img.height
      const ctx = previewCanvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height)
        ctx.lineWidth = 3
        ctx.font = "bold 16px system-ui, sans-serif"

        for (const p of previews) {
          ctx.strokeStyle = p.matched ? "#22c55e" : "#ef4444"
          ctx.fillStyle = p.matched ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"
          ctx.fillRect(p.box.x, p.box.y, p.box.width, p.box.height)
          ctx.strokeRect(p.box.x, p.box.y, p.box.width, p.box.height)

          const label = p.matched ? `${p.label} (${Math.round(p.confidence * 100)}%)` : "Unknown"
          const textWidth = ctx.measureText(label).width
          const lx = p.box.x
          const ly = Math.max(0, p.box.y - 26)
          ctx.fillStyle = p.matched ? "#166534" : "#991b1b"
          ctx.fillRect(lx, ly, textWidth + 12, 24)
          ctx.fillStyle = "#ffffff"
          ctx.fillText(label, lx + 6, ly + 17)
        }
        setAnnotatedImageData(previewCanvas.toDataURL("image/jpeg", 0.9))
      }

      if (matches.length === 0) {
        setMessage(
          `Detected ${detections.length} face(s), but no safe roster match was found. Rejected ${rejectedSmallFaces} small/unclear face(s) and ${rejectedAmbiguousFaces} weak or ambiguous match(es).`,
        )
        return
      }

      const today = new Date().toISOString().split("T")[0]
      await Promise.all(
        matches.map(async (m) => {
          const now = new Date()
          await fetch("/api/attendance/mark", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              studentId: m.studentId,
              classId,
              date: today,
              status: "present",
              method: "face_recognition",
              markedAt: now.toISOString(),
              confidence: m.confidence,
            }),
          })
          onAttendanceMarked?.({
            id: m.studentId,
            name: m.studentName,
            confidence: m.confidence,
            timestamp: now,
          })
        }),
      )

      setLastMatches(matches)
      setMessage(
        `Detected ${detections.length} face(s). Safely marked ${matches.length} student(s). Rejected ${rejectedSmallFaces} small/unclear face(s) and ${rejectedAmbiguousFaces} weak or ambiguous match(es).`,
      )
    } catch (e) {
      console.error("[v0] Class photo attendance failed:", e)
      setMessage("Photo processing failed. Try a clearer image with visible faces.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground">Class photo attendance</h4>
        </div>

        <p className="text-sm text-foreground/70">
          Upload one class image. The system detects multiple faces and auto-marks matched enrolled students as present.
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          <Input type="file" accept="image/*" onChange={onFileChange} disabled={!sessionActive || isProcessing} />
          <Button onClick={processPhoto} disabled={!sessionActive || isProcessing || !selectedImageData} className="gap-2">
            <Upload className="w-4 h-4" />
            {isProcessing ? "Processing..." : "Process Photo"}
          </Button>
        </div>

        {selectedImageData ? (
          <div className="rounded-lg border border-border overflow-hidden bg-black/5">
            <img
              src={annotatedImageData || selectedImageData || "/placeholder.svg"}
              alt="Uploaded class with detection results"
              className="max-h-72 w-full object-contain"
            />
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-card/50 p-3 text-sm text-foreground/80">{message}</div>

        {lastMatches.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Students marked from this photo</p>
            <div className="flex flex-wrap gap-2">
              {lastMatches.map((m) => (
                <Badge key={m.studentId} variant="outline" className="bg-primary/5 border-primary/20">
                  {m.studentName} ({Math.round(m.confidence * 100)}%)
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

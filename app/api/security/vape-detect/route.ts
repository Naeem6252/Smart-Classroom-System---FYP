import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { NextResponse } from "next/server"

export const runtime = "nodejs"

function parseBase64Image(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const mime = match[1]
  const base64 = match[2]
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg"
  return { buffer: Buffer.from(base64, "base64"), ext }
}

function runPythonInferenceWithCommand(command: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const proc = spawn(command, args, { windowsHide: true })
    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk) => {
      stdout += String(chunk)
    })
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })

    proc.on("error", reject)
    proc.on("close", (code) => {
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

function looksLikeMissingPython(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes("python was not found") ||
    text.includes("app execution aliases") ||
    text.includes("not recognized as an internal or external command") ||
    text.includes("enoent")
  )
}

function runPythonInference(imagePath: string, confidence: number) {
  return new Promise<{ ok: boolean; [k: string]: any }>((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "vape_detector", "infer_image.py")
    const scriptArgs = [scriptPath, imagePath, String(confidence)]

    const commands =
      process.platform === "win32"
        ? [
            { cmd: "py", args: ["-3", ...scriptArgs] },
            { cmd: "python", args: scriptArgs },
          ]
        : [{ cmd: "python3", args: scriptArgs }, { cmd: "python", args: scriptArgs }]

    ;(async () => {
      let lastError = ""
      for (const candidate of commands) {
        try {
          const res = await runPythonInferenceWithCommand(candidate.cmd, candidate.args)
          if (res.code !== 0) {
            const msg = (res.stderr || res.stdout || "").trim()
            lastError = msg || `Python inference failed with code ${res.code}`
            if (looksLikeMissingPython(lastError)) continue
            reject(new Error(lastError))
            return
          }
          const parsed = JSON.parse(res.stdout.trim())
          resolve(parsed)
          return
        } catch (e: any) {
          lastError = e?.message || String(e)
          if (looksLikeMissingPython(lastError)) continue
          reject(new Error(lastError))
          return
        }
      }
      reject(
        new Error(
          "Python runtime not available. Install Python 3 (and pip packages), then restart the app.",
        ),
      )
    })().catch((e) => reject(e))
  })
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const imageData = String(body?.imageData || "")
  const confidence = typeof body?.confidence === "number" ? body.confidence : 0.4
  const parsed = parseBase64Image(imageData)
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "imageData must be a data URL image" }, { status: 400 })
  }

  const filePath = path.join(
    os.tmpdir(),
    `vape-detect-${Date.now()}-${Math.random().toString(36).slice(2)}.${parsed.ext}`,
  )

  try {
    await fs.writeFile(filePath, parsed.buffer)
    const result = await runPythonInference(filePath, confidence)
    return NextResponse.json({ ...result, ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to run vape detection inference" },
      { status: 500 },
    )
  } finally {
    try {
      await fs.unlink(filePath)
    } catch {
      // ignore
    }
  }
}

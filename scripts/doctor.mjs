import { existsSync } from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const root = process.cwd()
const checks = []

function run(command) {
  return execSync(command, { stdio: "pipe", encoding: "utf8" }).trim()
}

function runNpmVersion() {
  if (process.platform === "win32") {
    try {
      return run("npm -v")
    } catch {
      const npmCmd = "C:\\Program Files\\nodejs\\npm.cmd"
      if (existsSync(npmCmd)) {
        return run(`"${npmCmd}" -v`)
      }
      throw new Error("npm not found in PATH. Reopen terminal/Cursor after Node install.")
    }
  }
  return run("npm -v")
}

function addCheck(name, fn) {
  try {
    const detail = fn()
    checks.push({ name, ok: true, detail })
  } catch (error) {
    checks.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

addCheck("Node runtime", () => run("node -v"))
addCheck("npm runtime", () => runNpmVersion())
addCheck("Project dependencies", () => {
  const lock = path.join(root, "package-lock.json")
  const modules = path.join(root, "node_modules")
  if (!existsSync(lock)) throw new Error("package-lock.json missing")
  if (!existsSync(modules)) throw new Error("node_modules missing (run npm install --legacy-peer-deps)")
  return "package-lock + node_modules present"
})

addCheck("Python launcher", () => run("py -3 --version"))
addCheck("Vape detector files", () => {
  const script = path.join(root, "vape_detector", "infer_image.py")
  const model = path.join(root, "vape_detector", "best.pt")
  if (!existsSync(script)) throw new Error("vape_detector/infer_image.py missing")
  if (!existsSync(model)) throw new Error("vape_detector/best.pt missing")
  return "infer_image.py + best.pt present"
})
addCheck("Python vape dependencies", () => run('py -3 -c "import ultralytics, cv2; print(\'ok\')"'))

console.log("\nSmartClass local doctor\n")
for (const c of checks) {
  const icon = c.ok ? "[OK]" : "[FAIL]"
  console.log(`${icon} ${c.name} - ${c.detail}`)
}

const failed = checks.filter((c) => !c.ok)
if (failed.length > 0) {
  console.log("\nFix the failing checks, then run: npm run doctor")
  process.exit(1)
}

console.log("\nAll checks passed. Safe to run: npm run dev\n")

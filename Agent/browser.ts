import { spawn, execSync } from "child_process"
import { join } from "path"
import { existsSync } from "fs"

function getWebcmdPath(): string {
  const isWin = process.platform === "win32"
  const localBin = join(process.cwd(), "node_modules", ".bin", "webcmd")
  const globalNpm = join(process.env.APPDATA || "", "npm", "webcmd")

  // On Windows prefer .cmd over the no-extension shell script
  if (isWin) {
    if (existsSync(localBin + ".cmd")) return localBin + ".cmd"
    if (existsSync(localBin)) return localBin
    if (existsSync(localBin + ".ps1")) return localBin + ".ps1"
    if (existsSync(globalNpm + ".cmd")) return globalNpm + ".cmd"
    if (existsSync(globalNpm)) return globalNpm
    return "webcmd.cmd"
  }

  if (existsSync(localBin)) return localBin
  if (existsSync(localBin + ".cmd")) return localBin + ".cmd"
  if (existsSync(localBin + ".ps1")) return localBin + ".ps1"
  if (existsSync(globalNpm)) return globalNpm
  if (existsSync(globalNpm + ".cmd")) return globalNpm + ".cmd"
  return "webcmd"
}

const WEBCMD = getWebcmdPath()
const DEBUG = process.env.DEBUG_WEBCMD === "true" || process.env.DEBUG_WEBCMD === "1"

export class WebcmdError extends Error {
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
  elapsedMs: number

  constructor(
    message: string,
    command: string,
    exitCode: number | null,
    stdout: string,
    stderr: string,
    elapsedMs: number,
  ) {
    super(message)
    this.name = "WebcmdError"
    this.command = command
    this.exitCode = exitCode
    this.stdout = stdout
    this.stderr = stderr
    this.elapsedMs = elapsedMs
  }
}

export class BrowserSession {
  private sessionName: string
  private timeout: number

  constructor(sessionName = "atlas-bms", timeout = 45000) {
    this.sessionName = sessionName
    this.timeout = timeout
  }

  private shellQuote(s: string): string {
    if (/^[a-zA-Z0-9_\/\\\.\:\-]+$/.test(s)) return s
    // cmd.exe uses "" to escape a double-quote inside double-quotes, not \"
    return `"${s.replace(/"/g, '""')}"`
  }

  private async webcmd(args: string[], cmdTimeout?: number, verbose = false): Promise<string> {
    const fullArgs = ["browser", this.sessionName, ...args]
    const commandStr = `webcmd ${fullArgs.join(" ")}`
    const cmdLine = `${this.shellQuote(WEBCMD)} ${fullArgs.map(a => this.shellQuote(a)).join(" ")}`
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const child = spawn(cmdLine, [], {
        shell: true,
        timeout: cmdTimeout ?? this.timeout,
        env: {
          ...process.env,
          WEBCMD_WINDOW: "background",
          WEBCMD_BROWSER_COMMAND_TIMEOUT: String((cmdTimeout ?? this.timeout) / 1000),
        } as unknown as NodeJS.ProcessEnv,
        windowsHide: true,
      })

      let stdout = ""
      let stderr = ""

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString()
      })

      child.on("close", (code) => {
        const elapsed = Date.now() - start

        if (DEBUG || verbose) {
          console.log(`[webcmd-verbose] Command:\n${commandStr}`)
          console.log(`[webcmd-verbose] Exit Code: ${code}`)
          console.log(`[webcmd-verbose] Elapsed: ${elapsed}ms`)
          console.log(`[webcmd-verbose] stdout:\n"${stdout.trim()}"`)
          if (stderr.trim()) console.log(`[webcmd-verbose] stderr:\n"${stderr.trim()}"`)
        }

        if (stderr.trim() && !stderr.includes("Warning")) {
          console.warn(`[webcmd:${this.sessionName}] ${stderr.trim()}`)
        }

        if (code === 0 || code === null) {
          resolve(stdout.trim())
        } else {
          const errMsg = stderr?.trim() || stdout?.trim() || `exited with code ${code}`
          reject(new WebcmdError(
            `webcmd exited with code ${code}: ${errMsg}`,
            commandStr,
            code,
            stdout.trim(),
            stderr.trim(),
            elapsed,
          ))
        }
      })

      child.on("error", (err) => {
        const elapsed = Date.now() - start

        if (DEBUG || verbose) {
          console.log(`[webcmd-verbose] Command:\n${commandStr}`)
          console.log(`[webcmd-verbose] Error: ${err.message}`)
          console.log(`[webcmd-verbose] Elapsed: ${elapsed}ms`)
        }

        reject(new WebcmdError(
          `webcmd spawn error: ${err.message}`,
          commandStr,
          null,
          "",
          err.message,
          elapsed,
        ))
      })
    })
  }

  async open(url: string): Promise<void> {
    await this.webcmd(["open", url])
  }

  async wait(condition: string, value: string, timeoutMs = 15000): Promise<void> {
    await this.webcmd(["wait", condition, value, "--timeout", String(timeoutMs)], timeoutMs + 5000)
  }

  async find(options: { css?: string; role?: string; name?: string; text?: string }): Promise<string> {
    const args: string[] = ["find"]
    if (options.css) args.push("--css", options.css)
    if (options.role) args.push("--role", options.role)
    if (options.name) args.push("--name", options.name)
    if (options.text) args.push("--text", options.text)
    args.push("--limit", "10")
    return this.webcmd(args)
  }

  async findAll(options: { css?: string; role?: string; name?: string; text?: string; label?: string; limit?: number; textMax?: number }): Promise<{ matches_n: number; entries: any[] }> {
    const args: string[] = ["find"]
    if (options.css) args.push("--css", options.css)
    if (options.role) args.push("--role", options.role)
    if (options.name) args.push("--name", options.name)
    if (options.text) args.push("--text", options.text)
    if (options.label) args.push("--label", options.label)
    args.push("--limit", String(options.limit ?? 50))
    if (options.textMax) args.push("--text-max", String(options.textMax))
    const raw = await this.webcmd(args)
    return JSON.parse(raw) as { matches_n: number; entries: any[] }
  }

  async type(targetText: string, text: string): Promise<void> {
    await this.webcmd(["type", targetText, text])
  }

  async typeByRole(role: string, name: string, text: string): Promise<void> {
    await this.webcmd(["type", "--role", role, "--name", name, text])
  }

  async click(target: string): Promise<void> {
    await this.webcmd(["click", target])
  }

  async clickByRole(role: string, name: string): Promise<void> {
    await this.webcmd(["click", "--role", role, "--name", name])
  }

  async clickByText(text: string): Promise<void> {
    await this.webcmd(["click", "--text", text])
  }

  async keys(key: string): Promise<void> {
    await this.webcmd(["keys", key])
  }

  async eval<T>(js: string): Promise<T> {
    // Collapse whitespace to avoid shell breaking on newlines in the command line
    const singleLine = js.replace(/\s+/g, " ")
    const label = singleLine.slice(0, 80)
    console.log(`[browser:eval] enter: ${label}`)
    const result = await this.webcmd(["eval", singleLine], undefined, true)
    console.log(`[browser:eval] done: ${label} (${result.length} chars) raw: "${result.slice(0, 120)}"`)
    const trimmed = result.trim()
    if (trimmed === "undefined") return undefined as T
    if (trimmed === "null") return null as T
    if (trimmed === "true") return true as T
    if (trimmed === "false") return false as T
    if (trimmed === "") throw new Error(`eval returned empty result for: ${label}`)
    try {
      return JSON.parse(trimmed) as T
    } catch {
      // Not JSON — webcmd returns primitives (strings, numbers) without JSON wrapping
      return trimmed as T
    }
  }

  async state(): Promise<{ url: string; title: string }> {
    const result = await this.webcmd(["state"])
    const urlMatch = result.match(/^URL:\s*(.+)$/m)
    const titleMatch = result.match(/^title:\s*(.*)$/m)
    return {
      url: urlMatch?.[1]?.trim() ?? "",
      title: titleMatch?.[1]?.trim() ?? "",
    }
  }

  async close(): Promise<void> {
    try {
      await this.webcmd(["close"])
    } catch (err) {
      console.error(`[browser:${this.sessionName}] close failed:`, err instanceof Error ? err.message : String(err))
    }
  }
}

export async function checkWebcmdInstalled(): Promise<boolean> {
  try {
    execSync(`"${WEBCMD}" --version`, { timeout: 5000, windowsHide: true })
    return true
  } catch (err) {
    console.error("[webcmd] checkWebcmdInstalled failed:", err instanceof Error ? err.message : String(err))
    return false
  }
}

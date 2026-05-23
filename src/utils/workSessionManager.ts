/**
 * Work session manager for tracking user work time
 * Handles start, break, resume, and clock out actions
 */

export interface WorkSession {
  userId: string
  startTime: number
  breakTime: number | null
  totalBreakDuration: number // in milliseconds
  status: 'idle' | 'working' | 'break'
  screenshots: Screenshot[]
}

export interface Screenshot {
  timestamp: number
  filename: string
  extractedText: string
}

class WorkSessionManager {
  private sessions: Map<string, WorkSession> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  startWorkSession(userId: string): WorkSession {
    const session: WorkSession = {
      userId,
      startTime: Date.now(),
      breakTime: null,
      totalBreakDuration: 0,
      status: 'working',
      screenshots: []
    }
    this.sessions.set(userId, session)
    return session
  }

  takeBreak(userId: string): WorkSession | null {
    const session = this.sessions.get(userId)
    if (!session || session.status === 'break') return null

    session.status = 'break'
    session.breakTime = Date.now()
    return session
  }

  resumeWork(userId: string): WorkSession | null {
    const session = this.sessions.get(userId)
    if (!session || session.status === 'working') return null

    if (session.breakTime) {
      const breakDuration = Date.now() - session.breakTime
      session.totalBreakDuration += breakDuration
    }
    session.status = 'working'
    session.breakTime = null
    return session
  }

  addScreenshot(userId: string, filename: string, extractedText: string): boolean {
    const session = this.sessions.get(userId)
    if (!session) return false

    session.screenshots.push({
      timestamp: Date.now(),
      filename,
      extractedText
    })
    return true
  }

  getElapsedTime(userId: string): number | null {
    const session = this.sessions.get(userId)
    if (!session) return null

    const now = Date.now()
    let elapsed = now - session.startTime - session.totalBreakDuration

    if (session.breakTime) {
      elapsed -= (now - session.breakTime)
    }

    return elapsed
  }

  clockOut(userId: string): WorkSession | null {
    const session = this.sessions.get(userId)
    if (!session) return null

    // Clear any active timer
    const timer = this.timers.get(userId)
    if (timer) clearInterval(timer)
    this.timers.delete(userId)

    // Store final time
    const elapsedTime = this.getElapsedTime(userId)

    // Remove session
    this.sessions.delete(userId)

    return { ...session, breakTime: null, status: 'idle' }
  }

  getSession(userId: string): WorkSession | undefined {
    return this.sessions.get(userId)
  }

  getAllSessions(): WorkSession[] {
    return Array.from(this.sessions.values())
  }
}

export const workSessionManager = new WorkSessionManager()

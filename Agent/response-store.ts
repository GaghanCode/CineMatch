type Resolver = (value: string) => void

const store = new Map<string, Resolver>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const ResponseStore = {
  wait(requestId: string, timeoutMs = 180000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        store.delete(requestId)
        timers.delete(requestId)
        reject(new Error(`Response timed out for request ${requestId}`))
      }, timeoutMs)
      timers.set(requestId, timer)
      store.set(requestId, resolve)
    })
  },

  respond(requestId: string, response: string): boolean {
    const resolver = store.get(requestId)
    if (!resolver) return false
    const timer = timers.get(requestId)
    if (timer) clearTimeout(timer)
    store.delete(requestId)
    timers.delete(requestId)
    resolver(response)
    return true
  },

  cancel(requestId: string): void {
    const timer = timers.get(requestId)
    if (timer) clearTimeout(timer)
    store.delete(requestId)
    timers.delete(requestId)
  },
}

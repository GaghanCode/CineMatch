"use client"

const prompts = [
  "Book a movie tonight in Hyderabad",
  "Find the best IMAX show near me",
  "Compare theatres for Oppenheimer",
]

export function PromptChips({ onFill }: { onFill: (text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onFill(prompt)}
          className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-[11px] font-medium text-muted backdrop-blur-xl transition-all duration-300 hover:border-accent/30 hover:bg-card hover:text-primary"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}

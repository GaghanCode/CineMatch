"use client"

import { useEffect, useRef } from "react"

const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

// Cinema interior with red seats - Pexels video (people watching 3D movie)
const VIDEO_SRC =
  "https://videos.pexels.com/video-files/7988165/7988165-hd_2048_1080_25fps.mp4"

const VIDEO_POSTER =
  "https://images.pexels.com/videos/7988165/pexels-photo-7988165.jpeg?auto=compress&w=1600"

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Ensure the muted video starts playing
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().catch(() => {})
  }, [])

  // Slow drifting particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const count = 48
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      life: number
    }[] = []

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.04,
        size: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.1 + 0.02,
        life: Math.random() * 300,
      })
    }

    let raf = 0
    let tick = 0

    const animate = () => {
      tick++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        p.x += p.vx + Math.sin(tick * 0.0006 + p.life) * 0.015
        p.y += p.vy + Math.cos(tick * 0.0006 + p.life) * 0.015

        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
        if (p.y < -10) p.y = canvas.height + 10
        if (p.y > canvas.height + 10) p.y = -10

        const pulse = 0.6 + 0.4 * Math.sin(tick * 0.008 + p.life)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(229, 9, 20, ${p.alpha * pulse})`
        ctx.fill()
      }

      raf = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Netflix-style red ambient glow layers */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(229, 9, 20, 0.09) 0%, transparent 50%), " +
            "radial-gradient(circle at top left, rgba(229, 9, 20, 0.06) 0%, transparent 35%), " +
            "radial-gradient(circle at bottom right, rgba(178, 7, 16, 0.06) 0%, transparent 35%), " +
            "#0A0A0A",
        }}
      />

      {/* Background video — cinema interior with red seats */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30"
        src={VIDEO_SRC}
        poster={VIDEO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{ filter: "brightness(1.4) contrast(1.05) saturate(0.9)" }}
      />

      {/* Lighter base overlay */}
      <div className="absolute inset-0 bg-background/50" />

      {/* Soft center glow */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(229, 9, 20, 0.05) 0%, transparent 70%)",
        }}
      />

      {/* Subtle vignette - dark corners */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(10, 10, 10, 0.3) 70%, rgba(10, 10, 10, 0.6) 100%)",
        }}
      />

      {/* Subtle scan line effect */}
      <div
        className="absolute inset-0 opacity-[0.02] animate-scan-line"
        style={{
          backgroundImage: "linear-gradient(180deg, transparent 50%, rgba(255,255,255,0.06) 50%)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 35%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 50%, black 35%, transparent 85%)",
        }}
      />

      {/* Slow particles */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{ backgroundImage: NOISE_URI, backgroundSize: "180px 180px" }}
      />

      {/* Edge glow accents */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 0% 0%, rgba(229,9,20,0.03) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 100% 0%, rgba(229,9,20,0.03) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 0% 100%, rgba(178,7,16,0.03) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 100% 100%, rgba(178,7,16,0.03) 0%, transparent 60%)",
        }}
      />
    </div>
  )
}
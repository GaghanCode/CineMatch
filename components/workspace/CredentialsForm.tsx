"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Phone, Lock } from "lucide-react"

export function CredentialsForm({
  onConfirm,
  disabled,
}: {
  onConfirm: (email: string, phone: string) => void
  disabled: boolean
}) {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({})

  const validate = () => {
    const e: { email?: string; phone?: string } = {}
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = "Enter a valid email address"
    }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
      e.phone = "Enter a valid 10-digit phone number"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 ml-[44px] rounded-3xl glass-panel p-6 shadow-card"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
          <Lock className="h-3.5 w-3.5 text-accent" />
        </span>
        <p className="text-sm font-semibold text-primary">
          Complete your booking
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        Enter your contact details to proceed with the payment.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-muted">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })) }}
              placeholder="eg: abc@gmail.com"
              className="w-full rounded-2xl border border-border bg-surface/80 pl-10 pr-4 py-3 text-sm text-primary placeholder-muted/50 outline-none transition-all duration-200 focus:border-accent/40 focus:bg-surface"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-[11px] text-error">{errors.email}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-muted">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })) }}
              placeholder="eg: 91480XXXXX"
              className="w-full rounded-2xl border border-border bg-surface/80 pl-10 pr-4 py-3 text-sm text-primary placeholder-muted/50 outline-none transition-all duration-200 focus:border-accent/40 focus:bg-surface"
            />
          </div>
          {errors.phone && <p className="mt-1.5 text-[11px] text-error">{errors.phone}</p>}
        </div>
        <motion.button
          whileHover={!disabled ? { scale: 1.01 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={() => { if (validate()) onConfirm(email.trim(), phone.trim()) }}
          disabled={disabled}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-dark px-3.5 py-3 text-sm font-semibold text-background shadow-glow transition-all duration-200 hover:shadow-glow-secondary disabled:opacity-40"
        >
          Continue to Payment
        </motion.button>
      </div>
    </motion.div>
  )
}

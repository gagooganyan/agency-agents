"use client";

import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease },
  }),
};

const stats = [
  { value: "$2.4B+", label: "Processed monthly" },
  { value: "40K+", label: "Businesses" },
  { value: "99.9%", label: "Uptime SLA" },
];

const badges = [
  { icon: Shield, text: "Bank-grade security" },
  { icon: Zap, text: "Instant transfers" },
  { icon: Globe, text: "150+ countries" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(192,132,252,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Badge */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mb-6 flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 rounded-full px-4 py-1.5"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-indigo-300 font-medium">Now with AI-powered insights →</span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        custom={1}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="text-5xl md:text-7xl font-bold text-center tracking-tight leading-[1.05] max-w-4xl"
      >
        Finance that
        <br />
        <span className="gradient-text">moves with you</span>
      </motion.h1>

      {/* Subtext */}
      <motion.p
        custom={2}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-6 text-lg text-gray-400 text-center max-w-xl leading-relaxed"
      >
        The all-in-one financial platform for modern businesses. Send, receive, and grow—without the old banking friction.
      </motion.p>

      {/* CTAs */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3"
      >
        <motion.a
          href="#"
          whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors"
        >
          Start for free
          <ArrowRight className="w-4 h-4" />
        </motion.a>
        <motion.a
          href="#"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
        >
          See how it works
        </motion.a>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-8 flex flex-wrap items-center justify-center gap-4"
      >
        {badges.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon className="w-3.5 h-3.5 text-indigo-400" />
            {text}
          </div>
        ))}
      </motion.div>

      {/* Dashboard mockup */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="mt-16 w-full max-w-4xl relative"
      >
        <div
          className="rounded-2xl overflow-hidden border border-white/10 relative"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)" }}
        >
          {/* Window bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <div className="ml-4 flex-1 h-5 bg-white/5 rounded max-w-xs text-xs text-gray-600 flex items-center px-3">
              app.fincash.io/dashboard
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-6 grid grid-cols-12 gap-4">
            {/* Sidebar */}
            <div className="col-span-2 space-y-2">
              {["Dashboard", "Payments", "Analytics", "Cards", "Settings"].map((item, i) => (
                <div
                  key={item}
                  className="h-7 rounded-lg text-xs flex items-center px-2 transition-colors"
                  style={{
                    background: i === 0 ? "rgba(99,102,241,0.2)" : "transparent",
                    color: i === 0 ? "#818cf8" : "#4b5563",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="col-span-10 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Balance", value: "$84,294.00", change: "+12.4%", up: true },
                  { label: "Monthly Income", value: "$12,840.00", change: "+8.2%", up: true },
                  { label: "Expenses", value: "$3,210.00", change: "-2.1%", up: false },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl p-3 border border-white/5"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="text-[10px] text-gray-500 mb-1">{card.label}</p>
                    <p className="text-sm font-semibold text-white">{card.value}</p>
                    <p className={`text-[10px] mt-0.5 ${card.up ? "text-green-400" : "text-red-400"}`}>
                      {card.change} this month
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart placeholder */}
              <div
                className="rounded-xl p-4 border border-white/5 h-28"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-end gap-1.5 h-full pb-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 + i * 0.04, ease: "easeOut" }}
                      className="flex-1 rounded-sm origin-bottom"
                      style={{
                        height: `${h}%`,
                        background: i === 10
                          ? "linear-gradient(to top, #6366f1, #818cf8)"
                          : "rgba(99,102,241,0.25)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Recent transactions */}
              <div className="space-y-2">
                {[
                  { name: "Stripe Inc.", amount: "+$4,200.00", type: "income" },
                  { name: "AWS Services", amount: "-$320.00", type: "expense" },
                  { name: "Vercel Pro", amount: "-$20.00", type: "expense" },
                ].map((tx) => (
                  <div
                    key={tx.name}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-900/50 flex items-center justify-center text-[9px] text-indigo-400 font-bold">
                        {tx.name[0]}
                      </div>
                      <span className="text-[11px] text-gray-300">{tx.name}</span>
                    </div>
                    <span className={`text-[11px] font-medium ${tx.type === "income" ? "text-green-400" : "text-gray-400"}`}>
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Glow below dashboard */}
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)", filter: "blur(20px)" }}
        />
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1, ease: "easeOut" }}
        className="mt-16 flex flex-wrap items-center justify-center gap-12"
      >
        {stats.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

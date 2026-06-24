"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, Shield, BarChart3, Globe, CreditCard, Bell } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Transfers",
    desc: "Move money globally in seconds, not days. Real-time settlement 24/7/365.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    desc: "256-bit encryption, 2FA, and fraud detection backed by machine learning.",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    desc: "AI-powered insights that surface trends before they become problems.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
  {
    icon: Globe,
    title: "150+ Currencies",
    desc: "Accept and send payments in any currency. Auto-convert at best rates.",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
  },
  {
    icon: CreditCard,
    title: "Virtual Cards",
    desc: "Issue unlimited virtual cards for your team. Set spend limits instantly.",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
  },
  {
    icon: Bell,
    title: "Real-time Alerts",
    desc: "Instant notifications for every transaction. Stay in control, always.",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3 block">
            Everything you need
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Built for the way
            <br />
            <span className="gradient-text">you actually work</span>
          </h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto text-lg">
            Every feature designed around real workflows. No bloat, no compromises.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <motion.div
              key={title}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors cursor-default"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200"
                style={{ background: bg }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

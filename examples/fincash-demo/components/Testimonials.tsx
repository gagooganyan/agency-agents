"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star } from "lucide-react";

const reviews = [
  {
    name: "Sarah Chen",
    role: "CFO at Lumos",
    text: "We replaced three separate tools with FinCash. Our finance team's efficiency went up 60% in the first month.",
    rating: 5,
    avatar: "SC",
    avatarBg: "#6366f1",
  },
  {
    name: "Marcus Webb",
    role: "Founder, Orbit Labs",
    text: "Global payroll used to take days. With FinCash it's 10 minutes. I can't imagine going back.",
    rating: 5,
    avatar: "MW",
    avatarBg: "#10b981",
  },
  {
    name: "Priya Nair",
    role: "Head of Ops, Synthex",
    text: "The analytics are genuinely insightful — it flagged a subscription billing issue before our accountant did.",
    rating: 5,
    avatar: "PN",
    avatarBg: "#ec4899",
  },
];

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3 block">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Loved by finance teams
            <br />
            <span className="gradient-text">worldwide</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map(({ name, role, text, rating, avatar, avatarBg }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">&ldquo;{text}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: avatarBg }}
                >
                  {avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{name}</p>
                  <p className="text-gray-500 text-xs">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    desc: "For individuals and small teams just getting started.",
    features: ["5 team members", "Unlimited transactions", "Virtual cards", "Basic analytics", "Email support"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "For growing businesses that need more power.",
    features: ["25 team members", "Priority transfers", "50 virtual cards", "AI analytics", "API access", "Priority support"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations with complex needs.",
    features: ["Unlimited members", "Custom limits", "Unlimited cards", "Dedicated manager", "SLA guarantee", "Custom integrations"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" className="py-24 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3 block">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Simple pricing,
            <br />
            <span className="gradient-text">no surprises</span>
          </h2>
          <p className="mt-4 text-gray-400 max-w-md mx-auto">
            Start free. Upgrade when you need to. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map(({ name, price, period, desc, features, cta, highlight }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="rounded-2xl p-6 border relative"
              style={{
                background: highlight
                  ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))"
                  : "rgba(255,255,255,0.02)",
                border: highlight ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.05)",
                boxShadow: highlight ? "0 0 60px rgba(99,102,241,0.12)" : "none",
              }}
            >
              {highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1 rounded-full"
                  style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
                >
                  Most popular
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-white font-semibold text-lg mb-1">{name}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{price}</span>
                <span className="text-gray-500 text-sm">{period}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-colors"
                style={{
                  background: highlight ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.06)",
                  color: highlight ? "white" : "#d1d5db",
                  border: highlight ? "none" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {cta}
              </motion.button>

              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: highlight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)" }}
                    >
                      <Check className="w-2.5 h-2.5 text-indigo-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, CreditCard, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create your account",
    desc: "Sign up in 2 minutes. No paperwork, no branch visits, no waiting.",
  },
  {
    icon: CreditCard,
    step: "02",
    title: "Connect & fund",
    desc: "Link your bank or fund with crypto. Money available instantly.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Send, spend, grow",
    desc: "Pay globally, issue cards, track everything — from one clean dashboard.",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 px-4 relative" ref={ref}>
      {/* subtle divider glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(99,102,241,0.4), transparent)" }}
      />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3 block">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Up and running
            <br />
            <span className="gradient-text">in minutes</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* connecting line */}
          <div
            className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px"
            style={{ background: "linear-gradient(to right, transparent, rgba(99,102,241,0.3), transparent)" }}
          />

          {steps.map(({ icon: Icon, step, title, desc }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="flex flex-col items-center text-center relative"
            >
              {/* Step number + icon */}
              <div className="relative mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center border border-indigo-500/30"
                  style={{ background: "rgba(99,102,241,0.1)" }}
                >
                  <Icon className="w-7 h-7 text-indigo-400" />
                </div>
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
                >
                  {step.replace("0", "")}
                </div>
              </div>

              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

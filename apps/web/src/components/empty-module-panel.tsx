import { motion } from "framer-motion";

type EmptyModulePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function EmptyModulePanel({
  eyebrow,
  title,
  description,
}: EmptyModulePanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-8 shadow-[0_20px_80px_rgba(3,8,14,0.4)] backdrop-blur-xl"
    >
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-cyan-100/50">
        {eyebrow}
      </p>
      <h3 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
        {description}
      </p>
    </motion.section>
  );
}


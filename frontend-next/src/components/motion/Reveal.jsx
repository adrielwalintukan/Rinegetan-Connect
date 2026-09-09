"use client";

import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, y = 28, className }) => (
    <motion.div
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className ? `min-w-0 ${className}` : "min-w-0"}
    >
        {children}
    </motion.div>
);

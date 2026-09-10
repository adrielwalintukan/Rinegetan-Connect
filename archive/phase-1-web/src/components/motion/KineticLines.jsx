import { motion } from "framer-motion";

export const KineticLines = ({ lines, className, delay = 0.15 }) => (
    <span className={className}>
        {lines.map((line, i) => (
            <span key={i} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
                <motion.span
                    className="block will-change-transform"
                    initial={{ y: "115%" }}
                    animate={{ y: "0%" }}
                    transition={{
                        duration: 1,
                        delay: delay + i * 0.13,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    {line}
                </motion.span>
            </span>
        ))}
    </span>
);

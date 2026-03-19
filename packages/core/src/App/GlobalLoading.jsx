"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GlobalLoading.module.scss';

// Professional green glassmorphic theme

export const GlobalLoading = () => {
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Professional color palette - sophisticated and elegant
    const colors = {
        primary: '#059669',    // Emerald Green
        secondary: '#10B981',  // Light Green
        accent: '#34D399',     // Brighter Green
        gold: '#FCD34D',       // Light gold
        silver: '#9CA3AF',     // Gray
        dark: '#064E3B',       // Very dark green
        light: '#ECFDF5',      // Very light green
        surface: 'rgba(6, 78, 59, 0.4)', // Green glass surface
        gradient1: '#047857',  // Dark Emerald
        gradient2: '#0D9488',  // Teal
        gradient3: '#10B981'   // Emerald
    };

    // Professional loading content
    const loadingContent = {
        partnership: { text: "Welcome to", company: "Brian Binary", type: "partnership" },
        powered: { text: "Powered by", company: "Advanced Tech", type: "powered" },
        journey: { text: "Simplifying your", highlight: "trading journey", type: "journey" }
    };

    useEffect(() => {
        // Smooth progress animation with easing over 5 seconds
        const duration = 10000;
        const startTime = Date.now();
        let animationFrame;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration * 100, 100);

            // Custom easing function for natural feel
            const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
            const easedProgress = easeOutQuart(progress / 100) * 100;

            setProgress(Math.min(easedProgress, 100));

            if (progress < 100) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                // Add a slight delay before completing
                setTimeout(() => setIsComplete(true), 600);
            }
        };

        // Start the animation
        animationFrame = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
        },
        exit: {
            opacity: 0,
            scale: 0.98,
            transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
        }
    };

    const logoVariants = {
        initial: { scale: 0.9, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    const textContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3
            }
        }
    };

    const textItemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1]
            }
        }
    };

    const progressWidth = Math.max(5, progress);

    return (
        <AnimatePresence>
            {!isComplete && (
                <motion.div
                    className={styles.globalLoading}
                    style={{
                        '--primary': colors.primary,
                        '--secondary': colors.secondary,
                        '--accent': colors.accent,
                        '--gold': colors.gold,
                        '--silver': colors.silver,
                        '--dark': colors.dark,
                        '--light': colors.light,
                        '--surface': colors.surface,
                        '--gradient1': colors.gradient1,
                        '--gradient2': colors.gradient2,
                        '--gradient3': colors.gradient3
                    }}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                >
                    {/* Professional background with subtle overlay */}
                    <div className={styles.backgroundOverlay} />

                    {/* Subtle background elements */}
                    <div className={styles.backgroundElements}>
                        <div className={styles.geometricShape1} />
                        <div className={styles.geometricShape2} />
                        <div className={styles.geometricShape3} />
                    </div>

                    <div className={styles.loadingContainer}>
                        {/* Elegant Logo */}
                        <motion.div
                            className={styles.logoContainer}
                            variants={logoVariants}
                            initial="initial"
                            animate="animate"
                            style={{
                                fontSize: '48px',
                                fontWeight: '800',
                                background: 'linear-gradient(45deg, var(--secondary), var(--accent))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '2px',
                                textShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                                marginBottom: '20px',
                                zIndex: 10
                            }}
                        >
                            Brian Binary
                            <div className={styles.logoGlow} />
                        </motion.div>

                        {/* Professional Text Content */}
                        <motion.div
                            className={styles.textsContainer}
                            variants={textContainerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* Partnership Section */}
                            <motion.div
                                className={styles.textSection}
                                variants={textItemVariants}
                            >
                                <div className={styles.partnershipContent}>
                                    <span className={styles.prefix}>{loadingContent.partnership.text}</span>
                                    <motion.span
                                        className={styles.companyName}
                                        animate={{
                                            backgroundPosition: ['0%', '100%', '0%'],
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {loadingContent.partnership.company}
                                    </motion.span>
                                </div>
                            </motion.div>

                            {/* Powered By Section */}
                            <motion.div
                                className={styles.textSection}
                                variants={textItemVariants}
                            >
                                <div className={styles.poweredContent}>
                                    <span className={styles.prefix}>{loadingContent.powered.text}</span>
                                    <motion.span
                                        className={styles.techName}
                                        animate={{
                                            opacity: [0.8, 1, 0.8],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {loadingContent.powered.company}
                                    </motion.span>
                                </div>
                            </motion.div>

                            {/* Journey Section */}
                            <motion.div
                                className={styles.textSection}
                                variants={textItemVariants}
                            >
                                <div className={styles.journeyContent}>
                                    <span className={styles.journeyText}>{loadingContent.journey.text}</span>
                                    <motion.span
                                        className={styles.highlightText}
                                        animate={{
                                            backgroundPosition: ['0%', '100%', '0%'],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {loadingContent.journey.highlight}
                                    </motion.span>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* Sophisticated Progress Bar */}
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                                <motion.div
                                    className={styles.progressFill}
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${progressWidth}%`,
                                        transition: {
                                            duration: 0.2,
                                            ease: "easeOut"
                                        }
                                    }}
                                >
                                    <div className={styles.progressGlow} />
                                </motion.div>
                            </div>
                            <motion.div
                                className={styles.progressText}
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: 1,
                                    transition: { delay: 0.2 }
                                }}
                            >
                                {Math.round(progress)}%
                            </motion.div>
                        </div>

                        {/* Minimal Loading Indicator */}
                        <motion.div
                            className={styles.loadingIndicator}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className={styles.spinner}>
                                <div className={styles.spinnerCircle} />
                            </div>
                            <span className={styles.loadingLabel}>Loading</span>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalLoading;
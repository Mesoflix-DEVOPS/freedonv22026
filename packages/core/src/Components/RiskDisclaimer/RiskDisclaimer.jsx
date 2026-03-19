import React, { useState, useRef, useEffect } from 'react';
import { Text } from '@deriv/components';
import { Localize } from '@deriv/translations';
import { useDevice } from '@deriv-com/ui';
import './risk-disclaimer.scss';

const RiskDisclaimer = () => {
    const { isMobile } = useDevice();
    const [isExpanded, setIsExpanded] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        // Center the disclaimer horizontally, but pin it to the top on first render
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;

            setPosition({
                x: (window.innerWidth - containerWidth) / 2,
                y: 80 // Position it beautifully below the header
            });
        }
    }, []);

    const handleMouseDown = (e) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        if (containerRef.current) {
            const maxX = window.innerWidth - containerRef.current.offsetWidth;
            const maxY = window.innerHeight - containerRef.current.offsetHeight;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    const toggleExpanded = (e) => {
        // Don't toggle if clicking on the drag handle
        if (e.target.closest('.risk-disclaimer__drag-handle')) return;
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            ref={containerRef}
            className={`risk-disclaimer ${isDragging ? 'risk-disclaimer--dragging' : ''} ${isExpanded ? 'risk-disclaimer--expanded' : ''}`}
            style={{
                top: `${position.y}px`,
                left: `${position.x}px`,
                transition: isDragging ? 'none' : 'all 0.3s ease',
                width: isExpanded ? '320px' : '200px',
                minHeight: isExpanded ? 'auto' : '40px'
            }}
            onMouseDown={handleMouseDown}
            onClick={toggleExpanded}
        >
            <div className="risk-disclaimer__header">
                <Text size="xxs" weight="bold">
                    <Localize i18n_default_text="Brian Binary Advisor" />
                </Text>
                <div className="risk-disclaimer__drag-handle">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 13C9.55228 13 10 12.5523 10 12C10 11.4477 9.55228 11 9 11C8.44772 11 8 11.4477 8 12C8 12.5523 8.44772 13 9 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 6C9.55228 6 10 5.55228 10 5C10 4.44772 9.55228 4 9 4C8.44772 4 8 4.44772 8 5C8 5.55228 8.44772 6 9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 20C9.55228 20 10 19.5523 10 19C10 18.4477 9.55228 18 9 18C8.44772 18 8 18.4477 8 19C8 19.5523 8.44772 20 9 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 13C15.5523 13 16 12.5523 16 12C16 11.4477 15.5523 11 15 11C14.4477 11 14 11.4477 14 12C14 12.5523 14.4477 13 15 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 6C15.5523 6 16 5.55228 16 5C16 4.44772 15.5523 4 15 4C14.4477 4 14 4.44772 14 5C14 5.55228 14.4477 6 15 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 20C15.5523 20 16 19.5523 16 19C16 18.4477 15.5523 18 15 18C14.4477 18 14 18.4477 14 19C14 19.5523 14.4477 20 15 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className="risk-disclaimer__content">
                    <div className="risk-disclaimer__content-inner">
                        <Text align='left' className='risk-disclaimer__text' size={isMobile ? 'xxs' : 'xs'}>
                            <Localize i18n_default_text='Brian Binary provides advanced automation tools. Ensure you understand the strategies you are deploying before activating them.' />
                        </Text>
                        <ul className="risk-disclaimer__list">
                            <li className="risk-disclaimer__list-item">
                                <Text align='left' className='risk-disclaimer__text' size={isMobile ? 'xxs' : 'xs'}>
                                    <Localize i18n_default_text='Always test your bots in a Demo account first' />
                                </Text>
                            </li>
                            <li className="risk-disclaimer__list-item">
                                <Text align='left' className='risk-disclaimer__text' size={isMobile ? 'xxs' : 'xs'}>
                                    <Localize i18n_default_text='Monitor ongoing market conditions proactively' />
                                </Text>
                            </li>
                        </ul>
                        <Text align='left' className='risk-disclaimer__text risk-disclaimer__text--warning' size={isMobile ? 'xxs' : 'xs'}>
                            <Localize i18n_default_text='Trade responsibly. Manage your risk settings properly to avoid excessive drawdowns.' />
                        </Text>
                    </div>
                    <div className="risk-disclaimer__close" onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiskDisclaimer;

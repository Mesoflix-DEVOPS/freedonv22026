import React from 'react';
import { 
    FaTelegram, 
    FaInstagram, 
    FaTiktok, 
    FaWhatsapp 
} from 'react-icons/fa';
import './social-media-bar.scss';

const SocialMediaBar = () => {
    const socialLinks = [
        {
            id: 'instagram',
            icon: <FaInstagram />,
            link: 'https://www.instagram.com/ceofredrick?igsh=bHRteGFhbzJicmhv',
            color: '#E4405F'
        },
        {
            id: 'whatsapp',
            icon: <FaWhatsapp />,
            link: 'https://wa.me/254793632071',
            color: '#25D366'
        },
        {
            id: 'tiktok',
            icon: <FaTiktok />,
            link: 'https://www.tiktok.com/@ceofredrickofficial?_r=1&_t=ZS-95CTP3GzlzD',
            color: '#000000'
        },
        {
            id: 'telegram',
            icon: <FaTelegram />,
            link: 'https://t.me/freedonlive',
            color: '#0088cc'
        }
    ];

    return (
        <div className="social-media-bar">
            {socialLinks.map(({ id, icon, link, color }) => (
                <a 
                    key={id}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-icon-wrapper social-icon-${id}`}
                    style={{ '--hover-color': color } as React.CSSProperties}
                >
                    <div className="icon-inner">
                        {icon}
                    </div>
                </a>
            ))}
        </div>
    );
};

export default SocialMediaBar;

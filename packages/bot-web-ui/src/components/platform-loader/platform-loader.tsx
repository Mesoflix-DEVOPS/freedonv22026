import React from 'react';
import './platform-loader.scss';

const PlatformLoader = () => {
    return (
        <div className="platform-loader-container">
            <div className="platform-loader">
                <div className="spinner-ring">
                    <div className="ring-inner"></div>
                </div>
                <div className="loader-text">Initializing Trading Engine...</div>
            </div>
        </div>
    );
};

export default PlatformLoader;

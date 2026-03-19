import React from 'react';
import styles from './finesttool.module.scss'; // assuming you renamed it correctly

const Finesttool = () => {
    return (
        <div className={styles.container}>
            <iframe
                src="https://mesoflxadvanced.netlify.app/"
                title="Brian Binary Analysis"
                className={styles.iframe}
                allowFullScreen
            />
        </div>
    );
};

export default Finesttool;

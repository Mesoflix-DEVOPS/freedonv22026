import 'Sass/app/_common/components/platform-switcher.scss';

import { useDevice } from '@deriv-com/ui';
import { getPlatformInformation } from '@deriv/shared';
import { CSSTransition } from 'react-transition-group';
import { PlatformDropdown } from './platform-dropdown.jsx';
import { PlatformSwitcherLoader } from './Components/Preloader/platform-switcher.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import derivBotImg from '../../../../public/images/icons/deriv_bot.png';
import derivTraderImg from '../../../../public/images/icons/deriv_trader.png';

const PlatformSwitcher = () => {
    const { isMobile } = useDevice();
    return (
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '16px' }}>
            <span style={{
                fontSize: '22px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #06D6A0, #3B82F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px'
            }}>
                {isMobile ? 'F' : 'Freedon'}
            </span>
        </div>
    );
};

PlatformSwitcher.propTypes = {
};

export default withRouter(PlatformSwitcher);

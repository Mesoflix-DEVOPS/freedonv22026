import { observer as globalObserver } from '../../utils/observer';

export const REQUESTS = [
    'active_symbols',
    'authorize',
    'balance',
    'buy',
    'proposal',
    'proposal_open_contract',
    'transaction',
    'ticks_history',
    'history',
];

class APIMiddleware {
    constructor(config = {}) {
        this.config = config;
        this.debounced_calls = {};
        this.tag = config.tag || 'Master'; // 'Master' or 'Follower'
        this.suppress_emissions = !!config.suppress_emissions;
    }

    getRequestType = request => {
        let req_type;
        REQUESTS.forEach(type => {
            if (type in request && !req_type) req_type = type;
        });

        return req_type;
    };

    defineMeasure = res_type => {
        if (res_type) {
            let measure;
            if (res_type === 'history') {
                performance.mark('ticks_history_end');
                measure = performance.measure('ticks_history', 'ticks_history_start', 'ticks_history_end');
            } else {
                performance.mark(`${res_type}_end`);
                measure = performance.measure(`${res_type}`, `${res_type}_start`, `${res_type}_end`);
            }
            return (measure.startTimeDate = new Date(Date.now() - measure.startTime));
        }
        return false;
    };

    sendIsCalled = ({ response_promise, args: [request] }) => {
        const req_type = this.getRequestType(request);
        if (req_type) {
            performance.mark(`${req_type}_start`);

            if ((req_type === 'proposal' || req_type === 'buy') && !this.suppress_emissions) {
                console.log(`%c[${this.tag}-API] 📢 Emitting api.${req_type}_sent`, 'color: #9c27b0; font-weight: bold;', request);
                globalObserver.emit(`api.${req_type}_sent`, request);
            }
        }
        response_promise
            .then(res => {
                const res_type = this.getRequestType(res);
                if (res_type) {
                    this.defineMeasure(res_type);

                    // Add global logging for critical trade/auth events
                    if (['buy', 'authorize', 'proposal_open_contract'].includes(res_type)) {
                        const style = 'background: #333; color: #03a9f4; font-weight: bold; padding: 1px 3px; border-radius: 2px;';
                        console.log(`%c[${this.tag}-API] 📥 Response: ${res_type}`, style, res);

                        if (res_type === 'buy' && !this.suppress_emissions) {
                            globalObserver.emit('api.buy_received', res);
                        }
                    }
                }
            })
            .catch(error => {
                const req_type = this.getRequestType(request);
                if (['buy', 'authorize', 'proposal_open_contract'].includes(req_type)) {
                    console.error(`[Global-API] ❌ Request Failed: ${req_type}`, error);
                }
            });
        return response_promise;
    };
}

export default APIMiddleware;

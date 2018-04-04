import React from 'react';
import isEmpty from 'lodash/isEmpty';
import keys from 'lodash/keys';
import size from 'lodash/size';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getSelectedAccountName } from 'selectors/accounts';
import { removeBundleFromUnconfirmedBundleTails } from 'actions/accounts';
import { fetchMarketData, fetchChartData, fetchPrice, setPollFor, promoteTransfer } from 'actions/polling';

import { runTask } from 'worker';
import { getSeed } from 'libs/crypto';

/** Background wallet polling component */
class Polling extends React.PureComponent {
    static propTypes = {
        wallet: PropTypes.object.isRequired,
        pollFor: PropTypes.string.isRequired,
        allPollingServices: PropTypes.array.isRequired,
        selectedAccountName: PropTypes.string.isRequired,
        unconfirmedBundleTails: PropTypes.object.isRequired,
        setPollFor: PropTypes.func.isRequired,
        fetchMarketData: PropTypes.func.isRequired,
        fetchPrice: PropTypes.func.isRequired,
        fetchChartData: PropTypes.func.isRequired,
        promoteTransfer: PropTypes.func.isRequired,
    };

    componentDidMount() {
        this.onPollTick = this.fetch.bind(this);
        this.interval = setInterval(this.onPollTick, 15000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    shouldSkipCycle() {
        const props = this.props;

        const isAlreadyDoingSomeHeavyLifting =
            props.isSyncing ||
            props.isSendingTransfer ||
            props.isGeneratingReceiveAddress ||
            props.isFetchingLatestAccountInfoOnLogin || // In case the app is already fetching latest account info, stop polling because the market related data is already fetched on login
            props.addingAdditionalAccount ||
            props.isTransitioning;

        const isAlreadyPollingSomething =
            props.isFetchingPrice ||
            props.isFetchingChartData ||
            props.isFetchingMarketData ||
            props.isFetchingAccountInfo ||
            props.isPromoting;

        return isAlreadyDoingSomeHeavyLifting || isAlreadyPollingSomething;
    }

    fetch = () => {
        if (this.shouldSkipCycle()) {
            return;
        }

        const service = this.props.pollFor;

        const dict = {
            promotion: this.promote,
            marketData: this.props.fetchMarketData,
            price: this.props.fetchPrice,
            chartData: this.props.fetchChartData,
            accountInfo: this.fetchLatestAccountInfo,
        };

        dict[service] ? dict[service]() : this.props.setPollFor(this.props.allPollingServices[0]);
    };

    fetchLatestAccountInfo = async () => {
        const { wallet, selectedAccountName } = this.props;
        try {
            const seed = await getSeed(wallet.seedIndex, wallet.password);
            runTask('getAccountInfo', [seed, selectedAccountName]);
        } catch (err) {}
    };

    promote = () => {
        const { unconfirmedBundleTails, allPollingServices, pollFor } = this.props;

        const index = allPollingServices.indexOf(pollFor);
        const next = index === size(allPollingServices) - 1 ? 0 : index + 1;

        if (!isEmpty(unconfirmedBundleTails)) {
            const bundles = keys(unconfirmedBundleTails);
            const top = bundles[0];

            return this.props.promoteTransfer(top, unconfirmedBundleTails[top]);
        }

        // In case there are no unconfirmed bundle tails, move to the next service item
        return this.props.setPollFor(allPollingServices[next]);
    };

    render() {
        return null;
    }
}

const mapStateToProps = (state) => ({
    pollFor: state.polling.pollFor,
    allPollingServices: state.polling.allPollingServices,
    isFetchingPrice: state.polling.isFetchingPrice,
    isFetchingChartData: state.polling.isFetchingChartData,
    isFetchingMarketData: state.polling.isFetchingMarketData,
    isFetchingAccountInfo: state.polling.isFetchingAccountInfo,
    isPromoting: state.polling.isPromoting,
    isSyncing: state.ui.isSyncing,
    addingAdditionalAccount: state.wallet.addingAdditionalAccount,
    isGeneratingReceiveAddress: state.ui.isGeneratingReceiveAddress,
    isSendingTransfer: state.ui.isSendingTransfer,
    isFetchingLatestAccountInfoOnLogin: state.ui.isFetchingLatestAccountInfoOnLogin,
    wallet: state.wallet,
    selectedAccountName: getSelectedAccountName(state),
    unconfirmedBundleTails: state.accounts.unconfirmedBundleTails,
    isTransitioning: state.ui.isTransitioning,
});

const mapDispatchToProps = {
    fetchMarketData,
    fetchChartData,
    fetchPrice,
    setPollFor,
    promoteTransfer,
    removeBundleFromUnconfirmedBundleTails,
};

export default connect(mapStateToProps, mapDispatchToProps)(Polling);

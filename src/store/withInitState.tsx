import React, { useState, useEffect, FC } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from './store';
import logger from '../logger';
import Keychain from '../keychain';
import { BACKGROUND_PRIMARY } from '../theme';

const withInitState = (Component: FC) => (props: any) => {
    const [loading, setLoading] = useState(true);
    const [, { initState }] = useStore();

    useEffect(() => {
        const init = async () => {
            logger.debug('Initializing state');

            const state = await Keychain.getInitialState();

            if (!state) {
                logger.debug('Initial state is not present');
            } else {
                logger.debug(['parsed state', state]);
                initState(state);
            }

            setLoading(false);
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <View style={{ backgroundColor: BACKGROUND_PRIMARY, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {loading ? <ActivityIndicator size={'large'} /> : <Component {...props} />}
        </View>
    );
};

export default withInitState;

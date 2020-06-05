import React, { useState, useCallback } from 'react';
import { Alert, Text, SafeAreaView, ScrollView, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Navigation } from 'react-native-navigation';
import RNNetworkExtension from 'react-native-network-extension';
import { useStore } from '../../store/store';
import RenderServer from './render_server';
import useScreen from '../screen_hooks';
import withClient from '../../providers/with_client';
import { RenderProviderItem } from './render_provider_item';
import { AVAILABLE_PROVIDERS } from '../../providers';
import { Divider, ListItem } from 'react-native-elements';

const SettingsScreen = props => {
    const [servers, setServers] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [{ current_vpn_server }, { setCurrentVPNServer, setVPNStatus, notify }] = useStore();
    const { LogFileViewerScreenPush } = useScreen();

    Navigation.events().registerNavigationButtonPressedListener(({ buttonId, componentId }) => {
        if (componentId === props.componentId && buttonId === 'done_button') {
            Navigation.dismissModal(props.componentId);
        }
    });

    const select = server => () => {
        setVPNStatus('Connecting');

        props.client
            .configureServer(server.provider.id, server, notify)
            .then(() => {
                setCurrentVPNServer(server);
                notify('success', 'VPN server is ready for connection');
            })
            .catch(e => {
                setVPNStatus('Connect');
                notify('error', `Failed to connect to VPN server: ${e.message || e}`);
            });

        Navigation.dismissModal(props.componentId);
    };

    const destroyConfirmed = uid => {
        const server = servers.filter(_server => _server.uid === uid);

        Promise.all([props.client.deleteServer(server[0]).catch(e => e), RNNetworkExtension.remove().catch(e => e)]);

        if (current_vpn_server !== null && current_vpn_server.uid === uid) {
            setCurrentVPNServer(null);
            setVPNStatus('Connect');
        }

        // remove deleted server from servers list
        setServers(servers.filter(_server => _server.uid !== uid));
    };

    const destroy = uid => () => {
        Alert.alert('Warning!', 'Are you sure you want to destroy this server? This action cannot be undone.', [
            {
                text: 'Destroy',
                onPress: () => destroyConfirmed(uid),
                style: 'destructive',
            },
            {
                text: 'Cancel',
                style: 'cancel',
            },
        ]);
    };

    const retrieveServers = async () => {
        const _servers = await props.client.getServers();

        setServers(_servers);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);

        retrieveServers().then(() => setRefreshing(false));
    }, [refreshing]);

    if (servers === null) {
        setTimeout(() => {
            retrieveServers();
        }, 0);
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {servers === null && <ActivityIndicator style={{ padding: 10 }} />}
                {servers !== null &&
                    servers.length > 0 &&
                    servers.map(server => (
                        <RenderServer key={server.uid} server={server} select={select} destroy={destroy} />
                    ))}
                <Text style={{ fontSize: 12, padding: 15, paddingBottom: 2 }}>CLOUD PROVIDERS</Text>
                <Divider />
                <FlatList
                    data={AVAILABLE_PROVIDERS}
                    renderItem={({ item }) => <RenderProviderItem item={item} componentId={props.componentId} />}
                    keyExtractor={(item, index) => index.toString()}
                />
                <Divider />
                <Text style={{ fontSize: 12, padding: 15, paddingBottom: 2 }}>LOGS</Text>
                <Divider />
                <ListItem
                    onPress={() => LogFileViewerScreenPush(props.componentId)}
                    title={'Application logs'}
                    bottomDivider
                    chevron
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default withClient(SettingsScreen);
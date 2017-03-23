/**
 * External dependencies
 */
import { expect } from 'chai';
import deepFreeze from 'deep-freeze';
import { pick } from 'lodash';

/**
 * Internal dependencies
 */
import * as selectors from '../selectors';
import { akismet, helloDolly, jetpack } from './fixtures/plugins';
import { INSTALL_PLUGIN, DEACTIVATE_PLUGIN, ENABLE_AUTOUPDATE_PLUGIN } from '../constants';

const createError = function(error, message, name = false) {
    const errorObj = new Error(message);
    errorObj.error = error;
    errorObj.name = name || error;
    return errorObj;
};

const state = deepFreeze({
    plugins: {
        installed: {
            isRequesting: {
                'site.one': false,
                'site.two': false,
                'site.three': true,
            },
            plugins: {
                'site.one': [akismet, helloDolly],
                'site.two': [jetpack, helloDolly],
            },
            status: {
                'site.one': {
                    'akismet/akismet': {
                        status: 'inProgress',
                        action: ENABLE_AUTOUPDATE_PLUGIN,
                    },
                    'jetpack/jetpack': {
                        status: 'completed',
                        action: DEACTIVATE_PLUGIN,
                    },
                },
                'site.two': {
                    'akismet/akismet': {
                        status: 'error',
                        action: INSTALL_PLUGIN,
                        error: createError('no_package', 'Download failed.'),
                    },
                },
            },
        },
    },
});

describe('Installed plugin selectors', function() {
    it('should contain isRequesting method', function() {
        expect(selectors.isRequesting).to.be.a('function');
    });

    it('should contain isRequestingForSites method', function() {
        expect(selectors.isRequestingForSites).to.be.a('function');
    });

    it('should contain getPlugins method', function() {
        expect(selectors.getPlugins).to.be.a('function');
    });

    it('should contain getPluginsWithUpdates method', function() {
        expect(selectors.getPluginsWithUpdates).to.be.a('function');
    });

    it('should contain getPluginOnSite method', function() {
        expect(selectors.getPluginOnSite).to.be.a('function');
    });

    it('should contain getSitesWithPlugin method', function() {
        expect(selectors.getSitesWithPlugin).to.be.a('function');
    });

    it('should contain getSitesWithoutPlugin method', function() {
        expect(selectors.getSitesWithoutPlugin).to.be.a('function');
    });

    it('should contain getLogsForPlugin method', function() {
        expect(selectors.getStatusForPlugin).to.be.a('function');
    });

    it('should contain isPluginDoingAction method', function() {
        expect(selectors.isPluginDoingAction).to.be.a('function');
    });

    describe('isRequesting', function() {
        it('Should get `false` if this site is not in the current state', function() {
            expect(selectors.isRequesting(state, 'no.site')).to.be.false;
        });

        it('Should get `false` if this site is not being fetched', function() {
            expect(selectors.isRequesting(state, 'site.one')).to.be.false;
        });

        it('Should get `true` if this site is being fetched', function() {
            expect(selectors.isRequesting(state, 'site.three')).to.be.true;
        });
    });

    describe('isRequestingForSites', function() {
        it('Should get `false` if no sites are being fetched', function() {
            expect(selectors.isRequestingForSites(state, ['site.one', 'site.two'])).to.be.false;
        });

        it('Should get `true` if any site is being fetched', function() {
            expect(selectors.isRequestingForSites(state, ['site.one', 'site.three'])).to.be.true;
        });

        it('Should get `true` if any site is being fetched, even if one is not in the current state', function() {
            expect(selectors.isRequestingForSites(state, ['no.site', 'site.three'])).to.be.true;
        });

        it('Should get `false` if sites are not being fetched, including a site not in the current state', function() {
            expect(selectors.isRequestingForSites(state, ['no.site', 'site.two'])).to.be.false;
        });
    });

    describe('getPlugins', function() {
        it('Should get an empty array if the requested site is not in the current state', function() {
            const plugins = selectors.getPlugins(state, [{ ID: 'no.site' }]);
            expect(plugins).to.have.lengthOf(0);
        });

        it('Should get a plugin list of length 3 if both sites are requested', function() {
            const plugins = selectors.getPlugins(state, [{ ID: 'site.one' }, { ID: 'site.two' }]);
            expect(plugins).to.have.lengthOf(3);
        });

        it('Should get a plugin list containing jetpack if both sites are requested', function() {
            const siteOneObj = { ID: 'site.one' };
            const siteTwoObj = { ID: 'site.two' };
            const plugins = selectors.getPlugins(state, [siteOneObj, siteTwoObj]);
            const siteWithPlugin = {
                [siteTwoObj.ID]: pick(jetpack, ['active', 'autoupdate', 'update']),
            };
            expect(plugins).to.deep.include({ ...jetpack, sites: siteWithPlugin });
        });

        it('Should get a plugin list of length 2 if only site 1 is requested', function() {
            const plugins = selectors.getPlugins(state, [{ ID: 'site.one' }]);
            expect(plugins).to.have.lengthOf(2);
        });

        it('Should get a plugin list of length 2 if active plugins on both sites are requested', function() {
            const siteOneObj = { ID: 'site.one' };
            const siteTwoObj = { ID: 'site.two' };
            const plugins = selectors.getPlugins(state, [siteOneObj, siteTwoObj], 'active');
            expect(plugins).to.have.lengthOf(2);
        });

        it('Should get a plugin list of length 1 if inactive plugins on site 1 is requested', function() {
            const plugins = selectors.getPlugins(state, [{ ID: 'site.one' }], 'inactive');
            expect(plugins).to.have.lengthOf(1);
        });
    });

    describe('getPluginsWithUpdates', function() {
        it('Should get an empty array if the requested site is not in the current state', function() {
            const plugins = selectors.getPluginsWithUpdates(state, [{ ID: 'no.site' }]);
            expect(plugins).to.have.lengthOf(0);
        });

        it('Should get a plugin list of length 1 when we can update files on the site', function() {
            const plugins = selectors.getPluginsWithUpdates(state, [
                {
                    ID: 'site.one',
                    canUpdateFiles: true,
                },
                {
                    ID: 'site.two',
                    canUpdateFiles: true,
                },
            ]);
            expect(plugins).to.have.lengthOf(1);
        });
    });

    describe('getPluginOnSite', function() {
        it('Should get an undefined value if the requested site is not in the current state', function() {
            expect(selectors.getPluginOnSite(state, { ID: 'no.site' }, 'akismet')).to.be.undefined;
        });

        it('Should get an undefined value if the requested plugin on this site is not in the current state', function() {
            expect(selectors.getPluginOnSite(state, { ID: 'site.one' }, 'jetpack')).to.be.undefined;
        });

        it('Should get the plugin if the it exists on the requested site', function() {
            const siteOneObj = { ID: 'site.one' };
            const plugin = selectors.getPluginOnSite(state, siteOneObj, 'akismet');
            const siteWithPlugin = {
                [siteOneObj.ID]: pick(akismet, ['active', 'autoupdate', 'update']),
            };
            expect(plugin).to.eql({ ...akismet, sites: siteWithPlugin });
        });
    });

    describe('getSitesWithPlugin', function() {
        const siteList = [
            {
                ID: 'site.one',
                slug: 'site.one',
                jetpack: true,
                visible: true,
                isSecondaryNetworkSite: () => false,
                title: 'One Site',
            },
            {
                ID: 'site.two',
                slug: 'site.two',
                jetpack: true,
                visible: true,
                isSecondaryNetworkSite: () => false,
                title: 'Two Site',
            },
        ];

        it('Should get an empty array if the requested site is not in the current state', function() {
            expect(
                selectors.getSitesWithPlugin(state, [{ ID: 'no.site' }], 'akismet')
            ).to.have.lengthOf(0);
        });

        it("Should get an empty array if the requested plugin doesn't exist on any sites' state", function() {
            expect(selectors.getSitesWithPlugin(state, siteList, 'vaultpress')).to.have.lengthOf(0);
        });

        it('Should get an array of sites with the requested plugin', function() {
            const siteWithPlugin = siteList[1];
            const sites = selectors.getSitesWithPlugin(state, siteList, 'jetpack');
            expect(sites).to.eql([siteWithPlugin]);
        });
    });

    describe('getSitesWithoutPlugin', function() {
        const siteList = [
            {
                ID: 'site.one',
                slug: 'site.one',
                jetpack: true,
                visible: true,
                isSecondaryNetworkSite: () => false,
                title: 'One Site',
            },
            {
                ID: 'site.two',
                slug: 'site.two',
                jetpack: true,
                visible: true,
                isSecondaryNetworkSite: () => false,
                title: 'Two Site',
            },
        ];

        it('Should get an empty array if the requested site is not in the current state', function() {
            expect(
                selectors.getSitesWithoutPlugin(state, [{ ID: 'no.site' }], 'akismet')
            ).to.have.lengthOf(0);
        });

        it("Should get an array of sites that don't have the plugin in their state", function() {
            const siteWithoutPlugin = siteList[1];
            const sites = selectors.getSitesWithoutPlugin(state, siteList, 'akismet');
            expect(sites).to.eql([siteWithoutPlugin]);
        });

        it('Should get an empty array if the requested plugin exists on all requested sites', function() {
            const sites = selectors.getSitesWithoutPlugin(state, siteList, 'hello-dolly');
            expect(sites).to.have.lengthOf(0);
        });
    });

    describe('getStatusForPlugin', function() {
        it('Should get `false` if the requested site is not in the current state', function() {
            expect(selectors.getStatusForPlugin(state, 'no.site', 'akismet/akismet')).to.be.false;
        });

        it('Should get `false` if the requested plugin on this site is not in the current state', function() {
            expect(
                selectors.getStatusForPlugin(state, 'site.one', 'hello-dolly/hello')
            ).to.be.false;
        });

        it('Should get the log if the requested site & plugin have logs', function() {
            expect(selectors.getStatusForPlugin(state, 'site.one', 'akismet/akismet')).to.eql({
                status: 'inProgress',
                siteId: 'site.one',
                pluginId: 'akismet/akismet',
                action: ENABLE_AUTOUPDATE_PLUGIN,
            });
        });
    });

    describe('isPluginDoingAction', function() {
        it('Should get `false` if the requested site is not in the current state', function() {
            expect(selectors.isPluginDoingAction(state, 'no.site', 'akismet/akismet')).to.be.false;
        });

        it('Should get `false` if the requested site is finished with an action', function() {
            expect(selectors.isPluginDoingAction(state, 'site.one', 'jetpack/jetpack')).to.be.false;
        });

        it('Should get `true` if the requested site is doing an action', function() {
            expect(selectors.isPluginDoingAction(state, 'site.one', 'akismet/akismet')).to.be.true;
        });

        it('Should get `false` if the requested site had an error', function() {
            expect(selectors.isPluginDoingAction(state, 'site.two', 'akismet/akismet')).to.be.false;
        });
    });
});

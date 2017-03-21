/**
 * External dependencies
 */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { flowRight, partialRight, pick, find } from 'lodash';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import wrapSettingsForm from './wrap-settings-form';
import SectionHeader from 'components/section-header';
import Button from 'components/button';
import Protect from './protect';
import Sso from './sso';
import QueryJetpackModules from 'components/data/query-jetpack-modules';
import { getSelectedSiteId } from 'state/ui/selectors';
import { siteSupportsJetpackSettingsUi } from 'state/sites/selectors';
import {
	isJetpackModuleActive,
	isJetpackModuleUnavailableInDevelopmentMode,
	isJetpackSiteInDevelopmentMode
} from 'state/selectors';
import SpamFilteringSettings from './spam-filtering-settings';
import { getPluginsForSite } from 'state/plugins/premium/selectors';
import QueryPluginKeys from 'components/data/query-plugin-keys';

class SiteSettingsFormSecurity extends Component {
	renderSectionHeader( title, showButton = true, disableButton = false ) {
		const { isRequestingSettings, isSavingSettings, translate } = this.props;
		return (
			<SectionHeader label={ title }>
				{ showButton &&
					<Button
						compact
						primary
						onClick={ this.props.handleSubmitForm }
						disabled={ isRequestingSettings || isSavingSettings || disableButton }>
						{ isSavingSettings ? translate( 'Saving…' ) : translate( 'Save Settings' ) }
					</Button>
				}
			</SectionHeader>
		);
	}

	render() {
		const {
			fields,
			handleAutosavingToggle,
			handleSubmitForm,
			isRequestingSettings,
			isSavingSettings,
			jetpackSettingsUiSupported,
			onChangeField,
			protectModuleActive,
			protectModuleUnavailable,
			akismetUnavailable,
			akismetActive,
			setFieldValue,
			siteId,
			translate
		} = this.props;

		if ( ! jetpackSettingsUiSupported ) {
			return null;
		}

		const disableProtect = ! protectModuleActive || protectModuleUnavailable;
		const disableSpamFiltering = ! akismetActive || akismetUnavailable;

		return (
			<form
				id="site-settings"
				onSubmit={ handleSubmitForm }
				className="site-settings__security-settings"
			>
				<QueryJetpackModules siteId={ siteId } />

				{ this.renderSectionHeader( translate( 'Prevent brute force login attacks' ), true, disableProtect ) }
				<Protect
					fields={ fields }
					isSavingSettings={ isSavingSettings }
					isRequestingSettings={ isRequestingSettings }
					onChangeField={ onChangeField }
					setFieldValue={ setFieldValue }
				/>

				<QueryPluginKeys siteId={ siteId } />

				{ this.renderSectionHeader( translate( 'Spam filtering' ), true, disableSpamFiltering ) }
				<SpamFilteringSettings
					akismetActive={ akismetActive }
					fields={ fields }
					handleAutosavingToggle={ handleAutosavingToggle }
					isSavingSettings={ isSavingSettings }
					isRequestingSettings={ isRequestingSettings }
					onChangeField={ onChangeField }
				/>

				{ this.renderSectionHeader( translate( 'WordPress.com sign in' ), false ) }
				<Sso
					handleAutosavingToggle={ handleAutosavingToggle }
					isSavingSettings={ isSavingSettings }
					isRequestingSettings={ isRequestingSettings }
					fields={ fields }
				/>
			</form>
		);
	}
}

const connectComponent = connect(
	( state ) => {
		const siteId = getSelectedSiteId( state );
		const protectModuleActive = !! isJetpackModuleActive( state, siteId, 'protect' );
		const siteInDevMode = isJetpackSiteInDevelopmentMode( state, siteId );
		const protectIsUnavailableInDevMode = isJetpackModuleUnavailableInDevelopmentMode( state, siteId, 'protect' );
		const akismetIsUnavailableInDevMode = isJetpackModuleUnavailableInDevelopmentMode( state, siteId, 'akismet' );
		const jetpackSettingsUiSupported = siteSupportsJetpackSettingsUi( state, siteId );
		const plugins = getPluginsForSite( state, siteId );

		return {
			jetpackSettingsUiSupported,
			protectModuleActive,
			protectModuleUnavailable: siteInDevMode && protectIsUnavailableInDevMode,
			akismetActive: !! find( plugins, { name: 'akismet' } ),
			akismetUnavailable: siteInDevMode && akismetIsUnavailableInDevMode,
		};
	}
);

const getFormSettings = partialRight( pick, [
	'akismet',
	'protect',
	'jetpack_protect_global_whitelist',
	'sso',
	'jetpack_sso_match_by_email',
	'jetpack_sso_require_two_step',
	'wordpress_api_key'
] );

export default flowRight(
	connectComponent,
	localize,
	wrapSettingsForm( getFormSettings )
)( SiteSettingsFormSecurity );

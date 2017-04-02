/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import Gridicon from 'gridicons';

/**
 * Internal dependencies
 */
import {
	showMagicLoginRequestForm,
} from 'state/login/magic-login/actions';
import {
	isShowingMagicLoginRequest,
} from 'state/login/magic-login/selectors';
import Main from 'components/main';
import LoginBlock from 'blocks/login';
import RequestLoginEmailForm from 'auth/request-login-email-form';
//import HandleEmailedLinkForm from 'auth/handle-emailed-link-form';
//import EmailedLoginLinkSuccessfully from 'auth/emailed-login-link-successfully';
//import EmailedLoginLinkExpired from 'auth/emailed-login-link-expired';
import { isEnabled } from 'config';
import { localize } from 'i18n-calypso';

class Login extends React.Component {
/*
<EmailedLoginLinkSuccessfully />
<HandleEmailedLinkForm />
<EmailedLoginLinkExpired />
 */
	render() {
		const { translate } = this.props;
		return (
			<Main className="wp-login">
				<div className="wp-login__header">
					<Gridicon icon="user-circle" size={ 72 } />
					<div>{ translate( 'You are signed out' ) }</div>
				</div>
				<div className="wp-login__container">
					{ this.props.showingMagicLoginRequestForm
						? <RequestLoginEmailForm />
						: <LoginBlock
								title={ translate( 'Sign in to WordPress.com' ) } /> }
				</div>
				<div className="wp-login__footer">
					{ ! this.props.showingMagicLoginRequestForm && (
						<a href="#" onClick={ this.props.onMagicLoginRequestClick }>{ translate( 'Email me a login link' ) }</a>
					) }
				</div>
			</Main>
		);
	}
}

const mapState = state => {
	const magicLoginEnabled = isEnabled( 'magic-login' );

	return {
		magicLoginEnabled,
		showingMagicLoginRequestForm: magicLoginEnabled && isShowingMagicLoginRequest( state ),
	};
};

const mapDispatch = dispatch => {
	return {
		onMagicLoginRequestClick: event => {
			event.preventDefault();

			dispatch( showMagicLoginRequestForm() );
		}
	};
};

export default connect( mapState, mapDispatch )( localize( Login ) );

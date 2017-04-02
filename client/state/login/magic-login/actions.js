/**
 * Internal dependencies
 */
import {
	MAGIC_LOGIN_HIDE_REQUEST_FORM,
	MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH,
	MAGIC_LOGIN_SHOW_REQUEST_FORM,
} from 'state/action-types';

export const showMagicLoginRequestForm = () => {
	return dispatch => {
		dispatch( {
			type: MAGIC_LOGIN_SHOW_REQUEST_FORM,
		} );
	};
};

export const hideMagicLoginRequestForm = () => {
	return dispatch => {
		dispatch( {
			type: MAGIC_LOGIN_HIDE_REQUEST_FORM,
		} );
	};
};

export const fetchMagicLoginRequestEmail = ( email ) => {
	return dispatch => {
		dispatch( {
			type: MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH,
			email,
		} );
	};
};

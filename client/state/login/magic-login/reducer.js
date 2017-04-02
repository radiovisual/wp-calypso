/**
 * External dependencies
 */
import { combineReducers } from 'redux';

/**
 * Internal dependencies
 */
import { createReducer } from 'state/utils';
import {
	DESERIALIZE,
	MAGIC_LOGIN_HANDLE_AUTH_TOKEN_FETCH,
	MAGIC_LOGIN_HANDLE_AUTH_TOKEN_RECEIVE,
	MAGIC_LOGIN_HIDE_REQUEST_FORM,
	MAGIC_LOGIN_SHOW_CHECK_YOUR_EMAIL_PAGE,
	MAGIC_LOGIN_SHOW_INTERSTITIAL_PAGE,
	MAGIC_LOGIN_SHOW_LINK_EXPIRED,
	MAGIC_LOGIN_SHOW_REQUEST_FORM,
	MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH,
	MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_RECEIVE,
	SERIALIZE,
} from 'state/action-types';

export const isShowingMagicLoginRequest = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_HIDE_REQUEST_FORM ]: () => false,
	[ MAGIC_LOGIN_SHOW_CHECK_YOUR_EMAIL_PAGE ]: () => false,
	[ MAGIC_LOGIN_SHOW_REQUEST_FORM ]: () => true,
	[ MAGIC_LOGIN_SHOW_INTERSTITIAL_PAGE ]: () => false,
	[ MAGIC_LOGIN_SHOW_LINK_EXPIRED ]: () => false,
} );

export const isShowingMagicLoginInterstitial = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_SHOW_CHECK_YOUR_EMAIL_PAGE ]: () => false,
	[ MAGIC_LOGIN_SHOW_INTERSTITIAL_PAGE ]: () => true,
	[ MAGIC_LOGIN_SHOW_REQUEST_FORM ]: () => false,
	[ MAGIC_LOGIN_SHOW_LINK_EXPIRED ]: () => false,
} );

export const isShowingMagicLoginExpired = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_SHOW_CHECK_YOUR_EMAIL_PAGE ]: () => false,
	[ MAGIC_LOGIN_SHOW_INTERSTITIAL_PAGE ]: () => true,
	[ MAGIC_LOGIN_SHOW_REQUEST_FORM ]: () => false,
	[ MAGIC_LOGIN_SHOW_LINK_EXPIRED ]: () => false,
} );

export const isShowingMagicLoginCheckYourEmail = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_SHOW_CHECK_YOUR_EMAIL_PAGE ]: () => true,
	[ MAGIC_LOGIN_SHOW_INTERSTITIAL_PAGE ]: () => false,
	[ MAGIC_LOGIN_SHOW_REQUEST_FORM ]: () => false,
	[ MAGIC_LOGIN_SHOW_LINK_EXPIRED ]: () => false,
} );

export const isFetchingMagicLoginEmail = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH ]: () => true,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_RECEIVE ]: () => false,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_FETCH ]: () => false,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_RECEIVE ]: () => false,
} );

export const isFetchingMagicLoginAuth = createReducer( false, {
	[ DESERIALIZE ]: () => false,
	[ SERIALIZE ]: () => false,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH ]: () => false,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_RECEIVE ]: () => false,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_FETCH ]: () => true,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_RECEIVE ]: () => false,
} );

export const requestMagicLoginEmailError = createReducer( null, {
	[ DESERIALIZE ]: () => null,
	[ SERIALIZE ]: () => null,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH ]: () => null,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_RECEIVE ]: ( state, { error } ) => error,
} );

export const requestMagicLoginEmailSuccess = createReducer( null, {
	[ DESERIALIZE ]: () => null,
	[ SERIALIZE ]: () => null,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_FETCH ]: () => null,
	[ MAGIC_LOGIN_REQUEST_LOGIN_EMAIL_RECEIVE ]: ( state, { status } ) => status,
} );

export const requestMagicLoginAuthError = createReducer( null, {
	[ DESERIALIZE ]: () => null,
	[ SERIALIZE ]: () => null,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_FETCH ]: () => null,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_RECEIVE ]: ( state, { error } ) => error
} );

export const requestMagicLoginAuthSuccess = createReducer( null, {
	[ DESERIALIZE ]: () => null,
	[ SERIALIZE ]: () => null,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_FETCH ]: () => null,
	[ MAGIC_LOGIN_HANDLE_AUTH_TOKEN_RECEIVE ]: ( state, { status } ) => status
} );

export default combineReducers( {
	isShowingMagicLoginCheckYourEmail,
	isShowingMagicLoginExpired,
	isShowingMagicLoginInterstitial,
	isShowingMagicLoginRequest,
	requestMagicLoginAuthError,
	requestMagicLoginAuthSuccess,
	requestMagicLoginEmailError,
	requestMagicLoginEmailSuccess,
} );

/*
 * TinyMCE Writing Improvement Tool Plugin
 * Author: Raphael Mudge (raffi@automattic.com), Andrew Duthie (andrew.duthie@automattic.com)
 *
 * http://www.afterthedeadline.com
 *
 * Distributed under the LGPL
 *
 * Derived from:
 *	$Id: editor_plugin_src.js 425 2007-11-21 15:17:39Z spocke $
 *
 *	@author Moxiecode
 *	@copyright Copyright (C) 2004-2008, Moxiecode Systems AB, All rights reserved.
 *
 *	Moxiecode Spell Checker plugin released under the LGPL with TinyMCE
 */

/**
 * External dependencies
 */
import tinymce from 'tinymce/tinymce';
import qs from 'querystring';
import find from 'lodash/find';

/**
 * Internal dependencies
 */
import { getLocaleSlug, translate } from 'lib/mixins/i18n';
import AtDCore from './core';
import PreferencesActions from 'lib/preferences/actions';
import PreferencesStore from 'lib/preferences/store';

/**
 * Module variables
 */
const SERVICE_HOSTNAME = 'service.afterthedeadline.com';
const SERVICE_LOCALIZED_SUBDOMAINS = [ 'en', 'pt', 'de', 'es', 'fr' ];
const IGNORE_PREFERENCE_NAME = 'editorProofreadIgnore';

function plugin( editor ) {
	var suggestionsMenu, started, atdCore, dom,
		each = tinymce.each;

	/* initializes the functions used by the AtD Core UI Module */
	function initAtDCore() {
		atdCore = new AtDCore();
		atdCore.map = each;
		atdCore._isTinyMCE = true;

		atdCore.getAttrib = function( node, key ) {
			return dom.getAttrib( node, key );
		};

		atdCore.findSpans = function( parent ) {
			if ( parent === undefined ) {
				return dom.select( 'span' );
			}

			return dom.select( 'span', parent );
		};

		atdCore.hasClass = function( node, className ) {
			return dom.hasClass( node, className );
		};

		atdCore.contents = function( node ) {
			return node.childNodes;
		};

		atdCore.replaceWith = function( old_node, new_node ) {
			return dom.replace( new_node, old_node );
		};

		atdCore.create = function( node_html ) {
			return dom.create( 'span', { class: 'mceItemHidden', 'data-mce-bogus': 1 }, node_html );
		};

		atdCore.removeParent = function( node ) {
			dom.remove( node, true );
			return node;
		};

		atdCore.remove = function( node ) {
			dom.remove( node );
		};

		atdCore.setIgnoreStrings( editor.getParam( 'atd_ignore_strings', [] ).join( ',' ) );
		atdCore.showTypes( editor.getParam( 'atd_show_types', '' ) );
	}

	function isMarkedNode( node ) {
		return ( node.className && /\bhidden(GrammarError|SpellError|Suggestion)\b/.test( node.className ) );
	}

	function markMyWords( errors ) {
		return atdCore.markMyWords( atdCore.contents( editor.getBody() ), errors );
	}

	// If no more suggestions, finish.
	function checkIfFinished() {
		if ( ! editor.dom.select( 'span.hiddenSpellError, span.hiddenGrammarError, span.hiddenSuggestion' ).length ) {
			if ( suggestionsMenu ) {
				suggestionsMenu.hideMenu();
			}

			finish();
		}
	}

	function ignoreWord( target, word, all ) {
		if ( all ) {
			each( editor.dom.select( 'span.hiddenSpellError, span.hiddenGrammarError, span.hiddenSuggestion' ), function( node ) {
				var text = node.innerText || node.textContent;

				if ( text === word ) {
					dom.remove( node, true );
				}
			} );
		} else {
			editor.dom.remove( target, true );
		}

		checkIfFinished();
	}

	// Called when the user clicks "Finish" or when no more suggestions left.
	// Removes all remaining spans and fires custom event.
	function finish() {
		var node,
			regex = new RegExp( 'mceItemHidden|hidden(((Grammar|Spell)Error)|Suggestion)' ),
			nodes = editor.dom.select( 'span' ),
			i = nodes.length;

		while ( i-- ) { // reversed
			node = nodes[i];

			if ( node.className && regex.test( node.className ) ) {
				editor.dom.remove( node, true );
			}
		}

		// Rebuild the DOM so AtD core can find the text nodes
		editor.setContent( editor.getContent( { format: 'raw' } ), { format: 'raw' } );

		started = false;
		editor.nodeChanged();
		editor.fire( 'SpellcheckEnd' );
	}

	function getServiceHostName() {
		// Attempt to find a supported localized subdomain which matches the
		// currently configured locale slug
		const localeSlug = getLocaleSlug();
		const subdomain = find( SERVICE_LOCALIZED_SUBDOMAINS, ( locale ) => {
			// Match on full localeSlug ("en") or with variant ("pt-BR")
			return localeSlug === locale || 0 === localeSlug.indexOf( locale + '-' );
		} );

		if ( subdomain ) {
			return `${ subdomain }.${ SERVICE_HOSTNAME }`;
		}

		// Use base hostname if localization not supported
		return SERVICE_HOSTNAME;
	}

	function sendRequest( path, data, success ) {
		// Display spinner
		editor.setProgressState( true );

		// Request from localized service hostname
		const xhr = new XMLHttpRequest();
		xhr.open( 'POST', `https://${ getServiceHostName() }/${ path }` );
		xhr.addEventListener( 'readystatechange', () => {
			if ( 4 === xhr.readyState ) {
				editor.setProgressState();

				if ( 200 === xhr.status ) {
					success( '' + xhr.responseText, xhr );
				}
			}
		} );

		const key = editor.getParam( 'atd_rpc_id' );
		xhr.send( qs.stringify( { data, key } ) );
	}

	function setAlwaysIgnore( text ) {
		// Save ignore preference
		let ignores = PreferencesStore.get( IGNORE_PREFERENCE_NAME ) || [];
		if ( -1 === ignores.indexOf( text ) ) {
			ignores.push( text );
		}

		PreferencesActions.set( IGNORE_PREFERENCE_NAME, ignores );
	}

	// Create the suggestions menu
	function showSuggestions( target ) {
		var pos, root, targetPos,
			items = [],
			text = target.innerText || target.textContent,
			errorDescription = atdCore.findSuggestion( target );

		if ( ! errorDescription ) {
			items.push( {
				text: translate( 'No suggestions', { comment: 'Editor proofreading no suggestions' } ),
				classes: 'atd-menu-title',
				disabled: true
			} );
		} else {
			items.push( {
				text: errorDescription.description,
				classes: 'atd-menu-title',
				disabled: true
			} );

			if ( errorDescription.suggestions.length ) {
				items.push( { text: '-' } ); // separator

				each( errorDescription.suggestions, function( suggestion ) {
					items.push( {
						text: suggestion,
						onclick: function() {
							atdCore.applySuggestion( target, suggestion );
							checkIfFinished();
						}
					} );
				} );
			}
		}

		if ( errorDescription && errorDescription.moreinfo ) {
			items.push( { text: '-' } ); // separator

			items.push( {
				text: translate( 'Explain…', { comment: 'Editor proofreading menu item' } ),
				onclick: function() {
					editor.windowManager.open( {
						title: translate( 'Explain…', { comment: 'Editor proofreading menu item' } ),
						url: errorDescription.moreinfo,
						width: 480,
						height: 380,
						inline: true
					} );
				}
			} );
		}

		items.push.apply( items, [
			{ text: '-' }, // separator
			{
				text: translate( 'Ignore suggestion', { comment: 'Editor proofreading menu item' } ),
				onclick: function() {
					ignoreWord( target, text );
				}
			}
		] );

		if ( editor.getParam( 'atd_ignore_enable' ) ) {
			items.push( {
				text: translate( 'Ignore always', { comment: 'Editor proofreading menu item' } ),
				onclick: function() {
					setAlwaysIgnore( text );
					ignoreWord( target, text, true );
				}
			} );
		} else {
			items.push( {
				text: translate( 'Ignore all', { comment: 'Editor proofreading menu item' } ),
				onclick: function() {
					ignoreWord( target, text, true );
				}
			} );
		}

		// Render menu
		suggestionsMenu = new tinymce.ui.Menu( {
			items: items,
			context: 'contextmenu',
			onautohide: function( event ) {
				if ( isMarkedNode( event.target ) ) {
					event.preventDefault();
				}
			},
			onhide: function() {
				suggestionsMenu.remove();
				suggestionsMenu = null;
			}
		} );

		suggestionsMenu.renderTo( document.body );

		// Position menu
		pos = tinymce.DOM.getPos( editor.getContentAreaContainer() );
		targetPos = editor.dom.getPos( target );
		root = editor.dom.getRoot();

		// Adjust targetPos for scrolling in the editor
		if ( root.nodeName === 'BODY' ) {
			targetPos.x -= root.ownerDocument.documentElement.scrollLeft || root.scrollLeft;
			targetPos.y -= root.ownerDocument.documentElement.scrollTop || root.scrollTop;
		} else {
			targetPos.x -= root.scrollLeft;
			targetPos.y -= root.scrollTop;
		}

		pos.x += targetPos.x;
		pos.y += targetPos.y;

		suggestionsMenu.moveTo( pos.x, pos.y + target.offsetHeight );
	}

	// Init everything
	editor.on( 'init', function() {
		// Set dom and atdCore
		dom = editor.dom;
		initAtDCore();

		// add a command to request a document check and process the results.
		editor.addCommand( 'mceWritingImprovementTool', function( callback ) {
			var results,
				errorCount = 0;

			if ( typeof callback !== 'function' ) {
				callback = function() {};
			}

			// checks if a global var for click stats exists and increments it if it does...
			if ( typeof window.AtD_proofread_click_count !== 'undefined' ) {
				window.AtD_proofread_click_count++;
			}

			// remove the previous errors
			if ( started ) {
				finish();
				return;
			}

			// send request to our service
			sendRequest( 'checkDocument', editor.getContent( { format: 'raw' } ), function( data, request ) {
				// turn off the spinning thingie
				editor.setProgressState();

				// if the server is not accepting requests, let the user know
				if ( request.status !== 200 || request.responseText.substr( 1, 4 ) === 'html' || ! request.responseXML ) {
					editor.windowManager.alert(
						translate( 'There was a problem communicating with the Proofreading service. Try again in one minute.', { comment: 'Editor proofreading error' } ),
						callback( 0 )
					);

					return;
				}

				// check to see if things are broken first and foremost
				if ( request.responseXML.getElementsByTagName( 'message' ).item( 0 ) !== null ) {
					editor.windowManager.alert(
						request.responseXML.getElementsByTagName( 'message' ).item( 0 ).firstChild.data,
						callback( 0 )
					);

					return;
				}

				results = atdCore.processXML( request.responseXML );

				if ( results.count > 0 ) {
					errorCount = markMyWords( results.errors );
				}

				if ( ! errorCount ) {
					editor.windowManager.alert( translate( 'No writing errors were found.', { comment: 'Editor proofreading success prompt' } ) );
				} else {
					started = true;
					editor.fire( 'SpellcheckStart' );
				}

				callback( errorCount );
			} );
		} );

		if ( editor.settings.content_css !== false ) {
			// CSS for underlining suggestions
			dom.addStyle( '.hiddenSpellError{border-bottom:2px solid red;cursor:default;}' +
				'.hiddenGrammarError{border-bottom:2px solid green;cursor:default;}' +
				'.hiddenSuggestion{border-bottom:2px solid blue;cursor:default;}' );
		}

		// Menu z-index > DFW
		tinymce.DOM.addStyle( 'div.mce-floatpanel{z-index:150100 !important;}' );

		// Click on misspelled word
		editor.on( 'click', function( event ) {
			if ( isMarkedNode( event.target ) ) {
				event.preventDefault();
				editor.selection.select( event.target );
				// Create the suggestions menu
				showSuggestions( event.target );
			}
		} );
	} );

	( () => {
		// Don't bother with ignore preferences if option disabled
		if ( ! editor.getParam( 'atd_ignore_enable' ) ) {
			return;
		}

		// Fetch preferences if unknown
		if ( undefined === PreferencesStore.getAll() ) {
			PreferencesActions.fetch();
		}

		// Sync ignored strings to core
		function syncToCore() {
			let ignores = PreferencesStore.get( IGNORE_PREFERENCE_NAME );
			if ( ignores ) {
				atdCore.setIgnoreStrings( ignores );
			}
		}

		editor.on( 'init', () => {
			PreferencesStore.on( 'change', syncToCore );
		} );

		editor.on( 'remove', () => {
			PreferencesStore.off( 'change', syncToCore );
		} );
	} )();

	editor.on( 'SpellcheckStart SpellcheckEnd', ( event ) => {
		editor.contentDocument.body.spellcheck = ( 'spellcheckend' === event.type );
		if ( ! editor.contentDocument.body.spellcheck ) {
			editor.contentDocument.body.focus();
			editor.contentDocument.body.blur();
		}
	} );

	editor.addMenuItem( 'spellchecker', {
		text: translate( 'Proofread Writing', { comment: 'Editor proofreading toolbar tooltip' } ),
		context: 'tools',
		cmd: 'mceWritingImprovementTool',
		onPostRender: function() {
			var self = this;

			editor.on( 'SpellcheckStart SpellcheckEnd', function() {
				self.active( started );
			} );
		}
	} );

	editor.addButton( 'spellchecker', {
		tooltip: translate( 'Proofread Writing', { comment: 'Editor proofreading button tooltip' } ),
		cmd: 'mceWritingImprovementTool',
		onPostRender: function() {
			var self = this;

			editor.on( 'SpellcheckStart SpellcheckEnd', function() {
				self.active( started );
			} );
		}
	} );

	editor.on( 'remove', function() {
		if ( suggestionsMenu ) {
			suggestionsMenu.remove();
			suggestionsMenu = null;
		}
	} );
}

export default function() {
	tinymce.PluginManager.add( 'AtD', plugin );
}

/**
 * External Dependencies
 */
import React from 'react';
import page from 'page';
import i18n from 'i18n-calypso';
import { find, pick } from 'lodash';

/**
 * Internal Dependencies
 */
import userFactory from 'lib/user';
import sitesFactory from 'lib/sites-list';
import route from 'lib/route';
import analytics from 'lib/analytics';
import titlecase from 'to-title-case';
import { setDocumentHeadTitle as setTitle } from 'state/document-head/actions';
import { renderPage } from 'lib/react-helpers';
import { savePreference } from 'state/preferences/actions';
import { getCurrentLayoutFocus } from 'state/ui/layout-focus/selectors';
import { setNextLayoutFocus } from 'state/ui/layout-focus/actions';
import AsyncLoad from 'components/async-load';
import StatsPagePlaceholder from 'my-sites/stats/stats-page-placeholder';
const user = userFactory();
const sites = sitesFactory();
const analyticsPageTitle = 'Stats';

function rangeOfPeriod( period, date ) {
	const periodRange = {
		period: period,
		startOf: date.clone().startOf( period ),
		endOf: date.clone().endOf( period )
	};

	if ( 'week' === period ) {
		if ( '0' === date.format( 'd' ) ) {
			periodRange.startOf.subtract( 6, 'd' );
			periodRange.endOf.subtract( 6, 'd' );
		} else {
			periodRange.startOf.add( 1, 'd' );
			periodRange.endOf.add( 1, 'd' );
		}
	}

	periodRange.key = period + ':' + periodRange.endOf.format( 'YYYY-MM-DD' );

	return periodRange;
}

function getNumPeriodAgo( momentSiteZone, date, period ) {
	const endOfCurrentPeriod = momentSiteZone.endOf( period );
	const durationAgo = i18n.moment.duration( endOfCurrentPeriod.diff( date ) );
	let numPeriodAgo;

	switch ( period ) {
		case 'day':
			numPeriodAgo = durationAgo.asDays();
			break;
		case 'week':
			numPeriodAgo = durationAgo.asWeeks();
			break;
		case 'month':
			numPeriodAgo = durationAgo.asMonths();
			break;
		case 'year':
			numPeriodAgo = durationAgo.asYears();
			break;
	}
	return numPeriodAgo;
}

function getSiteFilters( siteId ) {
	const filters = [
		{ title: i18n.translate( 'Insights' ), path: '/stats/insights/' + siteId, id: 'stats-insights' },
		{ title: i18n.translate( 'Days' ), path: '/stats/day/' + siteId, id: 'stats-day', period: 'day' },
		{ title: i18n.translate( 'Weeks' ), path: '/stats/week/' + siteId, id: 'stats-week', period: 'week' },
		{ title: i18n.translate( 'Months' ), path: '/stats/month/' + siteId, id: 'stats-month', period: 'month' },
		{ title: i18n.translate( 'Years' ), path: '/stats/year/' + siteId, id: 'stats-year', period: 'year' }
	];

	return filters;
}

module.exports = {
	resetFirstView( context ) {
		context.store.dispatch( savePreference( 'firstViewHistory', [] ) );
	},

	redirectToDefaultSitePage: function( context, next ) {
		const siteFragment = route.getSiteFragment( context.path );

		if ( siteFragment ) {
			// if we are redirecting we need to retain our intended layout-focus
			const currentLayoutFocus = getCurrentLayoutFocus( context.store.getState() );
			context.store.dispatch( setNextLayoutFocus( currentLayoutFocus ) );
			page.redirect( route.getStatsDefaultSitePage( siteFragment ) );
		} else {
			next();
		}
	},

	insights: function( context, next ) {
		const FollowList = require( 'lib/follow-list' );
		let siteId = context.params.site_id;
		const basePath = route.sectionify( context.path );
		const followList = new FollowList();

		// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
		context.store.dispatch( setTitle( i18n.translate( 'Stats', { textOnly: true } ) ) );

		let site = sites.getSite( siteId );
		if ( ! site ) {
			site = sites.getSite( parseInt( siteId, 10 ) );
		}
		siteId = site ? ( site.ID || 0 ) : 0;

		// Check for a siteId and sites
		if ( 0 === siteId ) {
			if ( 0 === sites.data.length ) {
				sites.once( 'change', function() {
					page( context.path );
				} );
			} else {
				// site is not in the user's site list
				next();
			}
		}

		analytics.pageView.record( basePath, analyticsPageTitle + ' > Insights' );

		const props = { followList };
		renderPage(
			<AsyncLoad require="my-sites/stats/stats-insights" placeholder={ <StatsPagePlaceholder /> } { ...props } />,
			context
		);
	},

	overview: function( context, next ) {
		const filters = function() {
			return [
				{ title: i18n.translate( 'Days' ), path: '/stats/day', altPaths: [ '/stats' ], id: 'stats-day', period: 'day' },
				{ title: i18n.translate( 'Weeks' ), path: '/stats/week', id: 'stats-week', period: 'week' },
				{ title: i18n.translate( 'Months' ), path: '/stats/month', id: 'stats-month', period: 'month' },
				{ title: i18n.translate( 'Years' ), path: '/stats/year', id: 'stats-year', period: 'year' }
			];
		};
		const basePath = route.sectionify( context.path );

		window.scrollTo( 0, 0 );

		// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
		context.store.dispatch( setTitle( i18n.translate( 'Stats', { textOnly: true } ) ) );

		const activeFilter = find( filters(), ( filter ) => {
			return context.pathname === filter.path || ( filter.altPaths && -1 !== filter.altPaths.indexOf( context.pathname ) );
		} );

		// Validate that date filter is legit
		if ( ! activeFilter ) {
			next();
		} else {
			analytics.mc.bumpStat( 'calypso_stats_overview_period', activeFilter.period );
			analytics.pageView.record( basePath, analyticsPageTitle + ' > ' + titlecase( activeFilter.period ) );

			const props = {
				period: activeFilter.period,
				path: context.pathname,
				sites,
				user
			};
			renderPage(
				<AsyncLoad placeholder={ <StatsPagePlaceholder /> } require="my-sites/stats/overview" { ...props } />,
				context
			);
		}
	},

	site: function( context, next ) {
		let siteId = context.params.site_id;
		const siteFragment = route.getSiteFragment( context.path );
		const queryOptions = context.query;
		const filters = getSiteFilters.bind( null, siteId );
		let date;
		const charts = function() {
			return [
				{ attr: 'views', legendOptions: [ 'visitors' ], gridicon: 'visible',
					label: i18n.translate( 'Views', { context: 'noun' } ) },
				{ attr: 'visitors', gridicon: 'user', label: i18n.translate( 'Visitors', { context: 'noun' } ) },
				{ attr: 'likes', gridicon: 'star', label: i18n.translate( 'Likes', { context: 'noun' } ) },
				{ attr: 'comments', gridicon: 'comment', label: i18n.translate( 'Comments', { context: 'noun' } ) }
			];
		};
		let chartTab;
		let period;
		let siteOffset = 0;
		let momentSiteZone = i18n.moment();
		let numPeriodAgo = 0;
		const basePath = route.sectionify( context.path );
		let baseAnalyticsPath;

		// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
		context.store.dispatch( setTitle( i18n.translate( 'Stats', { textOnly: true } ) ) );

		let currentSite = sites.getSite( siteId );
		if ( ! currentSite ) {
			currentSite = sites.getSite( parseInt( siteId, 10 ) );
		}
		siteId = currentSite ? ( currentSite.ID || 0 ) : 0;

		const activeFilter = find( filters(), ( filter ) => {
			return context.pathname === filter.path || ( filter.altPaths && -1 !== filter.altPaths.indexOf( context.pathname ) );
		} );

		if ( ! siteFragment || ! activeFilter ) {
			next();
		} else {
			if ( 0 === siteId ) {
				if ( 0 === sites.data.length ) {
					sites.once( 'change', function() {
						page( context.path );
					} );
				} else {
					next();
				}
			}

			if ( currentSite && currentSite.domain ) {
				// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
				context.store.dispatch( setTitle( i18n.translate( 'Stats', { textOnly: true } ) ) );
			}

			if ( currentSite && 'object' === typeof currentSite.options && 'undefined' !== typeof currentSite.options.gmt_offset ) {
				siteOffset = currentSite.options.gmt_offset;
			}
			momentSiteZone = i18n.moment().utcOffset( siteOffset );
			if ( queryOptions.startDate && i18n.moment( queryOptions.startDate ).isValid ) {
				date = i18n.moment( queryOptions.startDate ).locale( 'en' );
				numPeriodAgo = getNumPeriodAgo( momentSiteZone, date, activeFilter.period );
			} else {
				date = rangeOfPeriod( activeFilter.period, momentSiteZone.clone().locale( 'en' ) ).startOf;
			}

			numPeriodAgo = parseInt( numPeriodAgo, 10 );
			if ( numPeriodAgo ) {
				if ( numPeriodAgo > 9 ) {
					numPeriodAgo = '10plus';
				}
				numPeriodAgo = '-' + numPeriodAgo;
			} else {
				numPeriodAgo = '';
			}

			baseAnalyticsPath = basePath + '/:site';

			analytics.mc.bumpStat( 'calypso_stats_site_period', activeFilter.period + numPeriodAgo );
			analytics.pageView.record( baseAnalyticsPath, analyticsPageTitle + ' > ' + titlecase( activeFilter.period ) );

			period = rangeOfPeriod( activeFilter.period, date );

			chartTab = queryOptions.tab || 'views';

			const siteDomain = ( currentSite && ( typeof currentSite.slug !== 'undefined' ) )
					? currentSite.slug : siteFragment;

			const siteComponentChildren = {
				slug: siteDomain,
				path: context.pathname,
				date,
				charts,
				chartTab,
				context,
				sites,
				siteId,
				period,
			};

			renderPage(
				<AsyncLoad placeholder={ <StatsPagePlaceholder /> } require="my-sites/stats/site" { ...siteComponentChildren } />,
				context
			);
		}
	},

	summary: function( context, next ) {
		let siteId = context.params.site_id;
		const siteFragment = route.getSiteFragment( context.path );
		const queryOptions = context.query;
		const contextModule = context.params.module;
		const filters = [
			{ path: '/stats/' + contextModule + '/' + siteId,
				altPaths: [ '/stats/day/' + contextModule + '/' + siteId ], id: 'stats-day',
				period: 'day' },
			{ path: '/stats/week/' + contextModule + '/' + siteId, id: 'stats-week', period: 'week' },
			{ path: '/stats/month/' + contextModule + '/' + siteId, id: 'stats-month', period: 'month' },
			{ path: '/stats/year/' + contextModule + '/' + siteId, id: 'stats-year', period: 'year' }
		];
		let date;
		let period;

		const validModules = [
			'posts', 'referrers', 'clicks', 'countryviews', 'authors', 'videoplays', 'videodetails', 'podcastdownloads', 'searchterms'
		];
		let momentSiteZone = i18n.moment();
		const basePath = route.sectionify( context.path );

		let site = sites.getSite( siteId );
		if ( ! site ) {
			site = sites.getSite( parseInt( siteId, 10 ) );
		}
		siteId = site ? ( site.ID || 0 ) : 0;

		const activeFilter = find( filters, ( filter ) => {
			return context.pathname === filter.path || ( filter.altPaths && -1 !== filter.altPaths.indexOf( context.pathname ) );
		} );

		// if we have a siteFragment, but no siteId, wait for the sites list
		if ( siteFragment && 0 === siteId ) {
			if ( 0 === sites.data.length ) {
				sites.once( 'change', function() {
					page( context.path );
				} );
			} else {
				// site is not in the user's site list
				window.location = '/stats';
			}
		} else if ( ! activeFilter || -1 === validModules.indexOf( context.params.module ) ) {
			next();
		} else {
			if ( 'object' === typeof( site.options ) && 'undefined' !== typeof( site.options.gmt_offset ) ) {
				momentSiteZone = i18n.moment().utcOffset( site.options.gmt_offset );
			}
			if ( queryOptions.startDate && i18n.moment( queryOptions.startDate ).isValid ) {
				date = i18n.moment( queryOptions.startDate );
			} else {
				date = momentSiteZone.endOf( activeFilter.period );
			}
			period = rangeOfPeriod( activeFilter.period, date );

			const extraProps = context.params.module === 'videodetails' ? { postId: parseInt( queryOptions.post, 10 ) } : {};

			let statsQueryOptions = {};

			// All Time Summary Support
			if ( queryOptions.summarize && queryOptions.num ) {
				statsQueryOptions = pick( queryOptions, [ 'num', 'summarize' ] );
				statsQueryOptions.period = 'day';
			}

			analytics.pageView.record(
				basePath,
				analyticsPageTitle + ' > ' + titlecase( activeFilter.period ) + ' > ' + titlecase( context.params.module )
			);

			const props = {
				path: context.pathname,
				statsQueryOptions,
				date,
				context,
				period,
				...extraProps
			};

			renderPage(
				<AsyncLoad placeholder={ <StatsPagePlaceholder /> } require="my-sites/stats/summary" { ...props } />,
				context
			);
		}
	},

	post: function( context ) {
		let siteId = context.params.site_id;
		const postId = parseInt( context.params.post_id, 10 );
		const pathParts = context.path.split( '/' );
		const postOrPage = pathParts[ 2 ] === 'post' ? 'post' : 'page';

		let site = sites.getSite( siteId );
		if ( ! site ) {
			site = sites.getSite( parseInt( siteId, 10 ) );
		}
		siteId = site ? ( site.ID || 0 ) : 0;

		if ( 0 === siteId ) {
			if ( 0 === sites.data.length ) {
				sites.once( 'change', function() {
					page( context.path );
				} );
			} else {
				// site is not in the user's site list
				window.location = '/stats';
			}
		} else {
			analytics.pageView.record( '/stats/' + postOrPage + '/:post_id/:site',
				analyticsPageTitle + ' > Single ' + titlecase( postOrPage ) );

			const props = {
				path: context.path,
				postId,
				context,
			};

			renderPage(
				<AsyncLoad placeholder={ <StatsPagePlaceholder /> } require="my-sites/stats/stats-post-detail" { ...props } />,
				context
			);
		}
	},

	follows: function( context, next ) {
		let siteId = context.params.site_id;
		const FollowList = require( 'lib/follow-list' );
		const validFollowTypes = [ 'wpcom', 'email', 'comment' ];
		const followType = context.params.follow_type;
		let pageNum = context.params.page_num;
		const followList = new FollowList();
		const basePath = route.sectionify( context.path );

		let site = sites.getSite( siteId );
		if ( ! site ) {
			site = sites.getSite( parseInt( siteId, 10 ) );
		}
		siteId = site ? ( site.ID || 0 ) : 0;

		const siteDomain = ( site && ( typeof site.slug !== 'undefined' ) )
			? site.slug : route.getSiteFragment( context.path );

		if ( -1 === validFollowTypes.indexOf( followType ) ) {
			next();
		} else if ( 0 === siteId ) {
			if ( 0 === sites.data.length ) {
				sites.once( 'change', function() {
					page( context.path );
				} );
			} else {
				// site is not in the user's site list
				window.location = '/stats';
			}
		} else {
			pageNum = parseInt( pageNum, 10 );

			if ( ! pageNum || pageNum < 1 ) {
				pageNum = 1;
			}

			analytics.pageView.record(
				basePath.replace( '/' + pageNum, '' ),
				analyticsPageTitle + ' > Followers > ' + titlecase( followType )
			);

			const props = {
				path: context.path,
				page: pageNum,
				perPage: 20,
				total: 10,
				domain: siteDomain,
				sites,
				siteId,
				followType,
				followList,
			};

			renderPage(
				<AsyncLoad placeholder={ <StatsPagePlaceholder /> } require="my-sites/stats/follows" { ...props } />,
				context
			);
		}
	}
};
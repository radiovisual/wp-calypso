/**
 * External Dependencies
 */
import classNames from 'classnames';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';
import page from 'page';
import React from 'react';

/**
 * Internal Dependencies
 */
import analytics from 'lib/analytics';
import Button from 'components/button';
import Card from 'components/card';
import { cartItems } from 'lib/cart-values';
import CompactCard from 'components/card/compact';
import config from 'config';
import {
	creditCardExpiresBeforeSubscription,
	getName,
	hasPaymentMethod,
	hasPrivacyProtection,
	isCancelable,
	isExpired,
	isExpiring,
	isIncludedWithPlan,
	isOneTimePurchase,
	isPaidWithCreditCard,
	isPaidWithPayPalDirect,
	isRedeemable,
	isRefundable,
	isRenewable,
	isRenewal,
	isRenewing,
	isSubscription,
	paymentLogoType,
	purchaseType,
	showCreditCardExpiringWarning
} from 'lib/purchases';
import { getPurchase, getSelectedSite, goToList, recordPageView } from '../utils';
import { getByPurchaseId, hasLoadedUserPurchasesFromServer } from 'state/purchases/selectors';
import { getSelectedSite as getSelectedSiteSelector } from 'state/ui/selectors';
import HeaderCake from 'components/header-cake';
import { isDomainRegistration } from 'lib/products-values';
import { isRequestingSites } from 'state/sites/selectors';
import Main from 'components/main';
import PurchasePlanDetails from './plan-details';
import Notice from 'components/notice';
import NoticeAction from 'components/notice/notice-action';
import PaymentLogo from 'components/payment-logo';
import ProductLink from 'me/purchases/product-link';
import QueryUserPurchases from 'components/data/query-user-purchases';
import RemovePurchase from '../remove-purchase';
import VerticalNavItem from 'components/vertical-nav/item';
import paths from '../paths';
import support from 'lib/url/support';
import titles from 'me/purchases/titles';
import userFactory from 'lib/user';
import * as upgradesActions from 'lib/upgrades/actions';
import { isMonthly } from 'lib/plans/constants';

const user = userFactory();

function canEditPaymentDetails( purchase ) {
	return config.isEnabled( 'upgrades/credit-cards' ) && ! isExpired( purchase ) && ! isOneTimePurchase( purchase ) && ! isIncludedWithPlan( purchase );
}

function getEditCardDetailsPath( site, purchase ) {
	if ( isPaidWithCreditCard( purchase ) ) {
		const { payment: { creditCard } } = purchase;

		return paths.editCardDetails( site.slug, purchase.id, creditCard.id );
	} else {
		return paths.addCardDetails( site.slug, purchase.id );
	}
}

/**
 * Determines if data is being fetched. This is different than `isDataLoading` in `PurchasesUtils`
 * because this page can be rendered without a selected site.
 *
 * @param {object} props The props passed to `ManagePurchase`
 * @return {boolean} Whether or not the data is loading
 */
function isDataLoading( props ) {
	return ! props.hasLoadedSites || ! props.hasLoadedUserPurchasesFromServer;
}

const ManagePurchase = React.createClass( {
	propTypes: {
		destinationType: React.PropTypes.string,
		hasLoadedSites: React.PropTypes.bool.isRequired,
		hasLoadedUserPurchasesFromServer: React.PropTypes.bool.isRequired,
		selectedPurchase: React.PropTypes.object,
		selectedSite: React.PropTypes.oneOfType( [
			React.PropTypes.object,
			React.PropTypes.bool,
			React.PropTypes.undefined
		] )
	},

	componentWillMount() {
		if ( ! this.isDataValid() ) {
			page.redirect( paths.purchasesRoot() );
			return;
		}

		recordPageView( 'manage', this.props );
	},

	componentWillReceiveProps( nextProps ) {
		if ( this.isDataValid() && ! this.isDataValid( nextProps ) ) {
			page.redirect( paths.purchasesRoot() );
			return;
		}

		recordPageView( 'manage', this.props, nextProps );
	},

	isDataValid( props = this.props ) {
		if ( isDataLoading( props ) ) {
			return true;
		}

		return Boolean( getPurchase( props ) );
	},

	renderNotices() {
		if ( isDataLoading( this.props ) ) {
			return null;
		}

		return this.renderPurchaseExpiringNotice() || this.renderCreditCardExpiringNotice();
	},

	renderContactSupportToRenewMessage() {
		const purchase = getPurchase( this.props );

		if ( getSelectedSite( this.props ) ) {
			return null;
		}

		return (
			<div className="manage-purchase__contact-support">
				{ this.props.translate( 'You are the owner of %(purchaseName)s but because you are no longer a user on %(siteSlug)s, ' +
				'renewing it will require staff assistance. Please {{contactSupportLink}}contact support{{/contactSupportLink}}, ' +
				'and consider transferring this purchase to another active user on %(siteSlug)s to avoid this issue in the future.',
					{
						args: {
							purchaseName: getName( purchase ),
							siteSlug: this.props.selectedPurchase.domain
						},
						components: {
							contactSupportLink: <a href={ support.CALYPSO_CONTACT } />
						}
					} ) }
			</div>
		);
	},

	getExpiringText( purchase ) {
		if ( purchase.expiryStatus === 'manualRenew' ) {
			return this.props.translate( '%(purchaseName)s will expire and be removed from your site %(expiry)s. ' +
				'Please, add a credit card if you want it to autorenew. ',
				{
					args: {
						purchaseName: getName( purchase ),
						expiry: this.moment( purchase.expiryMoment ).fromNow()
					}
				}
			);
		}
		if ( isMonthly( purchase.productSlug ) ) {
			const expiryMoment = this.moment( purchase.expiryMoment );
			const daysToExpiry = this.moment( expiryMoment.diff( this.moment() ) ).format( 'D' );

			return this.props.translate( '%(purchaseName)s will expire and be removed from your site %(expiry)s days. ',
				{
					args: {
						purchaseName: getName( purchase ),
						expiry: daysToExpiry
					}
				}
			);
		}

		return this.props.translate( '%(purchaseName)s will expire and be removed from your site %(expiry)s.',
			{
				args: {
					purchaseName: getName( purchase ),
					expiry: this.moment( purchase.expiryMoment ).fromNow()
				}
			}
		);
	},

	renderPurchaseExpiringNotice() {
		const purchase = getPurchase( this.props );
		let noticeStatus = 'is-info';
		if ( ! isExpiring( purchase ) ) {
			return null;
		}

		if ( purchase.expiryMoment < this.moment().add( 90, 'days' ) ) {
			noticeStatus = 'is-error';
		}

		return (
			<Notice
				className="manage-purchase__purchase-expiring-notice"
				showDismiss={ false }
				status={ noticeStatus }
				text={ this.getExpiringText( purchase ) }>
				{ this.renderRenewNoticeAction() }
			</Notice>
		);
	},

	renderRenewNoticeAction() {
		if ( ! config.isEnabled( 'upgrades/checkout' ) || ! getSelectedSite( this.props ) ) {
			return null;
		}

		return (
			<NoticeAction onClick={ this.handleRenew }>
				{ this.props.translate( 'Renew Now' ) }
			</NoticeAction>
		);
	},

	renderCreditCardExpiringNotice() {
		const purchase = getPurchase( this.props ),
			{ payment: { creditCard } } = purchase;

		if ( isExpired( purchase ) || isOneTimePurchase( purchase ) || isIncludedWithPlan( purchase ) || ! getSelectedSite( this.props ) ) {
			return null;
		}

		if ( creditCardExpiresBeforeSubscription( purchase ) ) {
			return (
				<Notice
					className="manage-purchase__expiring-credit-card-notice"
					showDismiss={ false }
					status={ showCreditCardExpiringWarning( purchase ) ? 'is-error' : 'is-info' }>
					{
						this.props.translate( 'Your %(cardType)s ending in %(cardNumber)d expires %(cardExpiry)s ' +
							'– before the next renewal. Please {{a}}update your payment information{{/a}}.', {
								args: {
									cardType: creditCard.type.toUpperCase(),
									cardNumber: creditCard.number,
									cardExpiry: creditCard.expiryMoment.format( 'MMMM YYYY' )
								},
								components: {
									a: canEditPaymentDetails( purchase )
										? <a href={ getEditCardDetailsPath( this.props.selectedSite, purchase ) } />
										: <span />
								}
							}
						)
					}
				</Notice>
			);
		}
	},

	handleRenew() {
		const purchase = getPurchase( this.props ),
			renewItem = cartItems.getRenewalItemFromProduct( purchase, {
				domain: purchase.meta
			} ),
			renewItems = [ renewItem ];

		// Track the renew now submit
		analytics.tracks.recordEvent(
			'calypso_purchases_renew_now_click',
			{ product_slug: purchase.productSlug }
		);

		if ( hasPrivacyProtection( purchase ) ) {
			const privacyItem = cartItems.getRenewalItemFromCartItem( cartItems.domainPrivacyProtection( {
				domain: purchase.meta
			} ), {
				id: purchase.id,
				domain: purchase.domain
			} );

			renewItems.push( privacyItem );
		}

		if ( isRedeemable( purchase ) ) {
			const redemptionItem = cartItems.getRenewalItemFromCartItem( cartItems.domainRedemption( {
				domain: purchase.meta
			} ), {
				id: purchase.id,
				domain: purchase.domain
			} );

			renewItems.push( redemptionItem );
		}

		upgradesActions.addItems( renewItems );

		page( '/checkout/' + this.props.selectedSite.slug );
	},

	renderPrice() {
		const purchase = getPurchase( this.props ),
			{ amount, currencyCode, currencySymbol, productSlug } = purchase,
			period = productSlug && isMonthly( productSlug ) ? this.props.translate( 'month' ) : this.props.translate( 'year' );

		if ( isOneTimePurchase( purchase ) ) {
			return this.props.translate( '%(currencySymbol)s%(amount)f %(currencyCode)s {{period}}(one-time){{/period}}', {
				args: { amount, currencyCode, currencySymbol },
				components: {
					period: <span className="manage-purchase__time-period" />
				}
			} );
		}

		if ( isIncludedWithPlan( purchase ) ) {
			return this.props.translate( 'Free with Plan' );
		}

		return this.props.translate( '%(currencySymbol)s%(amount)f %(currencyCode)s {{period}}/ %(period)s{{/period}}', {
			args: {
				amount,
				currencyCode,
				currencySymbol,
				period
			},
			components: {
				period: <span className="manage-purchase__time-period" />
			}
		} );
	},

	renderPaymentInfo() {
		const purchase = getPurchase( this.props );

		if ( isDataLoading( this.props ) ) {
			return <span className="manage-purchase__content manage-purchase__detail" />;
		}

		if ( isIncludedWithPlan( purchase ) ) {
			return (
				<span className="manage-purchase__content manage-purchase__detail">
					{ this.props.translate( 'Included with plan' ) }
				</span>
			);
		}

		if ( hasPaymentMethod( purchase ) ) {
			let paymentInfo = null;

			if ( isPaidWithCreditCard( purchase ) ) {
				paymentInfo = purchase.payment.creditCard.number;
			} else if ( isPaidWithPayPalDirect( purchase ) ) {
				paymentInfo = this.props.translate( 'expiring %(cardExpiry)s', {
					args: {
						cardExpiry: purchase.payment.expiryMoment.format( 'MMMM YYYY' )
					},
				} );
			}

			return (
				<span className="manage-purchase__content manage-purchase__detail">
					<PaymentLogo type={ paymentLogoType( purchase ) } />
					{ paymentInfo }
				</span>
			);
		}

		return (
			<span className="manage-purchase__content manage-purchase__detail">
				{ this.props.translate( 'None' ) }
			</span>
		);
	},

	renderPaymentDetails() {
		const purchase = getPurchase( this.props );

		if ( ! isDataLoading( this.props ) && isOneTimePurchase( purchase ) ) {
			return null;
		}

		const paymentDetails = (
			<span>
				<em className="manage-purchase__content manage-purchase__detail-label">
					{ isDataLoading( this.props ) ? null : this.props.translate( 'Payment method' ) }
				</em>
				{ this.renderPaymentInfo() }
			</span>
		);

		if ( isDataLoading( this.props ) || ! canEditPaymentDetails( purchase ) || ! isPaidWithCreditCard( purchase ) || ! getSelectedSite( this.props ) ) {
			return (
				<li>
					{ paymentDetails }
				</li>
			);
		}

		return (
			<li>
				<a href={ getEditCardDetailsPath( this.props.selectedSite, purchase ) }>
					{ paymentDetails }
				</a>
			</li>
		);
	},

	renderRenewButton() {
		const purchase = getPurchase( this.props );

		if ( ! config.isEnabled( 'upgrades/checkout' ) || ! isRenewable( purchase ) || isExpired( purchase ) || isExpiring( purchase ) || ! getSelectedSite( this.props ) ) {
			return null;
		}

		return (
			<Button className="manage-purchase__renew-button" onClick={ this.handleRenew } compact>
				{ this.props.translate( 'Renew Now' ) }
			</Button>
		);
	},

	renderExpiredRenewNotice() {
		const purchase = getPurchase( this.props );

		if ( ! isRenewable( purchase ) && ! isRedeemable( purchase ) ) {
			return null;
		}

		if ( ! isExpired( purchase ) ) {
			return null;
		}

		return (
			<Notice
				showDismiss={ false }
				status="is-error"
				text={ this.props.translate( 'This purchase has expired and is no longer in use.' ) }>
				{ this.renderRenewNoticeAction() }
			</Notice>
		);
	},

	renderRenewsOrExpiresOnLabel() {
		const purchase = getPurchase( this.props );

		if ( isExpiring( purchase ) || creditCardExpiresBeforeSubscription( purchase ) ) {
			if ( isDomainRegistration( purchase ) ) {
				return this.props.translate( 'Domain expires on' );
			}

			if ( isSubscription( purchase ) ) {
				return this.props.translate( 'Subscription expires on' );
			}

			if ( isOneTimePurchase( purchase ) ) {
				return this.props.translate( 'Expires on' );
			}
		}

		if ( isExpired( purchase ) ) {
			if ( isDomainRegistration( purchase ) ) {
				return this.props.translate( 'Domain expired on' );
			}

			if ( isSubscription( purchase ) ) {
				return this.props.translate( 'Subscription expired on' );
			}

			if ( isOneTimePurchase( purchase ) ) {
				return this.props.translate( 'Expired on' );
			}
		}

		if ( isDomainRegistration( purchase ) ) {
			return this.props.translate( 'Domain auto-renews on' );
		}

		if ( isSubscription( purchase ) ) {
			return this.props.translate( 'Subscription auto-renews on' );
		}

		if ( isOneTimePurchase( purchase ) ) {
			return this.props.translate( 'Auto-renews on' );
		}

		return null;
	},

	renderRenewsOrExpiresOn() {
		const purchase = getPurchase( this.props );

		if ( isIncludedWithPlan( purchase ) ) {
			const attachedPlanUrl = paths.managePurchase(
				this.props.selectedSite.slug,
				purchase.attachedToPurchaseId
			);

			return (
				<span>
					{ this.props.translate( 'Renews with Plan' ) }
					<a href={ attachedPlanUrl }>
						{ this.props.translate( 'View Plan' ) }
					</a>
				</span>
			);
		}

		if ( isExpiring( purchase ) || isExpired( purchase ) || creditCardExpiresBeforeSubscription( purchase ) ) {
			return this.moment( purchase.expiryDate ).format( 'LL' );
		}

		if ( isRenewing( purchase ) ) {
			return this.moment( purchase.renewDate ).format( 'LL' );
		}

		if ( isOneTimePurchase( purchase ) ) {
			return this.props.translate( 'Never Expires' );
		}
	},

	renderEditPaymentMethodNavItem() {
		if ( ! getSelectedSite( this.props ) ) {
			return null;
		}

		const purchase = getPurchase( this.props );

		if ( canEditPaymentDetails( purchase ) ) {
			const path = getEditCardDetailsPath( this.props.selectedSite, purchase );

			const text = isRenewing( purchase )
				? this.props.translate( 'Edit Payment Method' )
				: this.props.translate( 'Add Credit Card' );

			return (
				<CompactCard href={ path }>{ text }</CompactCard>
			);
		}

		return null;
	},

	renderCancelPurchaseNavItem() {
		const purchase = getPurchase( this.props ),
			{ id } = purchase;

		if ( ! isCancelable( purchase ) || ! getSelectedSite( this.props ) ) {
			return null;
		}

		let text, link = paths.cancelPurchase( this.props.selectedSite.slug, id );

		if ( isRefundable( purchase ) ) {
			if ( isDomainRegistration( purchase ) ) {
				if ( isRenewal( purchase ) ) {
					text = this.props.translate( 'Contact Support to Cancel Domain and Refund' );
					link = support.CALYPSO_CONTACT;
				} else {
					text = this.props.translate( 'Cancel Domain and Refund' );
				}
			}

			if ( isSubscription( purchase ) ) {
				text = this.props.translate( 'Cancel Subscription and Refund' );
			}

			if ( isOneTimePurchase( purchase ) ) {
				text = this.props.translate( 'Cancel and Refund' );
			}
		} else {
			if ( isDomainRegistration( purchase ) ) {
				text = this.props.translate( 'Cancel Domain' );
			}

			if ( isSubscription( purchase ) ) {
				text = this.props.translate( 'Cancel Subscription' );
			}
		}

		return (
			<CompactCard href={ link }>
				{ text }
			</CompactCard>
		);
	},

	renderCancelPrivacyProtection() {
		const purchase = getPurchase( this.props ),
			{ id } = purchase;

		if ( isExpired( purchase ) || ! hasPrivacyProtection( purchase ) || ! getSelectedSite( this.props ) ) {
			return null;
		}

		return (
			<CompactCard href={ paths.cancelPrivacyProtection( this.props.selectedSite.slug, id ) }>
				{ this.props.translate( 'Cancel Privacy Protection' ) }
			</CompactCard>
		);
	},

	renderPurchaseDetail() {
		let classes,
			purchase,
			purchaseTypeSeparator,
			purchaseTitleText,
			purchaseTypeText,
			siteName,
			siteDomain,
			productLink,
			price,
			renewsOrExpiresOnLabel,
			renewsOrExpiresOn,
			renewButton,
			expiredRenewNotice,
			editPaymentMethodNavItem,
			cancelPurchaseNavItem,
			cancelPrivacyProtectionNavItem,
			contactSupportToRenewMessage;

		if ( isDataLoading( this.props ) ) {
			classes = 'manage-purchase__info is-placeholder';
			editPaymentMethodNavItem = <VerticalNavItem isPlaceholder />;
			cancelPurchaseNavItem = <VerticalNavItem isPlaceholder />;
		} else {
			purchase = getPurchase( this.props );
			classes = classNames( 'manage-purchase__info', {
				'is-expired': purchase && isExpired( purchase )
			} );
			purchaseTypeSeparator = purchaseType( purchase ) ? '|' : '';
			purchaseTitleText = getName( purchase );
			purchaseTypeText = purchaseType( purchase );
			siteName = purchase.siteName;
			siteDomain = purchase.domain;
			productLink = (
				<ProductLink selectedPurchase={ purchase } selectedSite={ this.props.selectedSite } />
			);
			price = this.renderPrice();
			renewsOrExpiresOnLabel = this.renderRenewsOrExpiresOnLabel();
			renewsOrExpiresOn = this.renderRenewsOrExpiresOn();
			renewButton = this.renderRenewButton();
			contactSupportToRenewMessage = this.renderContactSupportToRenewMessage();
			expiredRenewNotice = this.renderExpiredRenewNotice();
			editPaymentMethodNavItem = this.renderEditPaymentMethodNavItem();
			cancelPurchaseNavItem = this.renderCancelPurchaseNavItem();
			cancelPrivacyProtectionNavItem = this.renderCancelPrivacyProtection();
		}

		return (
			<div>
				<Card className={ classes }>
					<header className="manage-purchase__header">
						<strong className="manage-purchase__content manage-purchase__title">{ purchaseTitleText }</strong>
						<span className="manage-purchase__content manage-purchase__subtitle">
							{ purchaseTypeText } { purchaseTypeSeparator } { siteName ? siteName : siteDomain }
						</span>
						<span className="manage-purchase__content manage-purchase__settings-link">
							{ productLink }
						</span>
					</header>

					<ul className="manage-purchase__meta">
						<li>
							<em className="manage-purchase__content manage-purchase__detail-label">
								{ isDataLoading( this.props ) ? null : this.props.translate( 'Price' ) }
							</em>
							<span className="manage-purchase__content manage-purchase__detail">{ price }</span>
						</li>
						<li>
							<em className="manage-purchase__content manage-purchase__detail-label">{ renewsOrExpiresOnLabel }</em>
							<span className="manage-purchase__content manage-purchase__detail">
								{ renewsOrExpiresOn }
							</span>
						</li>
						{ this.renderPaymentDetails() }
					</ul>

					{ renewButton }
					{ contactSupportToRenewMessage }
				</Card>

				<PurchasePlanDetails
					hasLoadedSites={ this.props.hasLoadedSites }
					hasLoadedUserPurchasesFromServer={ this.props.hasLoadedUserPurchasesFromServer }
					selectedSite={ this.props.selectedSite }
					selectedPurchase={ this.props.selectedPurchase }
				/>

				{ expiredRenewNotice }
				{ editPaymentMethodNavItem }
				{ cancelPurchaseNavItem }
				{ cancelPrivacyProtectionNavItem }

				<RemovePurchase
					hasLoadedSites={ this.props.hasLoadedSites }
					hasLoadedUserPurchasesFromServer={ this.props.hasLoadedUserPurchasesFromServer }
					selectedSite={ this.props.selectedSite }
					selectedPurchase={ this.props.selectedPurchase }
				/>
			</div>
		);
	},

	render() {
		if ( ! this.isDataValid() ) {
			return null;
		}

		return (
			<span>
				<QueryUserPurchases userId={ user.get().ID } />
				<Main className="manage-purchase">
					<HeaderCake onClick={ goToList }>
						{ titles.managePurchase }
					</HeaderCake>
					{ this.renderNotices() }
					{ this.renderPurchaseDetail() }
				</Main>
			</span>
		);
	}
} );

export default connect(
	( state, props ) => ( {
		hasLoadedSites: ! isRequestingSites( state ),
		hasLoadedUserPurchasesFromServer: hasLoadedUserPurchasesFromServer( state ),
		selectedPurchase: getByPurchaseId( state, props.purchaseId ),
		selectedSite: getSelectedSiteSelector( state )
	} )
)( localize( ManagePurchase ) );

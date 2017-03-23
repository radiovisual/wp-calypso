/**
 * External dependencies
 */
import React from 'react';

/**
 * Internal dependencies
 */
import ProgressBar from 'components/progress-bar';
import Rating from 'components/rating';
import analytics from 'lib/analytics';

export default React.createClass({
    displayName: 'PluginRatings',

    propTypes: {
        rating: React.PropTypes.number,
        ratings: React.PropTypes.object,
        downloaded: React.PropTypes.number,
        slug: React.PropTypes.string,
        numRatings: React.PropTypes.number,
    },

    ratingTiers: [5, 4, 3, 2, 1],

    getDefaultProps() {
        return { barWidth: 88 };
    },

    buildReviewUrl(ratingTier) {
        const { slug } = this.props;
        return `https://wordpress.org/support/plugin/${slug}/reviews/?filter=${ratingTier}`;
    },

    renderPlaceholder() {
        return // eslint-disable-next-line
        (
            <div className="plugin-ratings is-placeholder">
                <div className="plugin-ratings__rating-stars">
                    <Rating rating={0} />
                </div>
                <div className="plugin-ratings__rating-text">{this.translate('Based on')}</div>
            </div>
        );
    },

    renderRatingTier(ratingTier) {
        const { ratings, slug, numRatings } = this.props;
        const numberOfRatings = ratings && ratings[ratingTier] ? ratings[ratingTier] : 0;
        const onClickPluginRatingsLink = () => {
            analytics.ga.recordEvent('Plugins', 'Clicked Plugin Ratings Link', 'Plugin Name', slug);
        };

        return (
            <a
                className="plugin-ratings__rating-container"
                key={`plugins-ratings__tier-${ratingTier}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClickPluginRatingsLink}
                href={this.buildReviewUrl(ratingTier)}
            >
                <span className="plugin-ratings__rating-tier-text">
                    {this.translate('%(ratingTier)s star', '%(ratingTier)s stars', {
                        count: ratingTier,
                        args: { ratingTier: ratingTier },
                    })}
                </span>
                <span className="plugin-ratings__bar">
                    <ProgressBar
                        value={numberOfRatings}
                        total={numRatings}
                        title={this.translate('%(numberOfRatings)s ratings', {
                            args: { numberOfRatings },
                        })}
                    />
                </span>
            </a>
        );
    },

    renderDownloaded() {
        let downloaded = this.props.downloaded;
        if (downloaded > 100000) {
            downloaded = this.numberFormat(Math.floor(downloaded / 10000) * 10000) + '+';
        } else if (downloaded > 10000) {
            downloaded = this.numberFormat(Math.floor(downloaded / 1000) * 1000) + '+';
        } else {
            downloaded = this.numberFormat(downloaded);
        }

        return (
            <div className="plugin-ratings__downloads">
                {this.translate('%(installs)s downloads', {
                    args: { installs: downloaded },
                })}
            </div>
        );
    },

    render() {
        const { placeholder, ratings, rating, numRatings } = this.props;

        if (placeholder) {
            return this.renderPlaceholder();
        }

        if (!ratings) {
            return null;
        }

        const tierViews = this.ratingTiers.map(tierLevel => this.renderRatingTier(tierLevel));
        return (
            <div className="plugin-ratings">
                <div className="plugin-ratings__rating-stars">
                    <Rating rating={rating} />
                </div>
                <div className="plugin-ratings__rating-text">
                    {this.translate(
                        'Based on %(ratingsNumber)s rating',
                        'Based on %(ratingsNumber)s ratings',
                        {
                            count: numRatings,
                            args: { ratingsNumber: numRatings },
                        }
                    )}
                </div>
                <div className="plugin-ratings__rating-tiers">
                    {tierViews}
                </div>
                {this.renderDownloaded()}
            </div>
        );
    },
});

/**
 * External dependencies
 */
import React, { PropTypes } from 'react';
import AutoDirection from 'components/auto-direction';

export default class PostCommentContent extends React.Component {
    render() {
        // Don't trust comment content unless it was provided by the API
        if (this.props.isPlaceholder) {
            return <div className="comments__comment-content">{this.props.content}</div>;
        }

        /*eslint-disable react/no-danger*/
        return (
            <AutoDirection>
                <div
                    className="comments__comment-content"
                    dangerouslySetInnerHTML={{ __html: this.props.content }}
                />
            </AutoDirection>
        );
        /*eslint-enable react/no-danger*/
    }
}

PostCommentContent.propTypes = {
    content: PropTypes.string.isRequired,
    isPlaceholder: PropTypes.bool,
};

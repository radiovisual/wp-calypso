/**
 * Internal dependencies
 */
import { combineTours } from 'layout/guided-tours/config-elements';
import { MainTour } from 'layout/guided-tours/tours/main-tour';
import { TutorialSitePreviewTour } from 'layout/guided-tours/tours/tutorial-site-preview-tour';
import { GDocsIntegrationTour } from 'layout/guided-tours/tours/gdocs-integration-tour';
import { FeaturedImageTour } from 'layout/guided-tours/tours/featured-image-tour';

export default combineTours( {
	main: MainTour,
	tutorialSitePreview: TutorialSitePreviewTour,
	gdocsIntegrationTour: GDocsIntegrationTour,
	featuredImageTour: FeaturedImageTour,
} );

import { AppError } from './AppError';
import { isCompleteVideo } from './contentCompleteness';

export function assertPublishableVideoMedia(
  status: string,
  fields: { videoFileUrl: string; embedUrl: string; videoUrl: string }
): void {
  if (status !== 'published') return;

  if (!isCompleteVideo(fields)) {
    throw new AppError(
      'Published videos require a hosted video file or a valid YouTube embed URL',
      400
    );
  }
}

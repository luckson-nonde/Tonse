import { SetMetadata } from '@nestjs/common';

/**
 * Opt a route OUT of the global TransformInterceptor envelope
 * ({ statusCode, message, data }).
 *
 * Needed for @Sse() endpoints: the interceptor's map() would wrap every
 * MessageEvent ({ data, type, id }) into the envelope, so Nest's SSE
 * serializer would no longer see the event's `type`/`id` fields — the
 * browser's EventSource would receive nameless, unframed messages.
 */
export const SKIP_TRANSFORM = 'skipTransform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM, true);

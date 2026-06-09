/** Process role flags — parsed once at module load. */
export const RUN_COLLOCATED_WORKER = process.env.RUN_WORKER === 'true';

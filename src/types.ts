import { RecordingOptions as RecOp } from '@arcsine/screen-recorder';

export interface RecordingOptions extends RecOp {
  countdown: number;
  animatedGif: boolean;
}

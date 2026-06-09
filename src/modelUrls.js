const BONES_AND_SCALES_REMOTE_URL =
  "https://raw.githubusercontent.com/lbb1318182671-svg/bqlstudio/main/large-assets/bonesandscales.glb";

export const BONES_AND_SCALES_MODEL_URL = import.meta.env.DEV
  ? "/large-assets/bonesandscales.glb"
  : BONES_AND_SCALES_REMOTE_URL;

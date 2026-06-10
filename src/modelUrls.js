const BONES_AND_SCALES_REMOTE_URL =
  "https://raw.githubusercontent.com/lbb1318182671-svg/bqlstudio/main/large-assets/bonesandscales.glb";

const GREEN_FACADE_REMOTE_URL =
  "https://raw.githubusercontent.com/lbb1318182671-svg/bqlstudio/main/large-assets/greenfacade.glb";

export const BONES_AND_SCALES_MODEL_URL = import.meta.env.DEV
  ? "/large-assets/bonesandscales.glb"
  : BONES_AND_SCALES_REMOTE_URL;

export const GREEN_FACADE_MODEL_URL = import.meta.env.DEV
  ? "/large-assets/greenfacade.glb"
  : GREEN_FACADE_REMOTE_URL;

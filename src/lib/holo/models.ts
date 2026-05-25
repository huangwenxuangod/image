export type StudioProvider = "image2" | "nanobanana";
export type StudioAspectRatio = "1:1" | "4:5" | "16:9";

type ProviderMap = Record<StudioAspectRatio, string>;

const modelMap: Record<StudioProvider, ProviderMap> = {
  image2: {
    "1:1": process.env.HOLO_MODEL_IMAGE2_1X1 ?? "GPT-images2 1:1",
    "4:5": process.env.HOLO_MODEL_IMAGE2_4X5 ?? "GPT-images2 2:3",
    "16:9": process.env.HOLO_MODEL_IMAGE2_16X9 ?? "GPT-images2 16:9-2K",
  },
  nanobanana: {
    "1:1":
      process.env.HOLO_MODEL_NANOBANANA_1X1 ?? "gemini-3.1-flash-image-square",
    "4:5":
      process.env.HOLO_MODEL_NANOBANANA_4X5 ?? "gemini-3.1-flash-image-three-four",
    "16:9":
      process.env.HOLO_MODEL_NANOBANANA_16X9 ?? "gemini-3.1-flash-image-landscape",
  },
};

export function resolveHoloModel(
  provider: StudioProvider,
  aspectRatio: StudioAspectRatio,
) {
  return modelMap[provider][aspectRatio];
}

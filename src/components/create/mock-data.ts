export type GenerationAsset = {
  id: string;
  title: string;
  prompt: string;
  model: "image2" | "nanobanana";
  aspectRatio: "1:1" | "4:5" | "16:9";
  createdAt: string;
  dimensions: string;
  palette: [string, string, string];
  project: string;
  favorite?: boolean;
};

export const generationAssets: GenerationAsset[] = [
  {
    id: "asset-01",
    title: "Editorial citrus still life",
    prompt:
      "A tactile editorial still life with sliced pomelo, chalky ceramic vessels, soft sunlight, quiet composition, and premium lifestyle magazine styling.",
    model: "image2",
    aspectRatio: "4:5",
    createdAt: "Today, 22:14",
    dimensions: "1536 × 1920",
    palette: ["#d1c18f", "#f6f0df", "#938163"],
    project: "Summer Study",
    favorite: true,
  },
  {
    id: "asset-02",
    title: "Porcelain desk scene",
    prompt:
      "A calm desk composition with ivory notes, brushed metal tools, porcelain cup, and muted editorial lighting for a refined creative workspace.",
    model: "nanobanana",
    aspectRatio: "1:1",
    createdAt: "Today, 21:02",
    dimensions: "1440 × 1440",
    palette: ["#f4efe3", "#b9c4cc", "#7d878d"],
    project: "Workspace Notes",
  },
  {
    id: "asset-03",
    title: "Soft archive object study",
    prompt:
      "Museum-like archive objects arranged on warm paper, delicate shadows, restrained palette, contemporary publication mood, ultra-clean composition.",
    model: "image2",
    aspectRatio: "4:5",
    createdAt: "Today, 20:31",
    dimensions: "1536 × 1920",
    palette: ["#ece1cf", "#bbb09d", "#6f675c"],
    project: "Archive",
  },
  {
    id: "asset-04",
    title: "Calm travel ephemera",
    prompt:
      "Collected travel ephemera on linen, faded ticket fragments, tactile paper grain, ivory and oat tones, art-directed product spread.",
    model: "nanobanana",
    aspectRatio: "16:9",
    createdAt: "Yesterday, 19:40",
    dimensions: "1792 × 1024",
    palette: ["#e9dcc8", "#b19474", "#705b4a"],
    project: "Travel Notes",
  },
  {
    id: "asset-05",
    title: "Studio flower sculpture",
    prompt:
      "Minimal floral sculpture with translucent petals, stone pedestal, airy beige gallery lighting, premium object photography.",
    model: "image2",
    aspectRatio: "4:5",
    createdAt: "Yesterday, 18:07",
    dimensions: "1536 × 1920",
    palette: ["#f7eee7", "#d7baa8", "#8c715f"],
    project: "Objects",
    favorite: true,
  },
  {
    id: "asset-06",
    title: "Quiet textile moodboard",
    prompt:
      "A luxury textile moodboard with layered samples, warm paper notes, clean labels, and daylight shadows in a calm designer studio.",
    model: "nanobanana",
    aspectRatio: "1:1",
    createdAt: "Yesterday, 16:54",
    dimensions: "1440 × 1440",
    palette: ["#d9ceb8", "#b8b5aa", "#6a665d"],
    project: "Material Study",
  },
];

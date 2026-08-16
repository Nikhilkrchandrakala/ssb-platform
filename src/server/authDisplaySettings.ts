import { connectDB } from "@/server/db";
import { AuthDisplaySettings } from "@/server/models";

export interface AuthDisplaySettingsData {
  mode: "slideshow" | "ad";
  slideshowImages: string[];
  adImage: string;
  adLink: string;
  transitionValue: number;
  transitionUnit: "seconds" | "minutes" | "hours" | "days";
}

/**
 * Shared by the /api/authDisplaySettings GET route and the SignIn/SignUp
 * server components — the latter call this directly (no HTTP round trip)
 * so the correct auth-page banner/slideshow image is already in the first
 * server-rendered HTML instead of flashing in ~1s later on the client.
 */
export async function getAuthDisplaySettings(): Promise<AuthDisplaySettingsData> {
  await connectDB();

  let settings = await AuthDisplaySettings.findOne();
  if (!settings) {
    settings = new AuthDisplaySettings({
      mode: "slideshow",
      slideshowImages: [],
      adImage: "",
      adLink: "",
      transitionValue: 5,
      transitionUnit: "seconds",
    });
    await settings.save();
  }

  return {
    mode: settings.mode,
    slideshowImages: settings.slideshowImages,
    adImage: settings.adImage,
    adLink: settings.adLink,
    transitionValue: settings.transitionValue,
    transitionUnit: settings.transitionUnit,
  };
}

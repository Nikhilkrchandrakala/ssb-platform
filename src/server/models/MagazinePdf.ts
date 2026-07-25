import mongoose, { Schema } from "mongoose";

const magazinePdfSchema = new Schema({
  pdfTitle: { type: String, required: true },
  pdfFilePath: { type: String, required: true },
  magazineFrontImage: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  tags: { type: String, required: true },
});

export const MagazinePdf = mongoose.models.MagazinePdf || mongoose.model("MagazinePdf", magazinePdfSchema);

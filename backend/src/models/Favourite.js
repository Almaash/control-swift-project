import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    githubRepoId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    url: { type: String, required: true },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    language: { type: String, default: null },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

favouriteSchema.index({ userId: 1, githubRepoId: 1 }, { unique: true });

export default mongoose.model("Favourite", favouriteSchema);

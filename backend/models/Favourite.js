
const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema(
  {
    githubRepoId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
    },

    url: {
      type: String,
      required: true,
    },

    stars: {
      type: Number,
      default: 0,
    },

    forks: {
      type: Number,
      default: 0,
    },

    language: {
      type: String,
      default: null,
    },

    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Favourite", favouriteSchema);

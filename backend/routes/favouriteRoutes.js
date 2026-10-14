
const express = require("express");
const Favourite = require("../models/Favourite");

const router = express.Router();

// GET: List all favourites
router.get("/", async (req, res) => {
  try {
    const favourites = await Favourite.find()
      .sort({ savedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: favourites.length,
      data: favourites,
    });
  } catch (error) {
    console.error("List favourites error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch favourite repositories.",
    });
  }
});

// GET: Check whether a repository is saved
router.get("/:githubRepoId", async (req, res) => {
  const githubRepoId = Number(req.params.githubRepoId);

  if (!Number.isSafeInteger(githubRepoId) || githubRepoId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid GitHub repository ID.",
    });
  }

  try {
    const favourite = await Favourite.findOne({ githubRepoId }).lean();

    return res.json({
      success: true,
      isFavourite: Boolean(favourite),
    });
  } catch (error) {
    console.error("Check favourite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to check favourite status.",
    });
  }
});

// POST: Save a repository
router.post("/", async (req, res) => {
  const {
    githubRepoId,
    name,
    fullName,
    description,
    url,
    stars,
    forks,
    language,
  } = req.body;

  if (
    !Number.isSafeInteger(githubRepoId) ||
    githubRepoId <= 0 ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof fullName !== "string" ||
    !/^[^/\s]+\/[^/\s]+$/.test(fullName) ||
    typeof url !== "string" ||
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(url) ||
    !url.replace(/\/$/, "").toLowerCase().endsWith(
      `/${fullName.toLowerCase()}`
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid repository details are required.",
    });
  }

  if (
    (description !== undefined &&
      description !== null &&
      typeof description !== "string") ||
    (language !== undefined &&
      language !== null &&
      typeof language !== "string") ||
    (stars !== undefined &&
      (!Number.isSafeInteger(stars) || stars < 0)) ||
    (forks !== undefined &&
      (!Number.isSafeInteger(forks) || forks < 0))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository metadata.",
    });
  }

  try {
    const favourite = await Favourite.create({
      githubRepoId,
      name: name.trim(),
      fullName: fullName.trim(),
      description: description ?? null,
      url,
      stars: stars ?? 0,
      forks: forks ?? 0,
      language: language ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Repository added to favourites.",
      data: favourite,
    });
  } catch (error) {
    // MongoDB duplicate-key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This repository is already in your favourites.",
      });
    }

    console.error("Save favourite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save favourite repository.",
    });
  }
});

// DELETE: Remove a repository from favourites
router.delete("/:githubRepoId", async (req, res) => {
  const githubRepoId = Number(req.params.githubRepoId);

  if (!Number.isSafeInteger(githubRepoId) || githubRepoId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid GitHub repository ID.",
    });
  }

  try {
    const favourite = await Favourite.findOneAndDelete({
      githubRepoId,
    });

    if (!favourite) {
      return res.status(404).json({
        success: false,
        message: "Favourite repository not found.",
      });
    }

    return res.json({
      success: true,
      message: "Repository removed from favourites.",
    });
  } catch (error) {
    console.error("Remove favourite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to remove favourite repository.",
    });
  }
});

module.exports = router;

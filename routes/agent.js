// routes/agent.js (optionnel REST endpoints)
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { expertProfiles } from "../utils/expertProfiles.js";

const router = express.Router();

router.post("/:projectType/message", verifyToken, async (req, res) => {
  const { projectType } = req.params;
  const { messages } = req.body; // messages: [{role, content}, ...]
  const profile = expertProfiles[projectType] || expertProfiles.batiment;
  // ici tu peux forward to OpenAI chat (non streaming) and return response
  res.json({ ok: true });
});

export default router;

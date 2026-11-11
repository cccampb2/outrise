import mongoose from "mongoose";
const schema = new mongoose.Schema({
  emailKey: { type: String, required: true, unique: true },
  generation: { type: String, required: true },
  requestedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("RegistrationEmailLimit", schema);

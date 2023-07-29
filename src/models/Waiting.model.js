const mongoose = require("mongoose");

const waitingUserSchema = mongoose.Schema({
  phone: { type: String, trim: true, unique: true },
});

waitingUserSchema.pre("save", async function (next) {
  next();
});

const WaitingUser = mongoose.model("WaitingUser", waitingUserSchema);

module.exports = WaitingUser;

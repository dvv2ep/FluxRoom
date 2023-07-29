const mongoose = require("mongoose");

const roomSchema = mongoose.Schema(
  {
    name: { type: String, trim: true, unique: true },
    description: { type: String, trim: true },
    listOfUsers: [mongoose.Schema.Types.ObjectId],
    profilePic: { type: String, trim: true },
    roomType: { type: Number, trim: true },
    creator: mongoose.Schema.Types.ObjectId,
    schedule: { type: String, trim: true },
    moderators: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true }
);

roomSchema.pre("save", async function (next) {
  next();
});

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;

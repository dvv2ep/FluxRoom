const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema(
  {
    description: { type: String, trim: true },
    signinMethod: { type: String, trim: true },
    blockedUsers: [mongoose.Schema.Types.ObjectId],
    tokens: [mongoose.Schema.Types.Mixed],
    phone: { unique: true, type: String, required: true },
    profilePic: { type: String, trim: true },
    username: { type: String, required: true, unique: true },
    joinedRooms: [mongoose.Schema.Types.ObjectId],
    invitedToRooms: [mongoose.Schema.Types.ObjectId],
    notificationID: { type: String },
    followers: [mongoose.Schema.Types.ObjectId],
    following: [mongoose.Schema.Types.ObjectId],
    mutedRooms: [mongoose.Schema.Types.ObjectId],
    uid: { type: Number },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.googleData;
  delete userObject.phoneData;
  delete userObject.tokens;

  return userObject;
};

userSchema.methods.searchableUser = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.signinMethod;
  delete userObject.blockedUsers;
  delete userObject.tokens;
  delete userObject.phone;
  delete userObject.profilePic;
  delete userObject.joinedRooms;
  delete userObject.invitedToRooms;
  delete userObject.notificationID;
  delete user.followers;
  delete user.following;
  delete user.uid;

  return userObject;
};

userSchema.methods.generateAuthToken = async function () {
  const user = this;

  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = user.tokens.concat({ token });
  await user.save();

  return token;
};

userSchema.statics.findByCredentials = async function (username, password) {
  const user = await User.findOne({ username });

  if (!user) throw new Error("No such user found");

  const isMatch = await bcrypt.compare(password, process.env.SAUCE);

  if (!isMatch) throw new Error("The password seems to be incorrect");

  return user;
};

userSchema.pre("save", async function (next) {
  const user = this;

  next();
});

const User = mongoose.model("User", userSchema);

// User.createMapping((err, mapping) => {
//   if (err) console.log("[User] createMapping error", err);
//   else {
//     console.log("[User] Mapping created");
//   }
// });

// const stream = User.synchronize();
// let count = 0;

// stream.on("data", () => {
//   count++;
// });

// stream.on("close", () => {
//   console.log("[User] indexed", count);
// });

// stream.on("error", (err) => {
//   console.log("[User] error indexing", err);
// });

module.exports = User;

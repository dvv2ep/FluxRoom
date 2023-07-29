const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const createToken = async (_id) => {
  const token = jwt.sign(_id.toString(), process.env.JWT_SECRET);
  const user = await User.findById(_id);
  user.token = token;
  await user.save();
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded", decoded);
    if (decoded) return decoded;
    else return false;
  } catch (err) {
    console.log("verifyToken err", err);
    return false;
  }
};

module.exports = { createToken, verifyToken };

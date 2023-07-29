const User = require("../models/User.model");
const WaitingUser = require("../models/Waiting.model");
const { solrClient } = require("../solr/connect");
const { createToken, verifyToken } = require("../middleware/newAuth");

const userSocketRouter = (socket) => {
  console.log("connected to /api/user");

  socket.on("isFilled", async (data, callback) => {
    const count = await User.countDocuments({});
    callback(false);
    // if (count >= 1000) callback(true);
    // else callback(false);
  });

  socket.on("addToWaitingList", async (phone) => {
    const user = await WaitingUser.find({ phone });
    if (!user) {
      const newUser = new WaitingUser({ phone });
      await newUser.save();
    }
  });

  socket.on("createUser", async (data, callback) => {
    console.log("createUser data", data);
    try {
      const user = new User(data);
      await user.save();
      const token = await createToken(user._id);
      console.log("createUser user", user, token);
      callback({ user, token });

      solrClient.add(
        { id: user._id, username: data.username, type: "user" },
        (err, result) => {
          if (err) console.log("err while adding user to solr", err);
          else console.log("user added to solr", result);
        }
      );
      solrClient.commit();
    } catch (err) {
      //   callback({ error: e });
      console.log("createUser err", err);
    }
  });

  socket.on("loginUser", async (data, callback) => {
    try {
      const user = await User.findByCredentials(data.username, data.password);
      const token = await createToken(user._id);
      console.log("loginUser user", user, token);
      callback({ user, token });
    } catch (err) {
      //   res.status(400).send({ err });
      console.log("loginUser err", err);
    }
  });

  socket.on("logoutUser", async (token, callback) => {
    if (token) {
      const response = await verifyToken(token);
      if (response) {
        try {
          const user = await User.findOne({ _id: response });
          user.tokens.splice(0, user.tokens.length);
          callback({ user });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("getSomeUser", async (data, callback) => {
    try {
      const someUser = await User.findOne({ _id: data._id });
      callback(someUser);
    } catch (err) {
      //   callback({ err });
      console.log("getSomeUser err", err);
    }
  });

  socket.on("searchUsers", async ({ query, limit, skip }, callback) => {
    try {
      const objQuery = solrClient
        .query()
        .q({ type: "user", username: `*${query}*` })
        .start(skip)
        .rows(limit);
      solrClient.search(objQuery, (err, results) => {
        if (err) console.log("[User] error searching", err);
        else {
          const solrUsers = results.response.docs;
          console.log("[User] solrUsers", solrUsers);
          const promise = solrUsers.map((user) => {
            user["_id"] = user["id"];
            delete user["id"];
            delete user["username"];
          });
          Promise.all(promise).then(() => {
            console.log("new sol users", solrUsers);
            callback(solrUsers);
          });
        }
      });
    } catch (err) {
      //   return res.send({ err });
      console.log("searchUser err", err);
    }
  });

  socket.on("getUserByPhone", async ({ phone }, callback) => {
    console.log("getting user by", phone);
    const user = await User.findOne({ phone });
    console.log("user", user);
    if (!user) return callback({ message: "No such user exists" });
    try {
      callback(user);
    } catch (err) {
      //   res.send({ err });
      console.log("getUserByPhone err", err);
    }
  });

  socket.on("updateUser", async ({ data, token }, callback) => {
    console.log("verifying", token);
    if (token) {
      const response = verifyToken(token);
      if (response) {
        try {
          const user = await User.findById(response);
          for (key in data) {
            user[`${key}`] = data[`${key}`];
          }

          if (!user) return callback({ message: "User does not exist" });
          callback({
            user,
            message: "User updated successfully",
          });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("getUserMe", async (token, callback) => {
    if (token) {
      const response = verifyToken(token);
      console.log("verifyToken response", response);
      if (response) {
        try {
          const user = await User.findOne({ _id: response });
          callback({ user });
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("follow", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const someUser = await User.findOne({ username: data.username });
          console.log("user", user, "someUser", someUser);
          if (!someUser)
            return callback({
              message: `username: ${username} does not exist.`,
            });
          if (user.followers.indexOf(someUser._id) === -1)
            user.followers.push(someUser._id);
          if (someUser.following.indexOf(_id) === -1)
            someUser.following.push(_id);
          console.log("updated user", user, "updated someUser", someUser);
          callback({ user });
          await user.save();
          await someUser.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("unfollow", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const someUser = await User.findOne({ username: data.username });
          if (!someUser)
            return callback({
              message: `username: ${username} does not exist.`,
            });
          const index1 = user.following.indexOf(someUser._id);
          if (index1 !== -1) user.following.splice(index1, 1);
          callback({ user });
          const index2 = someUser.followers.indexOf(_id);
          if (index2 !== -1) someUser.following.splice(index2, 1);
          await user.save();
          await someUser.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("removeFollower", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const index = await user.followers.indexOf(data._id);
          if (index !== -1) user.followers.splice(index, 1);
          callback({ user });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("block", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const index = user.blockedUsers.indexOf(data._id);
          if (index === -1) user.blockedUsers.push(data._id);
          callback({ user, message: `You blocked userid: ${data._id}` });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("unblock", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const index = user.blockedUsers.indexOf(data._id);
          if (index !== -1) user.blockedUsers.splice(index, 1);
          callback({ user });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("sendInvite", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const index = user.invitedToRooms.indexOf(data.roomId);
          if (index === -1) user.invitedToRooms.push(data.roomId);
          callback({ user });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("declineInvite", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const index = user.invitedToRooms.indexOf(data.roomId);
          if (index !== -1) user.invitedToRooms.splice(index, 1);
          callback({ user });
          await user.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("cancelInvite", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id: data.userId });
          const index = user.invitedToRooms.indexOf(data.roomId);
          if (index !== -1) user.invitedToRooms.splice(data.roomId, 1);
          callback({ user });
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("feedback", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const response = await sendFeedbackMail(data.text, data.username);
          callback(response);
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });
};

module.exports = { userSocketRouter };

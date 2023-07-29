const Room = require("../models/Room.model");
const { solrClient } = require("../solr/connect");
const { createToken, verifyToken } = require("../middleware/newAuth");
const User = require("../models/User.model");
const { generateAgoraRtcToken } = require("../utils/tokens");

const roomSocketRouter = (socket) => {
  console.log("connected to /api/room");

  socket.on("getChatroomInfo", async ({ _id }, callback) => {
    const room = await Room.findOne({ _id });
    if (!room) return callback({ message: "No room with this ID exists" });
    const modifiedRoom = {
      name: room.name,
      description: room.description,
      _id,
      listOfUsers: room.listOfUsers,
      schedule: room.schedule,
      roomType: room.roomType,
      creator: room.creator,
    };
    callback(modifiedRoom);
  });

  socket.on("createRoom", async (data, callback) => {
    try {
      const room = new Room(data);
      await room.save();
      const user = await User.findById(data.creator);
      user.joinedRooms ? user.joinedRooms.push(room._id) : [room._id];
      callback({ room, user });
      await user.save();
      solrClient.add(
        {
          id: room._id,
          name: data.name,
          description: data.description,
          type: "room",
        },
        (err, result) => {
          if (err) console.log("err while adding user to solr", err);
          else console.log("user added to solr", result);
        }
      );
      solrClient.commit();
    } catch (err) {
      callback({ err });
      console.log("createRoom err", err);
    }
  });

  socket.on("joinRoom", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findOne({ _id });
          const room = await Room.findOne({ _id: data.roomId });
          const userIndex = user.joinedRooms.indexOf(data.roomId);
          if (userIndex === -1) user.joinedRooms.push(data.roomId);
          const roomIndex = room.listOfUsers.indexOf(_id);
          if (roomIndex === -1) room.listOfUsers.push(_id);
          callback(user);
          await user.save();
          await room.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("leaveRoom", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const user = await User.findById(_id);
          const userIndex = user.joinedRooms.indexOf(data.roomId);
          if (userIndex === -1) user.joinedRooms.splice(userIndex, 1);
          callback({ user });
          await user.save();
          const room = await Room.findById(data.roomId);
          const roomIndex = room.listOfUsers.indexOf(_id);
          if (roomIndex !== -1) room.listOfUsers.splice(roomIndex, 1);
          await room.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("updateRoom", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const room = await Room.find({ _id: data._id });
          for (key in data) {
            room[`${key}`] = data[`${key}`];
          }
          callback({ room });
          await room.save();
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("getRtcToken", async ({ data, token }, callback) => {
    if (token) {
      const _id = verifyToken(token);
      if (_id) {
        try {
          const rtcToken = await generateAgoraRtcToken(data.roomId, data.uId);
          callback({ token: rtcToken });
        } catch (err) {
          callback({ err });
        }
      } else callback({ error: "Please authenticate" });
    } else callback({ error: "Please authenticate" });
  });

  socket.on("topTenRooms", async (data, callback) => {
    try {
      const rooms = await Room.aggregate([
        {
          $addFields: { listOfUsersLength: { $size: "$listOfUsers" } },
        },
        {
          $sort: { listOfUsersLength: -1 },
        },
        {
          $limit: 10,
        },
      ]);
      const newRooms = rooms.map((room) => room._id);
      callback({ rooms: newRooms });
    } catch (err) {
      //   res.send(err);
      console.log("topTenRooms err", err);
    }
  });

  socket.on("serachRooms", async ({ query, skip, limit }, callback) => {
    try {
      const objQuery = solrClient
        .query()
        .q({ type: "room", name: `*${query}*` })
        .start(skip)
        .rows(limit);
      solrClient.search(objQuery, (err, results) => {
        if (err) console.log("[User] error searching", err);
        else {
          const solrRooms = results.response.docs;
          const promise = solrRooms.map((room) => {
            room["_id"] = room["id"];
            delete room["id"];
            delete room["name"];
            delete room["description"];
          });
          Promise.all(promise).then(() => {
            callback(solrRooms);
          });
        }
      });
    } catch (err) {
      //   res.send({ err });
      console.log("searchRoom err", err);
    }
  });
};

module.exports = { roomSocketRouter };

const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });
const express = require("express");
const { redisClient } = require("./redis");
const circularJson = require("circular-json");
const { userSocketRouter } = require("./sockets/userRouter");
const { roomSocketRouter } = require("./sockets/roomRouter");

require("./db/mongoose");

const app = express();
const port = process.env.PORT || 5000;

const http = require("http").Server(app);
const io = require("socket.io")(http);

io.of("/api/user").on("connection", (socket) => {
  console.log("/api/user connections established");
  userSocketRouter(socket);
});
io.of("/api/room").on("connection", (socket) => {
  console.log("/api/room connections established");
  roomSocketRouter(socket);
});

const setUserRedis = (id, value) => {
  redisClient.set(`user:${id}`, circularJson.stringify(value));
  redisClient.set(`socket:${value.id}`, id);
};

const getUserIdRedis = async (id) => {
  let user;
  const promise = new Promise((resolve) => {
    redisClient.get(`user:${id}`, (err, res) => {
      user = circularJson.parse(res);
      resolve();
    });
  });
  return promise.then(() => user.id);
};

const getUserIdFromSocketRedis = async (socketId) => {
  let userId;
  const promise = new Promise((resolve) => {
    redisClient.get(`socket:${socketId}`, (err, res) => {
      userId = res;
      resolve();
    });
  });
  return promise.then(() => userId);
};

const setPodcastRedis = (id, value) => {
  redisClient.set(`podcast:${id}`, circularJson.stringify(value));
};

const getPodcastRedis = async (id) => {
  let podcast;
  const promise = new Promise((resolve) => {
    redisClient.get(`podcast:${id}`, (err, res) => {
      podcast = res;
      resolve();
    });
  });
  return promise.then(() => {
    console.log("podcast", podcast);
    if (podcast) {
      return JSON.parse(podcast);
    } else {
      setPodcastRedis(id, {
        moderators: [],
        speakers: [],
        listeners: [],
        host: null,
      });
      return { moderators: [], speakers: [], listeners: [], host: null };
    }
  });
};

const setPartyRedis = (id, value) => {
  redisClient.set(`party:${id}`, circularJson.stringify(value));
};

const getPartyRedis = async (id) => {
  let party;
  const promise = new Promise((resolve) => {
    redisClient.get(`party:${id}`, (err, res) => {
      party = res;
      resolve();
    });
  });
  return promise.then(() => {
    console.log("party", party);
    if (party) {
      return JSON.parse(party);
    } else {
      setPartyRedis(id, {
        speakers: [],
        listeners: [],
      });
      return { speakers: [], listeners: [] };
    }
  });
};

io.on("connection", (socket) => {
  socket.on("getAgoraId", (callback) => {
    const id = process.env.AGORA_APP_ID;
    callback(id);
  });

  socket.on("getAwsKeys", (data, callback) => {
    callback({
      accessKey: process.env.ACCESS_KEY,
      secretKey: process.env.SECRET_KEY,
    });
  });

  socket.on("newUser", (id) => {
    console.log("a new user joined", id);
    setUserRedis(id, socket);
  });

  socket.on("message", async ({ id, data }) => {
    const someUserSocketId = await getUserIdRedis(id);
    socket.broadcast.to(someUserSocketId).emit("message", data);
  });

  socket.on("roomMessage", (message) => {
    io.to(message.roomId).emit("roomMessage", message);
  });

  // Party
  socket.on("joinParty", async ({ roomId, userId }) => {
    console.log("new party user", roomId, userId);
    socket.join(roomId);
    const party = await getPartyRedis(roomId);
    if (party.listeners.indexOf(userId) === -1) {
      party.listeners.push(userId);
    }
    socket.emit("partySnapshot", party);
    socket.to(roomId).emit("newPartyListener", userId);
    setPartyRedis(roomId, party);
  });

  socket.on("makePartySpeaker", async ({ userId, roomId }) => {
    io.to(roomId).emit("newPartySpeaker", userId);
    const party = await getPartyRedis(roomId);
    if (party.listeners.indexOf(userId) !== -1) {
      party.listeners.splice(party.listeners.indexOf(userId), 1);
    }
    if (party.speakers.indexOf(userId) === -1) {
      party.speakers.push(userId);
    }
    setPartyRedis(roomId, party);
  });

  socket.on("makePartyListener", async ({ userId, roomId }) => {
    io.to(roomId).emit("newPartyListener", userId);
    const party = await getPartyRedis(roomId);
    if (party.speakers.indexOf(userId) !== -1) {
      party.speakers.splice(party.speakers.indexOf(userId), 1);
    }
    if (party.listeners.indexOf(userId) === -1) {
      party.listeners.push(userId);
    }
    setPartyRedis(roomId, party);
  });

  socket.on("leaveParty", async ({ roomId, userId }) => {
    socket.leave(roomId);
    const party = await getPartyRedis(roomId);
    const sIndex = party.speakers.indexOf(userId);
    const lIndex = party.listeners.indexOf(userId);
    party.speakers.splice(sIndex, 1);
    party.listeners.splice(lIndex, 1);
    socket.to(roomId).emit("partyUserLeft", userId);
    setPartyRedis(roomId, party);
  });

  socket.on("getPartyActive", (roomId) => {
    const objectEntries = Object.fromEntries(io.sockets.adapter.rooms)[roomId];
    const clients = objectEntries ? Array.from(objectEntries) : [];
    const clientIds = [];
    const mapping = clients.map(async (clientSocketId) => {
      const userId = await getUserIdFromSocketRedis(clientSocketId);
      clientIds.push(userId);
    });
    Promise.all(mapping).then(() => {
      socket.emit(`${roomId}Active`, clientIds);
    });
  });

  // Pocast
  socket.on("joinPodcast", async ({ roomId, userId, isModerator, isHost }) => {
    console.log("new pod user", roomId, userId, isModerator, isHost);
    socket.join(roomId);
    const room = await getPodcastRedis(roomId);
    if (isModerator) {
      if (room && room.moderators && room.moderators.indexOf(userId) === -1) {
        io.to(roomId).emit("newModerator", userId);
        const moderators = room.moderators
          ? room.moderators.concat(userId)
          : [userId];
        setPodcastRedis(roomId, { ...room, moderators });
      }
    } else if (isHost) {
      if (!room.host) {
        setPodcastRedis(roomId, { ...room, host: userId });
      }
    } else {
      if (room && room.listeners && room.listeners.indexOf(userId) === -1) {
        io.to(roomId).emit("_newListener", userId);
        const listeners = room.listeners
          ? room.listeners.concat(userId)
          : [userId];
        setPodcastRedis(roomId, { ...room, listeners });
      }
    }
    emitPodUsers(roomId);
  });

  const emitPodUsers = async (roomId) => {
    console.log("emitting Pod Users", roomId);
    const podcast = await getPodcastRedis(roomId);
    socket.emit("podSnapshot", podcast);
  };

  socket.on(
    "userRoleChange",
    async ({ userId, roomId, addType, removeType }) => {
      const room = await getPodcastRedis(roomId);
      room[addType].push(userId);
      const index = room[removeType].indexOf(userId);
      room[removeType].splice(index, 1);
      io.in(roomId).emit("podSnapshot", room);
      setPodcastRedis(roomId, room);
      const someUserSocketId = await getUserIdRedis(userId);
      socket.broadcast.to(someUserSocketId).emit("myRoleChanged", addType);
    }
  );

  socket.on("leavePodcast", async ({ userId, roomId, userRole }) => {
    io.to(roomId).emit("podUserLeft", { userId, userRole });
    const room = await getPodcastRedis(roomId);
    if (userRole === "moderator") {
      const index = room.moderators.indexOf(userId);
      room.moderators.splice(index, 1);
    } else if (userRole === "speaker") {
      const index = room.speakers.indexOf(userId);
      room.speakers.splice(index, 1);
    } else if (userRole === "listener") {
      const index = room.listeners.indexOf(userId);
      room.listeners.splice(index, 1);
    }
    setPodcastRedis(roomId, room);
  });

  socket.on("removePodUser", async ({ userId, roomId, removeType }) => {
    console.log("removePodUser", userId, roomId, removeType);
    const room = await getPodcastRedis(roomId);
    const index = room[removeType].indexOf(userId);
    room[removeType].splice(index, 1);
    io.to(roomId).emit("podSnapshot", room);
    const someUserSocketId = await getUserIdRedis(userId);
    socket.broadcast.to(someUserSocketId).emit("youAreKicked");
    io.in(roomId).emit("someoneKicked", userId);
    const dbRoom = await Room.findOne({ _id: roomId });
    const dbIndex = dbRoom.listOfUsers.indexOf(userId);
    dbRoom.listOfUsers.splice(dbIndex, 1);
    dbRoom.save();
    setPodcastRedis(roomId, room);
  });

  socket.on("permitVoice", async (someUserId) => {
    const someUserSocketId = await getUserIdRedis(someUserId);
    socket.broadcast
      .to(someUserSocketId)
      .emit("raiseHandResponse", "permitted");
  });

  socket.on("declineVoice", async (someUserId) => {
    const someUserSocketId = await getUserIdRedis(someUserId);
    socket.broadcast.to(someUserSocketId).emit("raiseHandResponse", "declined");
  });

  socket.on("leaveRoom", (id) => {
    socket.leave(id);
  });

  socket.on("disconnect", (id) => {
    socket.disconnect();
    redisClient.del(`user:${id}`);
    redisClient.del(`socket:${id}`);
  });
});

app.use(express.json());

app.get("/", (req, res) =>
  res.send('<a href="https://www.duckduckgo.com">Click here</a>')
);

app.use("/", (req, res) => {
  res.send('<a href="https://www.netflix.com/">404</a>');
});

http.listen(port, () =>
  console.log(`Server started at port ${process.env.PORT}`)
);

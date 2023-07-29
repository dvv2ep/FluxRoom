// const User = require('../models/User.model');
// const Room = require('../models/User.model');

// const addUserToRoom = async (roomID, userID) => {
//   const room = await Room.findOne({ _id: roomID });
//   const user = await User.findOne({ _id: userID });

//   if (!room || !user) return { message: 'Either room or user does not exist' };
//   if (room.listOfUsers.includes(user))
//     return { message: 'Room already contains user!!' };
//   else {
//     room.listOfUsers = [...room.listOfUsers, user];
//     return room;
//   }
// };

// const addRoomToUser = async (roomID, userID) => {
//   const room = await Room.findOne({ _id: roomID });
//   const user = await User.findOne({ _id: userID });

//   if (!room || !user)
//     res.send({ message: 'Either room or user does not exist' });

//   if (user.joinedRooms.includes(room))
//     return { message: 'User has already joined the room!!' };
//   else {
//     user.joinedRooms = [...user.joinedRooms, room];
//     return user;
//   }
// };

// addUserToRoom('5f5a117bbc65b6a5b24297f9', '').then((x) => console.log(x));

// module.exports = { addUserToRoom, addRoomToUser };

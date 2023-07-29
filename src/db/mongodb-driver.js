const { MongoClient, ObjectId } = require("mongodb");
const { quickSort } = require("../utils/utils");
const client = new MongoClient(process.env.MONGODB_URL, {
  useUnifiedTopology: true,
});

module.exports = { client };

const run = async () => {
  await client.connect();

  const database = client.db("fluxroomdb");
  const collection = database.collection("rooms");
  const ourRoom = await collection.findOne({
    _id: ObjectId("5f94a29fd9539f001752f4d2"),
  });
  return ourRoom;
};

run().then((r) => console.log(r));

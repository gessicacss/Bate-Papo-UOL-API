import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import formatHour from "./utils/formatHour.js";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
  console.log("MongoDB connected!");
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const body = { name, lastStatus: Date.now() };
  const messageBody = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: formatHour()
  };
  try {
    const userExist = await db.collection("participants").findOne({ name });
    if (userExist) {
      return res.status(409).send("Usuário já cadastrado");
    }
    await db.collection("participants").insertOne(body);
    await db.collection("messages").insertOne(messageBody);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/messages", async (req, res) => {
  const {to, text, type} = req.body;
  const {user} = req.headers;
  try {
    const isUserOn = await db.collection("participants").findOne({name: user})
    if(!isUserOn){
      return res.sendStatus(422);
    }
    const from = isUserOn.name;
    await db.collection("messages").insertOne({from, to, text, type, time: formatHour()})
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/messages", async (req, res) => {
  const {user} = req.headers;
  const {limit} = req.query;

  const messageType = {
    $or: [
      {type: {$ne: 'private_message'}},
      {type: 'private_message', to: user},
      {type: 'private_message', from: user}
    ]
  };
  try {
    if(limit && (isNaN(limit) || limit <= 0)){
      return res.sendStatus(422);
    }
    if(limit){
      const messages = await db.collection("messages").find(messageType).toArray();
      const newMessages = messages.slice(-limit)
      return res.send(newMessages)
    }
    const messages = await db.collection("messages").find(messageType).toArray();
    res.send(messages);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    const participant = await db
      .collection("participants")
      .findOneAndUpdate({ name: user }, { $set: { lastStatus: Date.now() } });
    if (!participant.value) {
      return res.sendStatus(404);
    }
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

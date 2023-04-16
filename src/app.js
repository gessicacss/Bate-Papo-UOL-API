import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import formatHour from "./utils/formatHour.js";
import joi from "joi";
import { stripHtml } from "string-strip-html";

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

  const participantSchema = joi.object({
    name: joi.string().trim().required(),
  });

  const validation = participantSchema.validate(req.body);

  try {
    if (validation.error) {
      return res.status(422).send(validation.error.message);
    }
    const validName = stripHtml(name).result;
    console.log(validName);
    console.log(typeof validName);
    const body = { name: validName, lastStatus: Date.now() };
    const messageBody = {
      from: validName,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: formatHour(),
    };
    const userExist = await db.collection("participants").findOne({ name });
    if (userExist) {
      return res.status(409).send("User already exists on participants list");
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
  const { user } = req.headers;

  const messageSchema = joi.object({
    to: joi.string().trim().required(),
    text: joi.string().trim().required(),
    type: joi.string().valid("private_message", "message").trim().required(),
  });

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  try {
    if (validation.error) {
      const errors = validation.error.details.map((details) => details.message);
      return res.status(422).send(errors);
    }

    const { to, text, type } = req.body;
    const sanitizedTo = stripHtml(to).result;
    const sanitizedText = stripHtml(text).result;
    const sanitizedType = stripHtml(type).result;
    const isUserOn = await db
      .collection("participants")
      .findOne({ name: user });

    if (!isUserOn) {
      return res.status(422).send("User isn't on participant list");
    }
    const from = isUserOn.name;
    await db
      .collection("messages")
      .insertOne({
        from,
        to: sanitizedTo,
        text: sanitizedText,
        type: sanitizedType,
        time: formatHour(),
      });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;

  const messageType = {
    $or: [
      { type: { $ne: "private_message" } },
      { type: "private_message", to: user },
      { type: "private_message", from: user },
    ],
  };
  try {
    if (limit && (isNaN(limit) || parseInt(limit) <= 0)) {
      return res.sendStatus(422);
    }
    if (limit) {
      const messages = await db
        .collection("messages")
        .find(messageType)
        .toArray();
      const newMessages = messages.slice(-limit);
      return res.send(newMessages);
    }
    const messages = await db
      .collection("messages")
      .find(messageType)
      .toArray();
    res.send(messages);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/messages/:id", async (req, res) => {
  const { user } = req.headers;
  const { id } = req.params;

  const messageSchema = joi.object({
    to: joi.string().trim().required(),
    text: joi.string().trim().required(),
    type: joi.string().valid("private_message", "message").trim().required(),
  });

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  try {
    if (validation.error) {
      const errors = validation.error.details.map((details) => details.message);
      return res.status(422).send(errors);
    }

    const { to, text, type } = req.body;
    const sanitizedTo = stripHtml(to).result;
    const sanitizedText = stripHtml(text).result;
    const sanitizedType = stripHtml(type).result;
    const editedMessage = {
      from: user,
      to: sanitizedTo,
      text: sanitizedText,
      type: sanitizedType,
      time: formatHour(),
    };

    const editMessage = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });

    if (!editMessage) {
      return res.status(404).send("There's no message with this id!");
    }
    if (editMessage.from !== user) {
      return res
        .status(401)
        .send("You don't have permission to edit this message.");
    }
    await db
      .collection("messages")
      .updateOne({ _id: new ObjectId(id) }, { $set: editedMessage });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete("/messages/:id", async (req, res) => {
  const { user } = req.headers;
  const { id } = req.params;
  try {
    const message = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).send("There's no message with this id!");
    }
    if (message.from !== user) {
      return res
        .status(401)
        .send("You don't have permission to delete this message.");
    }
    await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
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

setInterval(async () => {
  const lastStatus = 10000;
  try {
    const participants = await db
      .collection("participants")
      .find({ lastStatus: { $lt: Date.now() - lastStatus } })
      .toArray();
    if (participants.length > 0) {
      for (const offlineUser of participants) {
        const { _id, name } = offlineUser;
        await db
          .collection("participants")
          .deleteOne({ _id: new ObjectId(_id) });
        await db.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: formatHour(),
        });
      }
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
}, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

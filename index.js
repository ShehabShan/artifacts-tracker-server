const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 9000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://historical-artifacts-tra-b83ed.firebaseapp.com",
      "https://historical-artifacts-tra-b83ed.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize access" });
    }

    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d6z2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    // await client.db("admin").command({ ping: 1 });
    // //console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    const database = client.db("historical_artifacts_tracker");
    const artifactsCollection = database.collection("artifacts");
    const likedCollection = database.collection("likedArtifacts");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const JwtToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });

      res
        .cookie("token", JwtToken, {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/clear-jwt", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.get("/allArtifacts", async (req, res) => {
      const result = await artifactsCollection.find().toArray();
      res.send(result);
    });

    app.get("/featureArtifacts", async (req, res) => {
      const artifacts = await artifactsCollection.find().toArray();
      artifacts.sort((a, b) => b.likeCount - a.likeCount);
      res.send(artifacts);
    });

    app.delete("/allArtifacts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await artifactsCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/allArtifacts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await artifactsCollection.findOne(filter);
      res.send(result);
    });
    app.patch("/allArtifacts/:id", async (req, res) => {
      const id = req.params.id;
      const { action } = req.body;
      //console.log(id);
      const filter = { _id: new ObjectId(id) };

      const likeChange = action === "increment" ? 1 : -1;

      const updateLike = {
        $inc: { likeCount: likeChange },
      };

      const result = await artifactsCollection.updateOne(filter, updateLike);

      res.send(result);
    });

    app.get("/updateMyArtifact/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await artifactsCollection.findOne(filter);
      res.send(result);
    });

    app.patch("/updateMyArtifact/:id", async (req, res) => {
      const id = req.params.id;
      const updatedArtifact = req.body;

      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: updatedArtifact,
      };

      const result = await artifactsCollection.updateOne(filter, update);
      res.send(result);
    });

    app.get("/myArtifacts", verifyToken, async (req, res) => {
      const email = req.query.email;
      //console.log(email);
      const filter = { SellerEmail: email };
      const result = await artifactsCollection.find(filter).toArray();
      //console.log(result);
      res.send(result);
    });

    app.post("/add-artifact", async (req, res) => {
      const data = req.body;
      const result = await artifactsCollection.insertOne(data);
      res.send(result);
    });

    app.post("/likedArtifact", async (req, res) => {
      const likedDetails = req.body;
      const result = await likedCollection.insertOne(likedDetails);
      res.send(result);
    });

    app.delete("/likedArtifact", async (req, res) => {
      const { email, artifactId } = req.query;
      const filter = { email: email, artifactId: artifactId };
      const result = await likedCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/likedArtifact", async (req, res) => {
      const { email, artifactId } = req.query;
      const filter = { email: email, artifactId: artifactId };
      const result = await likedCollection.findOne(filter);

      if (result) {
        res.send({ isLiked: true });
      } else {
        res.send({ isLiked: false });
      }
    });

    app.get("/myLikedArtifact", verifyToken, async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const cursor = likedCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);

      // res.send(result);
    });

    app.get("/singleLikedArtifact/:id", async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await artifactsCollection.findOne(filter);
      res.send(result);
    });

    app.get("/allLikedArtifact", async (req, res) => {
      const artifactId = req.query.artifactId;
      const filter = { _id: new ObjectId(artifactId) };
      const result = await artifactsCollection.findOne(filter);
      res.send(result);
    });
  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

// mongodb end

app.get("/", (req, res) => {
  res.send("historical_artifacts_tracker");
});

app.listen(port, () => {
  //console.log(`job is waiting is : ${port}`);
});

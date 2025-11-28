const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6prdapd.mongodb.net/?retryWrites=true&w=majority`;

// MongoClient
const client = new MongoClient(uri);

// Google Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function run() {
  try {
    // await client.connect();
    const db = client.db("tech-bazar-db");
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");

    console.log("MongoDB connected!");

    // ---------------------------
    // Register User
    // ---------------------------
    app.post("/register", async (req, res) => {
      const { name, email, password } = req.body;
      const exists = await usersCollection.findOne({ email });
      if (exists)
        return res.status(400).send({ message: "User already exists" });
      const result = await usersCollection.insertOne({ name, email, password });
      res.send(result);
    });

    // ---------------------------
    // Login User
    // ---------------------------
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email, password });
      if (!user)
        return res.status(401).send({ message: "Invalid credentials" });
      res.send(user);
    });

    // ---------------------------
    // Google Login
    // ---------------------------
    app.post("/google-login", async (req, res) => {
      const { token } = req.body;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { name, email } = payload;

        // check if user exists
        let user = await usersCollection.findOne({ email });
        if (!user) {
          const result = await usersCollection.insertOne({
            name,
            email,
            password: null,
          });
          user = { _id: result.insertedId, name, email };
        }

        res.send(user);
      } catch (err) {
        res.status(400).send({ message: "Google login failed" });
      }
    });

    // ---------------------------
    // Products API
    // ---------------------------
    app.get("/products", async (req, res) => {
      const products = await productsCollection.find({}).toArray();
      res.send(products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(product);
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    console.log("Backend ready & running...");
  } catch (err) {
    console.log(err);
  }
}

run().catch(console.dir);

// Simple root route
app.get("/", (req, res) => {
  res.send("Tech Bazar Backend Running");
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

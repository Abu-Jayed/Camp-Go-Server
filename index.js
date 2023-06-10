const express = require('express')
const cors = require("cors");
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



// code from data base start

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pwifs1n.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    /* DataBase collection */
    const classCollection = client.db("campGo").collection("classes")
    const instructorsCollection = client.db("campGo").collection("instructors")
    const usersCollection = client.db("campGo").collection("users")
    const selectedClassCollection = client.db("campGo").collection("selectedClass")


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '11h' })

      res.send({ token })
    })


    // users related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      console.log(user,query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    
    

    app.post('/selectedClass', async (req, res) => {
      const item = req.body;
      const result = await selectedClassCollection.insertOne(item);
      res.send(result);
    })



    // Classes related api
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().sort({enrolled:-1}).toArray();
      res.send(result);
    });

    app.get('/allclasses', async (req, res) => {
      const query = {status: 'approved'}
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // Instructors related api
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });


    /* dashBoard related api */

    app.get('/dashboard/:email', async (req,res)=>{
      const email = req.params.email;
      console.log(email);
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      // console.log(user);
      res.send(user)
    })

    /* selected class api */
    app.get('/class', async (req, res) => {
      const email = req.query.email;

      // if (!email) {
      //   res.send([]);
      // }

      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' })
      // }

      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// code from data base end





app.get('/', (req, res) => {
  res.send('Hello SCIC !!!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
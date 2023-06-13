const express = require('express')
const cors = require("cors");
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)


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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const paidClassCollection = client.db("campGo").collection("paidClass")



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
      // console.log(user,query);
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



    // Classes page related api
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().sort({ enrolled: -1 }).toArray();
      res.send(result);
    });

    app.get('/allclasses', async (req, res) => {
      const query = { status: 'approved' }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/checkrole/:email', async(req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const result = await usersCollection.find(query).toArray();
      res.send(result)
    })


    // Instructors related api
    app.get('/classes/teacher', async (req, res) => {
      const query = {status:'approved'}
      const result = await classCollection.find(query).sort({enrolled: -1}).toArray();
      res.send(result);
    });
    app.get('/allteacher', async (req, res) => {
      const query = {role:'teacher'}
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });


    /* dashBoard related api */

    app.get('/dashboard/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      // console.log(user);
      res.send(user)
    })

    /* selected class api */
    app.get('/class', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });





/* api for payment history */
app.get('/paymentHistory', async (req, res) => {
  const { email } = req.query;
  const query = { userEmail: email };

  try {
    const result = await paidClassCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error retrieving payment history:', error);
    res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});





    app.delete('/selectedClass/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    })

    /* enrolled class */
    app.get('/enrolledClass', async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await paidClassCollection.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    /* update seats */




    /* teacher DashBoard */
    app.post('/class', async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem)
      res.send(result);
    })

    app.get('/teacherclass', async (req, res) => {
      const email = req.query.email;
      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    /* admin DashBoard */
    app.put('/classes/:id/status', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };

      const result = await classCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.send(result)
      // console.log(status);
    })


    app.put('/users/:id/role', async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const filter = { _id: new ObjectId(id) };

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send(result)
      // console.log(status);
    })

    /* send feedback to teacher */
    app.patch('/classes/feedback/:id', async (req, res) => {
      const classId = req.params.id;
      const { feedback } = req.body;
      const id = {_id: new ObjectId(classId)}
    
      try {
        // Update the class document to add the feedback property
        const updatedClass = await classCollection.findOneAndUpdate(
          id,
          { $set: { feedback } },
          { returnOriginal: false }
        );
    
        res.send(updatedClass);
      } catch (error) {
        console.error("Error adding feedback:", error);
        res.status(500).json({ error: "Failed to add feedback." });
      }
    });



    /* update enrolled and available seat */
    app.put('/classes/seatupdate/:id', async (req, res) => {
      const { id } = req.params;
      const { enrolled,availableSeats } = req.body;
      const filter = { _id: new ObjectId(id) };
      
      const newEnrolled = parseInt(enrolled)
      
      console.log(availableSeats);
      
      const result = await classCollection.updateOne(
        filter,
        { $inc: { enrolled: 1 , availableSeats: -1} },
      );
      res.send(result)
      console.log(id);
    })




    app.get('/users', async (req, res) => {
      const users = await usersCollection.find().toArray()
      res.send(users);
    });



    /* payment related api */
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      
      const id = payment.foundItem.classId;
      const query = { classId: id }
      const existingUser = await paidClassCollection.findOne(query);
      
      if (existingUser?.classId === id) {
        console.log('same class');
        return res.send({ message: 'user already exists' })
      }
      else{
        const addPaidClass = await paidClassCollection.insertOne(payment);
        res.send(addPaidClass);
      }

      // console.log('after payment',payment.foundItem.classId);
      // const id = payment.foundItem.classId;
      
      // const query = {_id: new ObjectId(id)}
      // const currentEnrolled = payment.foundItem.enrolled;
      // const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      // const deleteResult = await cartCollection.deleteMany(query)
      // console.log('exit',existingUser);
    })


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
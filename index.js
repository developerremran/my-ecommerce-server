const express = require('express')
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cors = require('cors')
const port = process.env.PORT || 5000;




// middleware 
app.use(cors())
app.use(express.json())



// jwt midddleware 
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized token" });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized token" });
    }
    req.decoded = decoded;
    next();
  });

}

// main 


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.w4g0avb.mongodb.net/?retryWrites=true&w=majority`;

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

    //    data collection 
    const products = client.db('Products').collection('productsCollection')
    const userData = client.db('userData').collection('userDataCollection')
    const CartData = client.db('CartData').collection('CartDataCollection')


    // JWT 
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token })
    })



    // cart data 
    app.post('/cartData/:id', async (req, res) => {
      const body = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const alreadyAdded = await CartData.findOne(query);
      if(alreadyAdded){
          return res.send('Already added this product')
      }
      const result = await CartData.insertOne(body)
      res.send(result)
    })


    app.post('/newUsers', async (req, res) => {
      const body = req.body;
      const email = req.params.email;
      // console.log(email);
      const query = { email: email };
      const exitUser = await userData.findOne(query)

      if (exitUser) {
        return res.status(400).send('This user already exists');
      }
      const newUser = await userData.insertOne(body)
      res.send(newUser)
    })



    app.get('/products', async (req, res) => {
      const body = req.body;
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };

      }
      const result = await products.find(query).toArray();
      res.send(result);

    });

    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.find(query).toArray();
      res.send(result);
    });

    app.post('/productUpload', async (req, res) => {
      const body = req.body;
      const result = await products.insertOne(body)
      res.send(result)
    })

    // delete 
    app.delete('/productUpload/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const deleted = await products.deleteOne(query);
      res.send(deleted);
    });





    // admin route  users all 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userData.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }
      next()
    }

    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const body = req.body;
      const result = await userData.find(body).toArray()
      res.send(result)
    })


    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await userData.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.delete('/users/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userData.deleteOne(query)
      res.send(result)
    })

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userData.updateOne(filter, updatedDoc);
      res.send(result);
    });



// product cart data 
app.get('/cartData', async (req, res) => {
  const body = req.body;
  const email = req.query.email;
  const query = {email :email}
  const result = await CartData.find(query).toArray()
  res.send(result)
})
// delete 

app.delete('/cartData/:id', async (req, res) => {
  const body = req.body;
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await CartData.deleteOne(query)
  res.send(result)
})

app.delete('/products/:id', async (req, res) => {
  const body = req.body;
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await products.deleteOne(query)
  res.send(result)
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


// main end






app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Start server ${port}`)
})
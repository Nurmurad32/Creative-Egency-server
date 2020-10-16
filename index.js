const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const fs = require('fs-extra');
const cors = require('cors');
const fileUpload = require('express-fileupload')
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const admin = require('firebase-admin');



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.99fbs.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;



const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('service'));
app.use(fileUpload());




var serviceAccount = require("./creative-agency-4e8cf-firebase-adminsdk-y5ntl-4f461724f4.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://creative-agency-4e8cf.firebaseio.com"
});


const port = 5000



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const servicesCollection = client.db("creativeEgency").collection("services");
    const adminCollection = client.db("creativeEgency").collection("userAdmin");
    const orderedCollection = client.db("creativeEgency").collection("ordered");
    const reviewCollection = client.db("creativeEgency").collection("review");

    // add services
    app.post('/addAService', (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const description = req.body.description;
        const newImg = req.files.file.data;
        const encImg = newImg.toString('base64');
        var image = {
            contentType: req.files.file.mimetype,
            size: req.files.file.size,
            img: Buffer.from(encImg, 'base64')
        }

        servicesCollection.insertOne({ name, description, image })
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    //add customer review 
    app.post('/addReview', (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const description = req.body.description;
        const designation = req.body.designation;
        console.log(file, name, description, designation)
        const newImg = req.files.file.data;
        const encImg = newImg.toString('base64');

        var image = {
            contentType: req.files.file.mimetype,
            size: req.files.file.size,
            img: Buffer.from(encImg, 'base64')
        }
        reviewCollection.insertOne({ name, description, designation, image })
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.get('/feedback', (req, res) => {
        reviewCollection.find({}).limit(6)
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/service', (req, res) => {
        servicesCollection.find({}).limit(6)
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/service/:id', (req, res) => {
        servicesCollection.find({ _id: ObjectId(req.params.id) })
            .toArray((err, documents) => {
                res.send(documents[0]);
            })
    })

    app.post('/registerOrder', (req, res) => {
        const order = req.body;
        orderedCollection.insertOne(order)
            .then(result => {
                console.log('Successfully order registered .');
                res.send(result.insertedCount);
            })
    })

    app.post('/addAdmin', (req, res) => {
        const order = req.body;
        adminCollection.insertOne(order)
            .then(result => {
                console.log('Successfully order registered .');
                res.send(result.insertedCount);
            })
    })


    app.get('/orderList', (req, res) => {
        orderedCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })




    app.get('/customerOrder', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];

            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;

                    if (tokenEmail == queryEmail) {

                        orderedCollection.find({ email: req.query.email })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    // ...
                }).catch(function (error) {
                    res.status(401).send('un-authorised access')
                });
        }
        else {
            res.status(401).send('un-authorised access')
        }
    })

    app.post('/isAdmin', (req, res) => {
        const email = req.body.email;
        adminCollection.find({ email: email })
            .toArray((err, admins) => {
                res.send(admins.length > 0);
            })
    })



    // app.patch('/statusUpdate/:id', (req, res) =>{
    //     orderedCollection.updateOne({_id: ObjectId(req.params.id)},
    //     {
    //         $set:{status: req.body.status}
    //     })
    //     .then(result => {
    //         console.log(result)
    //     })

    // })



})





app.get('/', (req, res) => {
    res.send('MongoDB server running...')
})


app.listen(process.env.PORT || port)
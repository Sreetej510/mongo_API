const express = require('express');
const { MongoClient } = require("mongodb");
const http = require('http');
const https = require("https");
const app = express();
const fs = require('fs');
const authenticator = require('authenicator.js')
const privateKey = fs.readFileSync('/etc/letsencrypt/live/ohio.omegarts.de/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/ohio.omegarts.de/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/ohio.omegarts.de/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

app.use(express.json({limit:'50mb'}));

const uri = "mongodb://localhost:27017?retryWrites=true&writeConcern=majority";

const client = new MongoClient(uri);

client.connect();

//find document
async function findData(collection, filter, onlyOne) {
    var data;
    if (onlyOne) {
        data = await collection.findOne(filter);
    } else {
        const cursor = collection.find(filter);
        data = {}
        await cursor.forEach(element => {
            var _id = element["_id"]
            delete element["_id"]
            data[_id] = element
        });;
    }
    delete data["_id"]
    return data
}

//insert
async function insertData(collection, doc, onlyOne) {
    var status;
    if (onlyOne) {
        status = await collection.insertOne(doc);
    } else {
        status = await collection.insertMany(doc);
}
    return status
}

//update
async function updateData(collection, filter, operator, doc, onlyOne) {
    var status;
    const updateDoc = {
        [operator]: doc,
    };

    if (onlyOne) {
        status = await collection.updateOne(filter, updateDoc, { upsert: true });
    } else {
        status = await collection.updateMany(filter, updateDoc, { upsert: true });
    }
    return status
}

//replace
async function replaceData(collection, filter, doc) {
    var status = await collection.replaceOne(filter, doc, { upsert: true });
    return status
}


//delete
async function deleteData(collection, filter, onlyOne) {
    var status;

    if (onlyOne) {
        status = await collection.deleteOne(filter);
    } else {
        status = await collection.deleteMany(filter);
    }
    return status
}

//remove a keys inside a document
async function removeKey(collection, filter, keys) {
    var data = await collection.findOne(filter);
    keys.forEach(key => delete data[key]);
    var status = await collection.replaceOne(filter, data, { upsert: true });

    return status
}

app.post("/", (req, res) => {

    const obj = req.body;
    const db = client.db(obj.dbname);
    const col = db.collection(obj.collection);
    const query = obj.queryType;
    const onlyFirst = obj.onlyFirst;

    // console.log(obj)

    switch (query) {
        case "find":
            var filter = obj.filter;
            findData(col, filter, onlyFirst).then(data => {
                res.send(data);
            }).catch(e => {
                res.status(400).send(e);
            });
            break;
        case "insert":
            var doc = obj.document;
            insertData(col, doc, onlyFirst).then(data => {
                res.send(data);
            }).catch(e => {
                var errMsg = e;
		if (e.code == 11000) {
                    errMsg = "E11000 duplicate key error collection"
                }
                res.status(400).send(errMsg);
            });
            break;
        case "update":
            var doc = obj.document;
            var filter = obj.filter;
            var operator = obj.operator;
            updateData(col, filter, operator, doc, onlyFirst).then(data => {
                res.send(data);
            }).catch(e => {
                res.status(400).send(e);
            });
            break;
        case "replace":
            var doc = obj.document;
            var filter = obj.filter;
            replaceData(col, filter, doc).then(data => {
                res.send(data);
            }).catch(e => {
                res.status(400).send(e);
            });
            break;
        case "delete":
            var filter = obj.filter;
            deleteData(col, filter, onlyFirst).then(data => {
                res.send(data);
            }).catch(e => {
                res.status(400).send(e);
            });
            break;
        case "removeKeys":
            var filter = obj.filter;
            var keys = obj.document.keys;
            removeKey(col, filter, keys).then(data => {
                res.send(data);
            }).catch(e => {
                res.status(400).send(e);
            });
            break;
        default:
        // code block
    }
});

// app.all('*')

https
  .createServer(credentials,app)
  .listen(443, "0.0.0.0", ()=>{
    console.log('Listening to port 443')
  });
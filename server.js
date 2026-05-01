const express = require('express');
const mongoose = require('mongoose');
const State = require('./models/States');
require('dotenv').config();

const app = express();
const port = 8000;

function loadValidStateCodes() {
    const statesData = require('./models/statesData.json');
    const codes = statesData.map(state => state.code);
    // Get unique codes
    return [...new Set(codes)];
}

const validStateCodes = loadValidStateCodes();

const verifyState = (req, res, next) => {
    const stateCode = req.params.state.toUpperCase();
    if (!validStateCodes.includes(stateCode)) {
        return res.status(404).json({ error: 'Invalid state code' });
    }
    req.code = stateCode;
    next();
};

async function connectDB() {
    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}
connectDB();

app.get('/states/:state', verifyState, (req, res) => {
    res.json({ stateCode: req.code });
});

app.get('/', async (req, resp) => {
    resp.sendFile('index.html', { root: __dirname });
});

app.use((req, resp) => {
    resp.status(404);
    if (req.accepts('html')) {
        resp.sendFile('404.html', { root: __dirname });
    } else {
        resp.json({ error: '404 Not Found' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// In your connectDB function, refer to the environment variable like this:
// await mongoose.connect(process.env.DATABASE_URI);
//
// In the requirements document, I highlight the differences in URL and Query
// parameters (see Notes #5 under GET requests in that doc). 
//
// There are 3 types of parameters that you can look for: 
//
// 1) body - sent in the body of a request (GET requests do not do this - this
//    is usually how POST, PUT, PATCH, and DELETE send params) 
//
// 2) URL - defined in the request URL like this - url.com/:param - (Any type
//    of request can use these. It is a dynamic URL) 
//
// 3) query - added at the end of the URL like this - url.com?param=Socks
//    (Usually GET requests) 
//
// Express retrieves each of these types differently from the request object
// (shown as req below): 
//
// 1) Any parameter sent in the body of a request: req.body.param_name
//
// 2) url.com/:state - req.params.state 
//
// 3) url.com/?whatever - req.query.whatever 
//
// You can also retrieve these with object destructing:
// const { param_name } = req.query (or req.params or req.body) if you wish.
//
// Express Request docs: https://expressjs.com/en/5x/api.html#req 
//
// If you are going to need the same function to verify data for more than one
// route, you should create that function as middleware. This will allow you to
// create it only once and place it in any route that needs it.
//
// There was an assigned video tutorial on middleware. The middleware I suggest
// you need for your final project is verifyStates. You need to verify the URL
// parameter :state matches one of the 50 possible state abbreviations. 
//
// Start by breaking down any problem like this into smaller steps:
//
// 1) You will need to pull in the state codes from the statesData.json file.
//
// 2) Instead of all of the states data, just make a states code array - I
// recommend using the array map() method to do this.
//
// 3) Search your newly created states code array to see if the state parameter
// received is in there.
//
// 4) If it isn't, return the appropriate response
//
// 5) If it is, attach the verified code to the request object:
//    req.code = stateCode and call next() to move on.
//
// You should see examples of the request object as referenced above and
// calling next() in middleware from the assigned middleware tutorial video.
//
// P.S. - Notice all of the state codes in the statesData.json file are
// capitalized. You want to be able to receive lowercase and mixed-case
// parameters. I suggest using the .toUpperCase() string method when receiving
// the parameter value.

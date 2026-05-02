const express = require('express');
const mongoose = require('mongoose');
const State = require('./models/States');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 8000;

app.use(express.json());

const nonContiguousStates = [ "AK", "HI" ];

async function connectDB() {
    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}
connectDB();

function loadStatesDataSync() {
    const filePath = path.join(__dirname, 'models', 'statesData.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

async function loadStatesData() {
    const statesData = loadStatesDataSync();

    try {
        const dbStates = await State.find({});
        const funfactsMap = {};
        dbStates.forEach(dbState => {
            funfactsMap[dbState.stateCode] = dbState.funfacts;
        });

        statesData.forEach(state => {
            if (funfactsMap[state.code]) {
                state.funfacts = funfactsMap[state.code];
            } else {
                state.funfacts = [];
            }
        });
    } catch (err) {
        console.error('Failed to merge MongoDB funfacts:', err);
    }

    return statesData;
}

async function loadValidStateCodes() {
    const statesData = await loadStatesData();
    const codes = statesData.map(state => state.code);
    return [...new Set(codes)];
}

let validStateCodes = [];
loadValidStateCodes().then(codes => {
    validStateCodes = codes;
});

const verifyState = (req, res, next) => {
    const stateCode = req.params.state.toUpperCase();
    if (!validStateCodes.includes(stateCode)) {
        return res.status(404).json({ error: 'Invalid state code' });
    }
    req.code = stateCode;
    next();
};

async function getState(code) {
    const statesData = await loadStatesData();
    return statesData.find(state => state.code === code) || null;
}

app.get('/states', async (req, res) => {
    let allStates = await loadStatesData();
    const contig = req.query.contig;
    const orderPop = req.query.order_pop;
    const admittedBefore = req.query.admitted_before;
    const admittedAfter = req.query.admitted_after;
    const hasFunfacts = req.query.has_funfacts;

    // Filter by contig if specified
    if (contig === 'true') {
        allStates = allStates.filter(
            state => !nonContiguousStates.includes(state.code)
        );
    } else if (contig === 'false') {
        allStates = allStates.filter(
            state => nonContiguousStates.includes(state.code)
        );
    }

    // Filter by admission date if specified
    if (admittedBefore) {
        const beforeDate = new Date(admittedBefore);
        allStates = allStates.filter(
            state => new Date(state.admission_date) < beforeDate
        );
    }

    if (admittedAfter) {
        const afterDate = new Date(admittedAfter);
        allStates = allStates.filter(
            state => new Date(state.admission_date) > afterDate
        );
    }

    // Filter by has_funfacts if specified
    if (hasFunfacts === 'true') {
        allStates = allStates.filter(
            state => state.funfacts && state.funfacts.length > 0
        );
    } else if (hasFunfacts === 'false') {
        allStates = allStates.filter(
            state => !state.funfacts || state.funfacts.length === 0
        );
    }

    // Sort by population if specified
    if (orderPop === 'asc') {
        allStates.sort((a, b) => a.population - b.population);
    } else if (orderPop === 'desc') {
        allStates.sort((a, b) => b.population - a.population);
    }

    res.json(allStates);
});

app.get('/states/:state/capital', verifyState, async (req, res) => {
    const state = await getState(req.code);
    res.json({ state: state.state, capital: state.capital_city });
});

app.get('/states/:state/nickname', verifyState, async (req, res) => {
    const state = await getState(req.code);
    res.json({ state: state.state, nickname: state.nickname });
});

app.get('/states/:state/population', verifyState, async (req, res) => {
    const state = await getState(req.code);
    res.json({ state: state.state, population: state.population });
});

app.get('/states/:state/admission', verifyState, async (req, res) => {
    const state = await getState(req.code);
    res.json({ state: state.state, admitted: state.admission_date });
});

app.get('/states/:state/funfact', verifyState, async (req, res) => {
    const state = await getState(req.code);
    if (state && state.funfacts && state.funfacts.length > 0) {
        const randomFact = state.funfacts[
            Math.floor(Math.random() * state.funfacts.length)
        ];
        return res.json({ funfact: randomFact });
    }
    res.json({ message: `No funfacts for ${req.code}` });
});

app.get('/states/:state', verifyState, async (req, res) => {
    res.json(await getState(req.code));
});

app.post('/states/:state/funfact', verifyState, async (req, res) => {
    const { funfacts } = req.body;

    if (!funfacts || !Array.isArray(funfacts)) {
        return res.status(400).json(
            { error: 'State fun facts value must be an array' }
        );
    }

    try {
        let state = await State.findOne({ stateCode: req.code });

        if (state) {
            state.funfacts = [...state.funfacts, ...funfacts];
            await state.save();
        } else {
            state = await State.create({ stateCode: req.code, funfacts });
        }

        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/states/:state/funfact', verifyState, async (req, res) => {
    const { index, funfact } = req.body;

    if (!index) {
        return res.status(400).json(
            { error: 'State fun fact index value required' }
        );
    }

    if (!funfact || typeof funfact !== 'string') {
        return res.status(400).json(
            { error: 'State fun fact value required' }
        );
    }

    try {
        const state = await State.findOne({ stateCode: req.code });

        if (!state) {
            return res.status(404).json(
                { error: `No fun facts found for ${req.code}` }
            );
        }

        const arrayIndex = index - 1; // Convert from 1-based to 0-based

        if (arrayIndex < 0 || arrayIndex >= state.funfacts.length) {
            return res.status(400).json({ error: 'Invalid index value' });
        }

        state.funfacts[arrayIndex] = funfact;
        await state.save();

        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/states/:state/funfact', verifyState, async (req, res) => {
    const { index } = req.body;

    if (!index) {
        return res.status(400).json(
            { error: 'State fun fact index value required' }
        );
    }

    try {
        const state = await State.findOne({ stateCode: req.code });

        if (!state) {
            return res.status(404).json(
                { error: `No fun facts found for ${req.code}` }
            );
        }

        const arrayIndex = index - 1; // Convert from 1-based to 0-based

        if (arrayIndex < 0 || arrayIndex >= state.funfacts.length) {
            return res.status(400).json({ error: 'Invalid index value' });
        }

        state.funfacts.splice(arrayIndex, 1);
        await state.save();

        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

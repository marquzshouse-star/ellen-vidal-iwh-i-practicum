require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔑 Load Environment Variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE;
const PROPERTIES = (process.env.CUSTOM_OBJECT_PROPERTIES || 'name').split(',');

// 🔹 HubSpot API Client
const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// 🔹 Debug Helper
const logDebug = (title, data) => {
  console.log(`\n===== ${title} =====`);
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  console.log('========================\n');
};

// ✅ Home Route — Fetch All Records
app.get('/', async (req, res) => {
  try {
    const params = new URLSearchParams();
    PROPERTIES.forEach((prop) => params.append('properties', prop));
    params.append('limit', '100');

    const url = `/crm/v3/objects/${OBJECT_TYPE}?${params.toString()}`;
    logDebug('GET Request URL', url);

    const { data } = await hubspot.get(url);
    logDebug('GET Response Data', data);

    const records = data.results || [];
    res.render('homepage', {
      title: 'Custom Object List | HubSpot Practicum',
      properties: PROPERTIES,
      records,
    });
  } catch (err) {
    console.error('❌ Fetch Error:', err.response?.data || err.message);
    res.status(500).send(`Error fetching records: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

// ✅ Render Create Form
app.get('/create-cobj', (req, res) => {
  res.render('updates', {
    title: 'Create Custom Object | HubSpot Practicum',
    properties: PROPERTIES,
  });
});

// ✅ Handle Create Record (POST)
app.post('/create-cobj', async (req, res) => {
  try {
    const props = {};
    PROPERTIES.forEach((p) => (props[p] = req.body[p] || ''));

    logDebug('POST Request Payload', { properties: props });

    const { data } = await hubspot.post(`/crm/v3/objects/${OBJECT_TYPE}`, {
      properties: props,
    });

    logDebug('POST Response Data', data);

    console.log(`✅ Record created successfully! ID: ${data.id}`);
    res.redirect('/');
  } catch (err) {
    console.error('❌ Create Error:', err.response?.data || err.message);
    res.status(500).send(`Error creating record: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

// ✅ Render Update Form
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object | HubSpot Practicum',
    properties: PROPERTIES,
  });
});

// ✅ Handle Update Record (PATCH) — NO RECORD ID NEEDED
app.post('/update-cobj', async (req, res) => {
  try {
    const props = {};
    PROPERTIES.forEach((p) => (props[p] = req.body[p] || ''));

    // ✅ Use the "name" field to find the record ID
    const objectName = req.body.name;
    if (!objectName) {
      return res.status(400).send('Missing "name" to locate record for update.');
    }

    // 🔍 Step 1: Find the record by name
    const searchUrl = `/crm/v3/objects/${OBJECT_TYPE}?properties=name&limit=100`;
    const { data: searchData } = await hubspot.get(searchUrl);
    const matchedRecord = searchData.results.find(r => r.properties.name === objectName);

    if (!matchedRecord) {
      return res.status(404).send(`Record with name "${objectName}" not found.`);
    }

    const recordId = matchedRecord.id;

    logDebug('PATCH Request Payload', { id: recordId, properties: props });

    // 🔄 Step 2: Update the record using the ID found
    const { data } = await hubspot.patch(`/crm/v3/objects/${OBJECT_TYPE}/${recordId}`, {
      properties: props,
    });

    logDebug('PATCH Response Data', data);

    console.log(`✅ Record "${objectName}" updated successfully!`);
    res.redirect('/');
  } catch (err) {
    console.error('❌ Update Error:', err.response?.data || err.message);
    res.status(500).send(`Error updating record: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

// ✅ Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 App running on http://localhost:${port}`));

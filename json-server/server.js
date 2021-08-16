const jsonServer = require('json-server')
const { newFileDB } = require('trdb')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()
const db = newFileDB('./db.json');
const telemetry = db.collection('telemetry');
server.use(middlewares)

server.get('/check', (req, res) => {
  res.jsonp(true)
})
server.get('/get_analytics', async (req, res) => {
  const analytics = []
  const telemetries = await telemetry.find({ eventId: ['PresentationInfo'] })
  for (const t of telemetries) {
    obj = {}
    obj['SessionId'] = t.sessionId;
    obj['AvailableStreams'] = t.data.videoStreamList;
    obj['BufferRequests'] = await telemetry.find({ eventId: ['DownloadBufferDataRequested'], sessionId: [t.sessionId] });
    obj['BitrateChanges'] = await telemetry.find({ eventId: ['DownloadBitrateChanged'], sessionId: [t.sessionId] });
    obj['SelectedFrame'] = obj['BufferRequests'][0].data.videoHeight + ' x ' + obj['BufferRequests'][0].data.videoWidth;
    analytics.push(obj);
  }
  res.status(200).jsonp(analytics);
})

server.use(jsonServer.bodyParser)
server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = Date.now()
  }
  // Continue to JSON Server router
  next()
})
server.post('/api/telemetry', (req, res) => {
  telemetry.insert(req.body).then(o => {
    res.sendStatus(204)
  }).catch(err => {
    res.sendStatus(400)
  });
});

server.use('/api', router)
server.listen(3000, () => {
  console.log('JSON Server is running')
})

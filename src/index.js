import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { transformTemplateToJSON, fetchStationByName } from './service/data-service.js';

const app = express();

app.use(cors());

transformTemplateToJSON();

app.listen(process.env.PORT, () => {
   console.log(`Example app listening on port ${process.env.PORT}`);
});

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
   ws.on('message', (message) => {
      const stationName = message.toString();
      const stationData = fetchStationByName(stationName);

      if (stationData) {
         ws.send(JSON.stringify(stationData));
      }
   });

   ws.on('close', () => {
      console.log('Client disconnected');
   });
});

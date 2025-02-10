import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import {
   transformTemplateToJSON,
   fetchStationByName,
   buildArrivalTimesFromStation,
} from './service/data-service.js';

const app = express();
app.use(cors());

const interval = 60001;

transformTemplateToJSON();
setInterval(transformTemplateToJSON, interval);

app.listen(process.env.PORT, () => {
   console.log(`Example app listening on port ${process.env.PORT}`);
});

//TODO hide port
const wss = new WebSocketServer({ port: process.env.WS_PORT });

wss.on('connection', (ws) => {
   ws.on('message', (message) => {
      const stationName = message.toString();
      const stationData = fetchStationByName(stationName);
      buildArrivalTimesFromStation(stationName);

      if (stationData) {
         ws.send(JSON.stringify(stationData));
      }
   });

   ws.on('close', () => {
      console.log('Client disconnected');
   });
});

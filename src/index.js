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
const wss = new WebSocketServer({ port: process.env.WS_PORT });
const clients = new Map();

updateAndSendTimes();
setInterval(executeUpdateAndSend, interval);

app.listen(process.env.PORT, () => {
   console.log(`Example app listening on port ${process.env.PORT}`);
});

wss.on('connection', (ws) => {
   ws.on('message', (message) => {
      const stationName = message.toString();
      const stationData = fetchStationByName(stationName);

      clients.set(ws, stationName);

      if (stationData) {
         buildArrivalTimesFromStation(stationName);
         ws.send(JSON.stringify(stationData));
      }
   });

   ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected');
   });
});

async function updateAndSendTimes() {
   await transformTemplateToJSON();
}

async function executeUpdateAndSend() {
   await updateAndSendTimes();
   sendUpdatedTimes();
}

function sendUpdatedTimes() {
   clients.forEach((stationName, ws) => {
      const stationData = fetchStationByName(stationName);

      if (stationData) {
         buildArrivalTimesFromStation(stationName);
         ws.send(JSON.stringify(stationData));
      }
   });
}

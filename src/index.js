import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import {
   transformTemplateToJSON,
   fetchStationByName,
   buildArrivalTimesFromStation,
   findTrainCurrentLocation,
} from './service/data-service.js';

const app = express();
app.use(cors());

const interval = 60001;
const clients = new Map();

updateAndSendTimes();
setInterval(executeUpdateAndSend, interval);

const server = app.listen(process.env.PORT, () => {
   console.log(`Example app listening on port ${process.env.PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
   ws.on('message', (message) => {
      const stationName = message.toString('utf8').trim().replace(/"/g, '');
      const stationData = fetchStationByName(stationName);

      clients.set(ws, stationName);

      if (stationData) {
         buildArrivalTimesFromStation(stationName);
         findTrainCurrentLocation(stationName);

         try {
            ws.send(JSON.stringify(stationData));
         } catch (error) {
            console.error('Error sending data to client:', error);
         }
      }
   });

   ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected');
   });

   ws.on('error', () => {
      clients.delete(ws);
      console.log('Client disconnected due to an error');
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
         findTrainCurrentLocation(stationName);
         ws.send(JSON.stringify(stationData));
      }
   });
}

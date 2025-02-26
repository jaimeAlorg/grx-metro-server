import * as cheerio from 'cheerio';
import axios from 'axios';
import axiosRetry from 'axios-retry';

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

let stationsArray = [];

async function fetchTemplateFromEndpoint() {
   let config = {
      method: 'post',

      url: process.env.METRO_ENDPOINT,
      headers: {
         Referer: process.env.METRO_REFER,
         'Content-Type': 'application/x-yaml',
         Host: 'metropolitanogranada.es',
      },
      timeout: 10000,
      proxy: false,
   };

   try {
      const response = await axios.request(config);
      return response.data;
   } catch (error) {
      console.error('Can not fetch template from endpoint', error);
      throw error;
   }
}

async function transformTemplateToJSON() {
   const template = await fetchTemplateFromEndpoint();

   const $ = cheerio.load(template);
   const rows = $('table tbody tr');
   const result = {};

   rows.each((index, row) => {
      const columns = $(row).find('td');
      if (columns.length > 0) {
         const stopName = $(columns[0]).text().trim();
         const times = [];
         columns.slice(1).each((i, col) => {
            times.push($(col).text().trim());
         });
         result[stopName] = times;
      }
   });

   const newStationsArray = mapEndpointDataToJSON(result);
   stationsArray.length = 0;
   stationsArray.push(...newStationsArray);
   console.log(stationsArray);
}

function mapEndpointDataToJSON(data) {
   let id = 0;

   const mappedData = Object.keys(data).map((station) => {
      const times = data[station];
      return {
         id: id++,
         stationName: station,
         timeAlbolote1: times[0],
         timeAlbolote2: times[1],
         timeArmilla1: times[2],
         timeArmilla2: times[3],
      };
   });

   return mappedData;
}

function fetchStationByName(name) {
   name = name.replace(/"/g, '');

   let station = stationsArray.find((station) => station.stationName === name);

   return station;
}

function buildArrivalTimesFromStation(station) {
   const stationData = fetchStationByName(station);

   stationData.arrivalTimeAlbolote1 = getTrainArrivalTime(stationData.timeAlbolote1);
   stationData.arrivalTimeAlbolote2 = getTrainArrivalTime(stationData.timeAlbolote2);
   stationData.arrivalTimeArmilla1 = getTrainArrivalTime(stationData.timeArmilla1);
   stationData.arrivalTimeArmilla2 = getTrainArrivalTime(stationData.timeArmilla2);
}

function getTrainArrivalTime(minutesUntilArrival) {
   if (minutesUntilArrival === '-') {
      return '-:-';
   }

   const minutes = parseMinutes(minutesUntilArrival);

   if (isNaN(minutes)) {
      return '-:-';
   }

   const now = new Date();
   now.setMinutes(now.getMinutes() + minutes);

   const hours = now.getHours().toString().padStart(2, '0');
   const minutesFormatted = now.getMinutes().toString().padStart(2, '0');

   return `${hours}:${minutesFormatted}`;
}

function findTrainCurrentLocation(stationName) {
   const waitingIndex = stationsArray.findIndex((s) => s.stationName === stationName);
   let trainStation = stationsArray[waitingIndex];

   if (
      waitingIndex === -1 ||
      (trainStation.timeAlbolote1 === '-' && waitingIndex !== 0) ||
      (trainStation.timeArmilla1 === '-' && waitingIndex !== stationsArray.length - 1)
   ) {
      trainStation.currentStationToAlbolote = '-';
      trainStation.currentStationToArmilla = '-';
      return;
   }

   if (waitingIndex === 0) {
      //TODO: Tackle this case
      trainStation.currentStationToAlbolote = '---';
      trainStation.currentStationToArmilla =
         findTrainCurrentLocationToArmillaFromAlbolote(trainStation);
      return;
   }

   if (waitingIndex === stationsArray.length - 1) {
      //TODO: Tackle this case
      trainStation.currentStationToArmilla = '---';
      trainStation.currentStationToAlbolote =
         findTrainCurrentLocationToAlboloteFromArmilla(trainStation);
      return;
   }

   trainStation.currentStationToAlbolote = findTrainCurrentLocationToAlbolote(
      waitingIndex,
      trainStation
   );
   trainStation.currentStationToArmilla = findTrainCurrentLocationToArmilla(
      waitingIndex,
      trainStation
   );
}

function findTrainCurrentLocationToAlbolote(waitingIndex, trainStation) {
   let trainStationTime = parseInt(trainStation.timeAlbolote1.replace("'", ''), 10);

   for (let i = waitingIndex + 1; i < stationsArray.length; i++) {
      let timeValue = parseInt(stationsArray[i].timeAlbolote1.replace("'", ''), 10);

      if (timeValue < trainStationTime) {
         trainStation = stationsArray[i];
         trainStationTime = timeValue;
      } else {
         break;
      }
   }

   return trainStation.stationName;
}

function findTrainCurrentLocationToArmilla(waitingIndex, trainStation) {
   let trainStationTime = parseInt(trainStation.timeArmilla1.replace("'", ''), 10);

   for (let i = waitingIndex - 1; i >= 0; i--) {
      let timeValue = parseInt(stationsArray[i].timeArmilla1.replace("'", ''), 10);

      if (timeValue < trainStationTime) {
         trainStation = stationsArray[i];
         trainStationTime = timeValue;
      } else {
         break;
      }
   }
   return trainStation.stationName;
}

function findTrainCurrentLocationToArmillaFromAlbolote(trainStation) {
   let trainStationTime = parseInt(trainStation.timeArmilla1.replace("'", ''), 10);

   for (let i = 1; i < stationsArray.length; i++) {
      let timeValue = parseInt(stationsArray[i].timeAlbolote1.replace("'", ''), 10);
      if (timeValue < trainStationTime) {
         trainStation = stationsArray[i];
         trainStationTime = timeValue;
      } else {
         break;
      }
   }

   return trainStation.stationName;
}

function findTrainCurrentLocationToAlboloteFromArmilla(trainStation) {
   let trainStationTime = parseInt(trainStation.timeAlbolote1.replace("'", ''), 10);

   for (let i = stationsArray.length - 2; i > 0; i--) {
      let timeValue = parseInt(stationsArray[i].timeArmilla1.replace("'", ''), 10);
      if (timeValue < trainStationTime) {
         trainStation = stationsArray[i];
         trainStationTime = timeValue;
      } else {
         break;
      }
   }

   return trainStation.stationName;
}

function parseMinutes(minutes) {
   return parseInt(minutes.replace("'", ''), 10);
}

export {
   transformTemplateToJSON,
   fetchStationByName,
   buildArrivalTimesFromStation,
   findTrainCurrentLocation,
};

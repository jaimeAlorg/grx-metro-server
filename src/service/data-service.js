import * as cheerio from 'cheerio';
import axios from 'axios';

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

   stationsArray.splice(0, stationsArray.length, ...mapEndpointDataToJSON(result));
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

//TODO: Calculate times

export { transformTemplateToJSON, fetchStationByName };

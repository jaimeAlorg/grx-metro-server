import express from 'express';
import cors from 'cors';
import { transformTemplateToJSON } from './service/data-service.js';

const app = express();

app.use(cors());

transformTemplateToJSON();

app.listen(process.env.PORT, () => {
   console.log(`Example app listening on port ${process.env.PORT}`);
});

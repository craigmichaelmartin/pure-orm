import express, { Express, Request, Response } from 'express';
import { getPerson } from './data-access/person';

const app: Express = express();
const port = process.env.PORT;

app.get('/rest/person', (req: Request, res: Response) => {
  const person = getPerson(+req.params.id);
  res.json(person);
});

app.listen(port);

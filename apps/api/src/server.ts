import express from "express";

import { eventsRouter } from "./routes/events.route";


// Minimal ingestion server for analytics events.
const app = express();

app.use(express.json());

app.use("/events", eventsRouter);

const PORT = 4000;
app.listen(PORT, () => {
  // Intentionally minimal; avoids additional runtime concerns.
  // eslint-disable-next-line no-console
  console.log(`PulseKit API listening on port ${PORT}`);
});


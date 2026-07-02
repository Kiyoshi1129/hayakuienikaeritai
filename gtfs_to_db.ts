import { importGtfs } from 'gtfs';
import Database from 'better-sqlite3';

let db = new Database("./data/gtfs.db")

const config = {
  agencies: [
    {
      path: "./raw/NTBus-20260626.zip"
    },
  ],
  db:db
};
(async () => {
  await importGtfs(config);
})();
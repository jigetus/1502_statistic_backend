const db = require("./db");
const DBqueryasync = async (query, prepared = []) => {
  return new Promise((resolve, reject) => {
    db.query(query, prepared, (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

module.exports = DBqueryasync;

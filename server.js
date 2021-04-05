const express = require("express");
const db = require("./db");
require("log-timestamp")(function () {
  return "[" + new Date().toLocaleString() + "] %s";
});
var cors = require("cors");

const { cache_medium_marks } = require("./cache");

const ___DEBUG_NO_CACHE = false;

const DBqueryasync = require("./DBqueryasync");
//Служебные переменные
let mysql_error = false;
const port = 27015;
const http_server = express();
http_server.use(cors());
http_server.use(express.static("mainpage"));
// -----------Методы API--------
//------------------------------

// GET /getunitsubjects?unit=11-Л
const getunitsubjects = (req, res) => {
  if (!req.query.unit) {
    return res
      .status(400)
      .send("Отсутствует обязательный QUERY параметр: unit");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  const zapros =
    "SELECT `dnevnik_units`.`name` as 'unit',`dnevnik_groups`.`id` as 'group_id',`dnevnik_groups`.`name` as 'group_name',`dnevnik_subjects`.`id` as 'subject_id',`dnevnik_subjects`.`name` as 'subject_name' FROM `dnevnik_groups` RIGHT JOIN `dnevnik_units` ON `dnevnik_groups`.`unit_id`=`dnevnik_units`.id RIGHT JOIN `dnevnik_subjects` ON `dnevnik_groups`.`subject_id`=`dnevnik_subjects`.`id` WHERE `dnevnik_units`.`name`=?";
  db.query(zapros, [req.query.unit], (err, results, fields) => {
    if (err) return res.send(err.sqlMessage);
    if (results.length === 0)
      return res
        .status(400)
        .send("Информация по выбранному классу не найдена.");
    res.header("Content-type", "application/json");
    res.send(results);
  });
};
http_server.get("/getunitsubjects", getunitsubjects);

// GET mediumsubjects?unit=11-Л
const mediumsubjects = async (req, res) => {
  if (!req.query.unit) {
    return res
      .status(400)
      .send("Отсутствует обязательный QUERY параметр: unit");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  DBqueryasync("SELECT unit,title,avg_mark from avg_cache_gamma where unit=?", [
    req.query.unit,
  ])
    .then((answer) => {
      if (answer.length === 0) {
        DBqueryasync(
          "SELECT unit,title,avg_mark from avg_cache_alfa where unit=?",
          [req.query.unit]
        ).then((answer2) => {
          if (answer2.length === 0) {
            return res.send("Информация по выбранному классу не найдена.");
          }
          res.header("Content-type", "application/json");
          res.send(answer2);
        });
      } else {
        return res.send(answer);
      }
    })
    .catch((error) => res.send("error: " + error.message));
};
http_server.get("/mediumsubjects", mediumsubjects);

//GET TOP 10 AVG mark /top10avg?korpus=gamma
const top10avg = (req, res) => {
  if (!req.query.korpus) {
    return res
      .status(400)
      .send("Отсутствует обязательный GET параметр: korpus");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  switch (req.query.korpus) {
    case "gamma":
      DBqueryasync(
        "SELECT AVG(avg_mark) as 'AVG',unit FROM `avg_cache_gamma` GROUP BY unit ORDER BY `AVG` DESC LIMIT 10"
      )
        .then((answer) => {
          res.send(answer);
        })
        .catch((err) => console.log(err));
      break;
    case "alfa":
      DBqueryasync(
        "SELECT AVG(avg_mark) as 'AVG',unit FROM `avg_cache_alfa` GROUP BY unit ORDER BY `AVG` DESC LIMIT 10"
      )
        .then((answer) => {
          res.send(answer);
        })
        .catch((err) => console.log(err));
      break;
    default:
      res
        .status(400)
        .send("Для корпуса " + req.query.korpus + " нет результатов.");
      break;
  }
};
http_server.get("/top10avg", top10avg);

//GET BEST UNIT IN SUBJECT /bestunitsinsubjects?korpus=gamma
const bestunitsinsubjects = (req, res) => {
  if (!req.query.korpus) {
    return res
      .status(400)
      .send("Отсутствует обязательный GET параметр: korpus");
  }
  if (mysql_error) {
    return res.status(400).send(mysql_error);
  }
  switch (req.query.korpus) {
    case "gamma":
      DBqueryasync(
        "SELECT max_mark, t.title, unit FROM ((SELECT max(avg_mark) as max_mark, title FROM `avg_cache_gamma` GROUP BY title ORDER BY title desc)) t LEFT JOIN `avg_cache_gamma` ac ON (t.title=ac.title AND t.max_mark=ac.avg_mark)"
      )
        .then((answer) => {
          res.send(answer);
        })
        .catch((err) => console.log(err));
      break;
    case "alfa":
      DBqueryasync(
        "SELECT max_mark, t.title, unit FROM ((SELECT max(avg_mark) as max_mark, title FROM `avg_cache_alfa` GROUP BY title ORDER BY title desc)) t LEFT JOIN `avg_cache_alfa` ac ON (t.title=ac.title AND t.max_mark=ac.avg_mark)"
      )
        .then((answer) => {
          res.send(answer);
        })
        .catch((err) => console.log(err));
      break;
    default:
      res
        .status(400)
        .send("Для корпуса " + req.query.korpus + " нет результатов.");
      break;
  }
};
http_server.get("/bestunitsinsubjects", bestunitsinsubjects);

http_server.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

//Подключение к БД

//Обработка ошибки соединения с БД
const mysql_error_handler = (err) => {
  if (err) {
    mysql_error = "Ошибка: " + err.message;
    return console.error("Ошибка: " + err.message);
  } else {
    console.log("Подключение к серверу MySQL успешно установлено");
  }
};
db.connect(mysql_error_handler);

//Производим первоначальное кэширование и запускаем сервер
const classes_gamma = [
  "7-Л",
  "7-М",
  "7-Н",
  "8-Л",
  "8-М",
  "8-Н",
  "9-В",
  "9-Л",
  "9-М",
  "10-Л",
  "10-М",
  "10-Н",
  "10-Я",
  "11-Л",
  "11-М",
  "11-Н",
];
const classes_alfa = [
  "7-Г",
  "7-Д",
  "7-Е",
  "7-Ж",
  "8-Г",
  "8-Д",
  "8-Е",
  "8-Ж",
  "8-З",
  "8-И",
  "8-К",
  "8-Ф",
  "8-Ш",
  "9-Г",
  "9-Д",
  "9-Е",
  "9-Ж",
  "9-З",
  "9-И",
  "9-К",
  "10-В",
  "10-Г",
  "10-Д",
  "10-Е",
  "10-Ж",
  "10-З",
  "10-И",
  "10-К",
  "11-В",
  "11-Г",
  "11-Д",
  "11-Е",
  "11-Ж",
  "11-З",
  "11-И",
  "11-К",
];

if (___DEBUG_NO_CACHE) {
  http_server.listen(port, () => {
    console.log(`Сервис запущен на http://localhost:${port}`);
  });
} else {
  cache_medium_marks(classes_gamma, "gamma").then(() => {
    console.log("Средние оценки закешированы. Корпус Гамма.");
    //Запуск HTTP сервера
    cache_medium_marks(classes_alfa, "alfa").then(() => {
      console.log("Средние оценки закешированы. Корпус Альфа.");
      http_server.listen(port, () => {
        console.log(`Сервис запущен на http://localhost:${port}`);
      });
    });
  });
  //Кэширование раз в 2.5 часа
  setInterval(() => {
    cache_medium_marks(classes_gamma, "gamma").then(
      console.log("Средние оценки закешированы. Корпус Гамма.")
    );
    cache_medium_marks(classes_alfa, "alfa").then(
      console.log("Средние оценки закешированы. Корпус Альфа.")
    );
  }, 250000);
}

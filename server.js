const express = require("express");
const db = require("./db");
require("log-timestamp")(function () {
  return "[" + new Date().toLocaleString() + "] %s";
});

const { genUnitMediumMarks, cache_medium_marks } = require("./cache");

const ___DEBUG_NO_CACHE = true;

const DBqueryasync = require("./DBqueryasync");
//Служебные переменные
let mysql_error = false;
const port = 27015;
const http_server = express();
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
  genUnitMediumMarks(req.query.unit)
    .then((answer) => {
      res.send(answer);
    })
    .catch((error) => res.send(error.message));
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
    default:
      res
        .status(400)
        .send("Для корпуса " + req.query.korpus + " нет результатов.");
      break;
  }
};
http_server.get("/top10avg", top10avg);

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

if (___DEBUG_NO_CACHE) {
  http_server.listen(port, () => {
    console.log(`Сервис запущен на http://localhost:${port}`);
  });
} else {
  cache_medium_marks(classes_gamma).then(() => {
    console.log("Средние оценки закешированы.");
    //Запуск HTTP сервера
    http_server.listen(port, () => {
      console.log(`Сервис запущен на http://localhost:${port}`);
    });
  });
  //Кэширование раз в 2.5 часа
  setInterval(
    () =>
      cache_medium_marks(classes).then(
        console.log("Средние оценки закешированы.")
      ),
    9000000
  );
}
